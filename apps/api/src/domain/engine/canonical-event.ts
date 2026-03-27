import type {
  MatchStateView,
  PlayerActionIntent,
  TeamSide,
  VisualPayload
} from "../../shared/contracts/match-contracts.js";
import type { CanonicalEventSeed, EngineContext } from "./match-engine-types.js";

const opponentOf = (side: TeamSide): TeamSide => (side === "HOME" ? "AWAY" : "HOME");

const actionLabel: Record<PlayerActionIntent, string> = {
  PASS: "Passe em Progressão",
  DRIBBLE: "Tentativa de Drible",
  SHOT: "Finalização",
  PROTECT_BALL: "Proteção de Bola",
  PASS_BACK: "Toque para Trás",
  SWITCH_PLAY: "Inversão de Jogada"
};

const successNarrative: Record<PlayerActionIntent, string> = {
  PASS: "A bola circula com precisão e a equipe mantém o ritmo da jogada.",
  DRIBBLE: "O atacante vence o confronto direto e acelera no corredor.",
  SHOT: "A finalização sai firme e leva perigo real ao gol.",
  PROTECT_BALL: "O jogador protege bem e segura a pressão adversária.",
  PASS_BACK: "A equipe recua de forma inteligente para reiniciar a construção.",
  SWITCH_PLAY: "A inversão muda o corredor da jogada e abre espaço."
};

const failureNarrative: Record<PlayerActionIntent, string> = {
  PASS: "O passe fica curto e a marcação intercepta no setor.",
  DRIBBLE: "A marcação fecha o espaço e bloqueia a tentativa de drible.",
  SHOT: "O chute perde força/ângulo e o lance termina com defesa adversária.",
  PROTECT_BALL: "A pressão defensiva desarma e muda a posse.",
  PASS_BACK: "O recuo sai errado e gera transição perigosa do adversário.",
  SWITCH_PLAY: "A inversão sai telegrafada e o rival recupera a bola."
};

const actionScene: Record<PlayerActionIntent, { sceneKey: string; frameType: MatchStateView["currentEvent"]["visualPayload"]["frameType"] }> = {
  PASS: { sceneKey: "fallback-map-default", frameType: "TACTICAL_MAP" },
  DRIBBLE: { sceneKey: "duel-midfield-right", frameType: "DUEL_SCENE" },
  SHOT: { sceneKey: "shot-box-central", frameType: "SHOT_SCENE" },
  PROTECT_BALL: { sceneKey: "duel-midfield-right", frameType: "DUEL_SCENE" },
  PASS_BACK: { sceneKey: "fallback-map-default", frameType: "TACTICAL_MAP" },
  SWITCH_PLAY: { sceneKey: "fallback-map-default", frameType: "TACTICAL_MAP" }
};

const keyByActionResult = (
  action: PlayerActionIntent,
  success: boolean
): MatchStateView["currentEvent"]["key"] => {
  if (success) {
    if (action === "SHOT") return "shot";
    if (action === "DRIBBLE") return "dribble";
    return "pass-received";
  }

  if (action === "SHOT") return "goalkeeper-save";
  if (action === "DRIBBLE" || action === "PROTECT_BALL") return "defensive-duel";
  return "pass-intercepted";
};

const updateVisualPayload = (
  current: VisualPayload,
  data: {
    zone: MatchStateView["currentEvent"]["visualPayload"]["zone"];
    possessionTeamSide: TeamSide;
    frameType: MatchStateView["currentEvent"]["visualPayload"]["frameType"];
    sceneKey: string;
    success: boolean;
  }
): VisualPayload => ({
  ...current,
  frameType: data.frameType,
  sceneKey: data.sceneKey,
  zone: data.zone,
  attackingSide: data.possessionTeamSide,
  ball: {
    ...current.ball,
    possessionTeamSide: data.possessionTeamSide
  },
  metadata: {
    ...current.metadata,
    intensity: data.success ? "medium" : "high",
    tags: [...current.metadata.tags, data.success ? "success" : "failure"]
  }
});

export const buildCanonicalEventFromAction = (
  context: EngineContext,
  action: PlayerActionIntent,
  success: boolean,
  nextZone: MatchStateView["currentEvent"]["visualPayload"]["zone"]
): CanonicalEventSeed => {
  const nextPossession = success ? context.possessionTeamSide : opponentOf(context.possessionTeamSide);
  const scene = actionScene[action];

  return {
    key: keyByActionResult(action, success),
    label: actionLabel[action],
    narrativeText: success ? successNarrative[action] : failureNarrative[action],
    sceneKey: scene.sceneKey,
    frameType: scene.frameType,
    success,
    zone: nextZone,
    nextPossessionTeamSide: nextPossession
  };
};

export const buildAutoProgressEvent = (
  context: EngineContext,
  nextZone: MatchStateView["currentEvent"]["visualPayload"]["zone"]
): CanonicalEventSeed => ({
  key: "pass-received",
  label: "Progressão Automática",
  narrativeText: "A equipe acelera a troca de passes e avança sem intervenção manual.",
  sceneKey: "fallback-map-default",
  frameType: "TACTICAL_MAP",
  success: true,
  zone: nextZone,
  nextPossessionTeamSide: context.possessionTeamSide
});

export const buildActionRequiredEvent = (
  context: EngineContext
): CanonicalEventSeed => ({
  key: "fallback-map",
  label: "Decisão de Posse",
  narrativeText: "A jogada desacelera: escolha a próxima ação para manter a posse.",
  sceneKey: "fallback-map-default",
  frameType: "TACTICAL_MAP",
  success: true,
  zone: context.currentZone,
  nextPossessionTeamSide: context.possessionTeamSide
});

export const applyCanonicalEventToState = (
  state: MatchStateView,
  seed: CanonicalEventSeed,
  eventMinute: number
): MatchStateView["currentEvent"] => ({
  ...state.currentEvent,
  id: crypto.randomUUID(),
  key: seed.key,
  label: seed.label,
  minute: eventMinute,
  narrativeText: seed.narrativeText,
  success: seed.success,
  visualPayload: updateVisualPayload(state.currentEvent.visualPayload, {
    zone: seed.zone,
    possessionTeamSide: seed.nextPossessionTeamSide,
    frameType: seed.frameType,
    sceneKey: seed.sceneKey,
    success: seed.success
  })
});
