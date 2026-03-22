import { buildMatchVisualSequence } from '../domain/match/visual-sequence';
import { MatchSummary } from '../domain/match/types';
import { MatchSceneAsset } from '../assets/scenes/match-scene-art';
import { getMatchSceneAsset } from './scene-registry';

export interface ResolvedMatchScene {
  asset: MatchSceneAsset;
  shortPhrase: string;
  fallbackLine: string;
}

const phraseByKey: Record<MatchSceneAsset['key'], string> = {
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

export const resolveMatchScene = (match: MatchSummary): ResolvedMatchScene => {
  const sequence = match.visualSequence ?? buildMatchVisualSequence(match);
  const asset = getMatchSceneAsset(sequence?.sceneKey ?? 'fallback');
  const frameCount = sequence?.frames.length ?? 0;

  return {
    asset,
    shortPhrase: phraseByKey[asset.key],
    fallbackLine:
      frameCount > 1
        ? `Arte preparada: sequência visual com ${frameCount} frames tático-narrativos para esta jogada.`
        : 'Arte preparada: snapshot tático único para esta jogada.'
  };
};
