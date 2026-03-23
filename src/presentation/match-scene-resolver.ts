import { buildMatchVisualSequence } from '../domain/match/visual-sequence';
import { MatchSceneKey, MatchSummary } from '../domain/match/types';
import { MatchSceneAsset } from '../assets/scenes/match-scene-art';
import { getMatchSceneAsset } from './scene-registry';

export type MatchVisualMode = 'hero-scene' | 'field-scene';

export interface ResolvedMatchScene {
  asset: MatchSceneAsset;
  mode: MatchVisualMode;
  shortPhrase: string;
  fallbackLine: string;
}

const matchVisualModeBySceneKey: Record<MatchSceneKey, MatchVisualMode> = {
  'pass-received': 'field-scene',
  'pass-intercepted': 'field-scene',
  dribble: 'hero-scene',
  'defensive-duel': 'hero-scene',
  shot: 'hero-scene',
  'goalkeeper-save': 'hero-scene',
  goal: 'hero-scene',
  rebound: 'hero-scene',
  // Simplificação de MVP: por enquanto todo escanteio entra como cena de confronto.
  // Quando o evento distinguir organização/trajetória de disputa na área, ele poderá
  // alternar entre field-scene e hero-scene sem mexer no domínio da partida.
  'corner-kick': 'hero-scene',
  'penalty-kick': 'hero-scene',
  fallback: 'field-scene'
};

const phraseByKey: Record<MatchSceneAsset['key'], string> = {
  'pass-received': 'Recebe aberto e o campo se oferece para a sequência da jogada.',
  'pass-intercepted': 'O passe sai e a marcação corta a linha antes da progressão.',
  dribble: 'Parte para o drible e chama o duelo para o centro do lance.',
  'defensive-duel': 'O choque é direto e a contenção define o ritmo da disputa.',
  shot: 'Arma a finalização e leva o lance inteiro para a frente do gol.',
  'goalkeeper-save': 'O goleiro explode no lance e segura o momento mais tenso da jogada.',
  goal: 'A bola vence o goleiro e o lance termina com a rede balançando.',
  rebound: 'A sobra fica viva na área e pede reação imediata de quem chegar primeiro.',
  'corner-kick': 'A bola parada fecha na área para destacar a disputa pelo lance decisivo.',
  'penalty-kick': 'Cobrador e goleiro entram no enquadramento mais direto do turno.',
  fallback: 'A posse circula e o campo mostra com clareza por onde a jogada respira.'
};

export const resolveMatchScene = (match: MatchSummary): ResolvedMatchScene => {
  const sequence = match.visualSequence ?? buildMatchVisualSequence(match);
  const sceneKey = sequence?.sceneKey ?? 'fallback';
  const asset = getMatchSceneAsset(sceneKey);
  const frameCount = sequence?.frames.length ?? 0;

  return {
    asset,
    mode: matchVisualModeBySceneKey[sceneKey],
    shortPhrase: phraseByKey[asset.key],
    fallbackLine:
      frameCount > 1
        ? `Fallback técnico apenas: a cena oficial ${matchVisualModeBySceneKey[sceneKey]} já foi gerada com ${frameCount} momentos do lance.`
        : `Fallback técnico apenas: a cena oficial ${matchVisualModeBySceneKey[sceneKey]} já foi gerada para o momento principal do lance.`
  };
};
