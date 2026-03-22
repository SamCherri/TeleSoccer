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
  'pass-received': 'Passe limpo, receptor pronto e a jogada segue com leitura clara.',
  'pass-intercepted': 'O defensor fecha a linha e transforma o passe em corte decisivo.',
  dribble: 'O foco vai para o 1x1 entre quem conduz e quem tenta travar o lance.',
  'defensive-duel': 'A cena destaca o choque direto entre pressão e contenção.',
  shot: 'O enquadramento aproxima atacante, bola e meta para vender a finalização.',
  'goalkeeper-save': 'A jogada fecha em goleiro, bola e gol para valorizar a defesa.',
  goal: 'A conclusão mostra a bola vencendo o goleiro e entrando na rede.',
  rebound: 'A sobra viva ganha enquadramento curto para evidenciar a segunda bola.',
  'corner-kick': 'A cobrança aparece com bandeirinha, trajetória aérea e área ocupada.',
  'penalty-kick': 'A cena concentra cobrador, goleiro e gol no duelo mais direto do turno.',
  fallback: 'A composição mantém o lance legível mesmo quando o contexto é mais genérico.'
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
        ? `Arte preparada: cena visual com ${frameCount} momentos do lance e hero frame focado na ação principal.`
        : 'Arte preparada: cena visual com foco direto no momento principal do lance.'
  };
};
