import { MatchContextType, MatchEventType, MatchSummary } from '../domain/match/types';
import { MatchSceneAsset, MatchSceneKey } from '../assets/scenes/match-scene-art';
import { getMatchSceneAsset } from './scene-registry';

export interface ResolvedMatchScene {
  asset: MatchSceneAsset;
  shortPhrase: string;
  fallbackLine: string;
}

const includesAny = (value: string | undefined, fragments: string[]): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return fragments.some((fragment) => normalized.includes(fragment));
};

const phraseByKey: Record<MatchSceneKey, string> = {
  'pass-received': 'Passe encaixado para dar sequência ao ataque.',
  'pass-intercepted': 'A linha de passe foi lida e cortada pelo adversário.',
  dribble: 'Condução curta para quebrar a marcação.',
  'defensive-duel': 'Duelo defensivo direto pedindo tempo de bote.',
  shot: 'Finalização armada mirando o gol.',
  'goalkeeper-save': 'O goleiro entra no foco do lance.',
  goal: 'Rede balançando e jogada concluída.',
  rebound: 'A segunda bola ficou viva na área.',
  'corner-kick': 'Bola parada aberta para cruzamento na área.',
  'penalty-kick': 'Cobrança direta contra o goleiro.',
  fallback: 'O turno segue com cena genérica do lance.'
};

const pickSceneKey = (match: MatchSummary): MatchSceneKey => {
  const lastEvent = match.recentEvents[0];
  const previousOutcome = match.activeTurn?.previousOutcome;
  const contextType = match.activeTurn?.contextType;

  if (lastEvent?.type === MatchEventType.Goal) {
    return 'goal';
  }

  if (contextType === MatchContextType.PenaltyKick || includesAny(previousOutcome, ['pênalti', 'penalti'])) {
    return 'penalty-kick';
  }

  if (contextType === MatchContextType.CornerKick || lastEvent?.type === MatchEventType.CornerAwarded || includesAny(previousOutcome, ['escanteio'])) {
    return 'corner-kick';
  }

  if (contextType === MatchContextType.GoalkeeperSave || includesAny(previousOutcome, ['defender', 'espalmar', 'segurar', 'goleiro'])) {
    return 'goalkeeper-save';
  }

  if (contextType === MatchContextType.DefensiveDuel || includesAny(previousOutcome, ['dar bote', 'afastar', 'duelo'])) {
    return 'defensive-duel';
  }

  if (includesAny(previousOutcome, ['rebote', 'sobrou dentro da área', 'segunda bola'])) {
    return 'rebound';
  }

  if (includesAny(previousOutcome, ['passar com sucesso', 'passe'])) {
    return includesAny(previousOutcome, ['não saiu como esperado', 'intercept']) ? 'pass-intercepted' : 'pass-received';
  }

  if (includesAny(previousOutcome, ['driblar'])) {
    return 'dribble';
  }

  if (includesAny(previousOutcome, ['finalizar', 'chute', 'shoot'])) {
    return 'shot';
  }

  if (contextType === MatchContextType.ReceivedFree) {
    return 'pass-received';
  }
  if (contextType === MatchContextType.ReceivedPressed || contextType === MatchContextType.BackToGoal) {
    return 'dribble';
  }
  if (contextType === MatchContextType.InBox || contextType === MatchContextType.FreeKick) {
    return 'shot';
  }

  return 'fallback';
};

export const resolveMatchScene = (match: MatchSummary): ResolvedMatchScene => {
  const key = pickSceneKey(match);
  const asset = getMatchSceneAsset(key);

  return {
    asset,
    shortPhrase: phraseByKey[asset.key],
    fallbackLine: `Arte preparada: ${asset.title}. Caso o envio de imagem não esteja disponível neste ponto do fluxo, o texto continua sendo exibido normalmente.`
  };
};
