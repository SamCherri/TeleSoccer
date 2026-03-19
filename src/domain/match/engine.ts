import { AttributeKey, PlayerPosition } from '../shared/enums';
import { CreateMatchTurnInput, MatchPlayerProfile, MatchResolutionInput } from './repository';
import {
  MatchActionKey,
  MatchActionChoice,
  MatchContextType,
  MatchEventType,
  MatchHalf,
  MatchPossessionSide,
  MatchStatus,
  MatchTurnState
} from './types';

const TURN_TIME_LIMIT_SECONDS = 30;
const MATCH_TOTAL_TURNS = 14;
const FIRST_HALF_TURNS = 7;
const TURN_MINUTES = [4, 11, 18, 24, 31, 38, 45, 49, 56, 63, 70, 77, 84, 90];

const labelMap: Record<MatchActionKey, string> = {
  [MatchActionKey.Pass]: 'Passar',
  [MatchActionKey.Dribble]: 'Driblar',
  [MatchActionKey.Shoot]: 'Finalizar',
  [MatchActionKey.Control]: 'Dominar',
  [MatchActionKey.Protect]: 'Proteger bola',
  [MatchActionKey.Tackle]: 'Dar bote',
  [MatchActionKey.Clear]: 'Afastar',
  [MatchActionKey.Save]: 'Defender',
  [MatchActionKey.Punch]: 'Espalmar',
  [MatchActionKey.Catch]: 'Segurar',
  [MatchActionKey.RushOut]: 'Sair do gol',
  [MatchActionKey.Rebound]: 'Rebater',
  [MatchActionKey.DistributeHand]: 'Reposição com a mão',
  [MatchActionKey.DistributeFoot]: 'Reposição com o pé',
  [MatchActionKey.AimLowLeft]: 'Baixo esquerdo',
  [MatchActionKey.AimLowRight]: 'Baixo direito',
  [MatchActionKey.AimHighLeft]: 'Alto esquerdo',
  [MatchActionKey.AimHighRight]: 'Alto direito'
};

const contextActionMap: Record<MatchContextType, MatchActionKey[]> = {
  [MatchContextType.ReceivedFree]: [MatchActionKey.Control, MatchActionKey.Pass, MatchActionKey.Dribble, MatchActionKey.Shoot],
  [MatchContextType.ReceivedPressed]: [MatchActionKey.Protect, MatchActionKey.Pass, MatchActionKey.Control, MatchActionKey.Dribble],
  [MatchContextType.BackToGoal]: [MatchActionKey.Protect, MatchActionKey.Pass, MatchActionKey.Control, MatchActionKey.Shoot],
  [MatchContextType.InBox]: [MatchActionKey.Control, MatchActionKey.Shoot, MatchActionKey.Dribble, MatchActionKey.Pass],
  [MatchContextType.DefensiveDuel]: [MatchActionKey.Tackle, MatchActionKey.Clear, MatchActionKey.Pass, MatchActionKey.Protect],
  [MatchContextType.GoalkeeperSave]: [MatchActionKey.Save, MatchActionKey.Punch, MatchActionKey.Catch, MatchActionKey.RushOut],
  [MatchContextType.PenaltyKick]: [MatchActionKey.AimLowLeft, MatchActionKey.AimLowRight, MatchActionKey.AimHighLeft, MatchActionKey.AimHighRight],
  [MatchContextType.FreeKick]: [MatchActionKey.AimLowLeft, MatchActionKey.AimLowRight, MatchActionKey.AimHighLeft, MatchActionKey.AimHighRight],
  [MatchContextType.CornerKick]: [MatchActionKey.AimLowLeft, MatchActionKey.AimLowRight, MatchActionKey.AimHighLeft, MatchActionKey.AimHighRight]
};

const contextTexts: Record<MatchContextType, string> = {
  [MatchContextType.ReceivedFree]: 'Você recebeu livre entre as linhas e tem opções curtas para seguir a jogada.',
  [MatchContextType.ReceivedPressed]: 'Você recebeu pressionado próximo à lateral e precisa decidir rápido.',
  [MatchContextType.BackToGoal]: 'Você recebeu de costas para o gol com um marcador nas costas.',
  [MatchContextType.InBox]: 'A bola sobrou dentro da área com espaço para concluir o lance.',
  [MatchContextType.DefensiveDuel]: 'O adversário carrega a bola no seu setor e o duelo é direto.',
  [MatchContextType.GoalkeeperSave]: 'A finalização vem forte e você precisa decidir como defender.',
  [MatchContextType.PenaltyKick]: 'Pênalti para o seu time. Escolha lado e altura da cobrança.',
  [MatchContextType.FreeKick]: 'Falta perigosa na entrada da área. Defina lado e altura.',
  [MatchContextType.CornerKick]: 'Escanteio a favor. Escolha o lado e a altura do cruzamento.'
};

const attackingContexts = [
  MatchContextType.ReceivedFree,
  MatchContextType.ReceivedPressed,
  MatchContextType.BackToGoal,
  MatchContextType.InBox,
  MatchContextType.FreeKick,
  MatchContextType.CornerKick,
  MatchContextType.PenaltyKick
];

const defensiveContexts = [MatchContextType.DefensiveDuel, MatchContextType.GoalkeeperSave];

const getChoice = (key: MatchActionKey): MatchActionChoice => ({ key, label: labelMap[key] });

const hashFrom = (input: string): number => {
  let acc = 0;
  for (let index = 0; index < input.length; index += 1) {
    acc = (acc * 31 + input.charCodeAt(index)) % 9973;
  }
  return acc;
};

export class MatchEngine {
  createInitialTurn(player: MatchPlayerProfile, now = new Date()): CreateMatchTurnInput {
    return this.createTurn(player, 1, undefined, now);
  }

  createTurn(player: MatchPlayerProfile, sequence: number, previousOutcome?: string, now = new Date()): CreateMatchTurnInput {
    const contextType = this.pickContext(player, sequence);
    return {
      sequence,
      minute: TURN_MINUTES[Math.min(sequence - 1, TURN_MINUTES.length - 1)],
      half: sequence <= FIRST_HALF_TURNS ? MatchHalf.First : MatchHalf.Second,
      possessionSide: sequence % 2 === 0 ? MatchPossessionSide.Away : MatchPossessionSide.Home,
      contextType,
      contextText: contextTexts[contextType],
      availableActions: contextActionMap[contextType],
      deadlineAt: new Date(now.getTime() + TURN_TIME_LIMIT_SECONDS * 1000),
      isGoalkeeperContext: contextType === MatchContextType.GoalkeeperSave,
      previousOutcome
    };
  }

  resolve(params: {
    matchId: string;
    player: MatchPlayerProfile;
    turn: { id: string; sequence: number; minute: number; half: MatchHalf; possessionSide: MatchPossessionSide; contextType: MatchContextType; deadlineAt: Date; homeScore: number; awayScore: number; energy: number; stoppageMinutes: number };
    action?: MatchActionKey;
    now?: Date;
  }): MatchResolutionInput {
    const now = params.now ?? new Date();
    const timedOut = !params.action || now.getTime() > params.turn.deadlineAt.getTime();
    const sequence = params.turn.sequence;
    const nextSequence = sequence + 1;
    const skill = this.getSkillScore(params.player, params.turn.contextType, params.action);
    const roll = hashFrom(`${params.matchId}:${sequence}:${params.action ?? 'TIMEOUT'}`) % 100;
    let homeScore = params.turn.homeScore;
    let awayScore = params.turn.awayScore;
    let energy = Math.max(12, params.turn.energy - (timedOut ? 8 : 5));
    let possessionSide = timedOut ? MatchPossessionSide.Away : params.turn.possessionSide;
    let stoppageMinutes = params.turn.stoppageMinutes;
    const events: MatchResolutionInput['events'] = [];
    let outcomeText = '';
    let yellowCardsDelta = 0;
    let redCardIssued = false;
    let suspensionMatchesToAdd = 0;
    let injury: MatchResolutionInput['injury'];

    if (timedOut) {
      outcomeText = 'Você não respondeu em 30 segundos. O lance foi perdido e o adversário retomou a posse.';
      events.push({ type: MatchEventType.Timeout, minute: params.turn.minute, description: outcomeText });
    } else {
      const success = skill + 8 >= roll;
      outcomeText = success
        ? `Você executou ${labelMap[params.action!].toLowerCase()} com sucesso.`
        : `A tentativa de ${labelMap[params.action!].toLowerCase()} não saiu como esperado.`;
      events.push({ type: MatchEventType.ActionResolved, minute: params.turn.minute, description: outcomeText, metadata: { action: params.action, roll, skill } });

      if (this.shouldTriggerFoul(params.turn.sequence, roll, params.turn.contextType)) {
        const isPenalty = params.turn.contextType === MatchContextType.InBox || params.turn.contextType === MatchContextType.PenaltyKick;
        const foulDescription = isPenalty ? 'Falta do adversário dentro da área. Pênalti marcado.' : 'Falta sofrida em zona perigosa.';
        events.push({ type: MatchEventType.Foul, minute: params.turn.minute, description: foulDescription });
        events.push({ type: isPenalty ? MatchEventType.PenaltyAwarded : MatchEventType.Foul, minute: params.turn.minute, description: foulDescription });
        stoppageMinutes += isPenalty ? 2 : 1;
        if (isPenalty) {
          homeScore += 1;
          outcomeText += ' A cobrança foi convertida.';
          events.push({ type: MatchEventType.Goal, minute: params.turn.minute, description: 'Gol de pênalti para o seu time.' });
        }
      } else if (success && this.shouldScore(params.turn.contextType, params.action!, roll, skill)) {
        if (params.turn.possessionSide === MatchPossessionSide.Home) {
          homeScore += 1;
        } else {
          awayScore += 1;
        }
        outcomeText += ' A jogada terminou em gol.';
        events.push({ type: MatchEventType.Goal, minute: params.turn.minute, description: `Gol para ${params.turn.possessionSide === MatchPossessionSide.Home ? 'o seu time' : 'o adversário'}.` });
        stoppageMinutes += 1;
      } else if (!success && this.shouldConcedeCorner(roll)) {
        outcomeText += ' A defesa desviou para escanteio.';
        events.push({ type: MatchEventType.CornerAwarded, minute: params.turn.minute, description: 'Escanteio concedido após desvio.' });
      } else if (!success && this.shouldConcedeGoalKick(roll)) {
        outcomeText += ' A jogada terminou em tiro de meta.';
        events.push({ type: MatchEventType.GoalKickAwarded, minute: params.turn.minute, description: 'Tiro de meta para reorganizar a defesa.' });
      }

      if (this.shouldGiveCard(params.turn.sequence, roll, params.turn.contextType)) {
        const red = roll % 11 === 0 || params.turn.contextType === MatchContextType.DefensiveDuel;
        if (red) {
          redCardIssued = true;
          suspensionMatchesToAdd = 1;
          outcomeText += ' O árbitro mostrou cartão vermelho.';
          events.push({ type: MatchEventType.RedCard, minute: params.turn.minute, description: 'Cartão vermelho recebido. Suspensão automática para a próxima partida.' });
          events.push({ type: MatchEventType.Suspension, minute: params.turn.minute, description: 'Suspensão de 1 partida registrada.' });
        } else {
          yellowCardsDelta = 1;
          outcomeText += ' Você recebeu cartão amarelo.';
          events.push({ type: MatchEventType.YellowCard, minute: params.turn.minute, description: 'Cartão amarelo por chegada atrasada.' });
          if ((hashFrom(`${params.matchId}:yellow:${sequence}`) % 3) === 0) {
            suspensionMatchesToAdd = 1;
            events.push({ type: MatchEventType.Suspension, minute: params.turn.minute, description: 'Acúmulo disciplinar gerou suspensão automática da próxima partida.' });
          }
        }
      }

      if (this.shouldInjure(sequence, roll, energy)) {
        injury = {
          severity: energy < 40 ? 3 : 2,
          matchesRemaining: energy < 40 ? 2 : 1,
          description: energy < 40 ? 'Lesão muscular moderada após desgaste acumulado.' : 'Lesão leve registrada após choque no lance.'
        };
        outcomeText += ` ${injury.description}`;
        events.push({ type: MatchEventType.Injury, minute: params.turn.minute, description: injury.description });
        stoppageMinutes += 2;
      }
    }

    if (!timedOut && params.turn.possessionSide === MatchPossessionSide.Away && this.shouldCpuScore(sequence, roll, params.player.position, energy)) {
      awayScore += 1;
      events.push({ type: MatchEventType.Goal, minute: params.turn.minute, description: 'O adversário aproveitou a sequência e marcou.' });
      outcomeText += ' Na sequência, o adversário também conseguiu finalizar com perigo.';
      stoppageMinutes += 1;
    }

    const finished = nextSequence > MATCH_TOTAL_TURNS || redCardIssued || Boolean(injury?.matchesRemaining && injury.matchesRemaining > 1 && sequence >= MATCH_TOTAL_TURNS - 1);
    const finalMinute = finished ? 90 + stoppageMinutes : TURN_MINUTES[Math.min(sequence - 1, TURN_MINUTES.length - 1)];

    if (finished) {
      events.push({
        type: MatchEventType.MatchFinished,
        minute: finalMinute,
        description: `Partida encerrada: ${homeScore} x ${awayScore}.`
      });
    }

    return {
      turnId: params.turn.id,
      action: params.action,
      turnState: timedOut ? MatchTurnState.TimedOut : MatchTurnState.Resolved,
      outcomeText,
      homeScore,
      awayScore,
      minute: finalMinute,
      half: finished ? MatchHalf.Second : nextSequence <= FIRST_HALF_TURNS ? MatchHalf.First : MatchHalf.Second,
      possessionSide,
      status: finished ? MatchStatus.Finished : MatchStatus.InProgress,
      energy,
      stoppageMinutes,
      yellowCardsDelta,
      redCardIssued,
      suspensionMatchesToAdd,
      injury,
      events,
      nextTurn: finished ? undefined : this.createTurn(params.player, nextSequence, outcomeText, now)
    };
  }

  getActionChoices(keys: MatchActionKey[]): MatchActionChoice[] {
    return keys.map(getChoice);
  }

  private pickContext(player: MatchPlayerProfile, sequence: number): MatchContextType {
    if (player.position === PlayerPosition.Goalkeeper) {
      return sequence % 3 === 0 ? MatchContextType.GoalkeeperSave : sequence % 5 === 0 ? MatchContextType.FreeKick : MatchContextType.ReceivedFree;
    }

    const options = sequence % 4 === 0 ? defensiveContexts : attackingContexts;
    return options[hashFrom(`${player.playerId}:${sequence}`) % options.length];
  }

  private getSkillScore(player: MatchPlayerProfile, context: MatchContextType, action?: MatchActionKey): number {
    const attributes = player.attributes;
    const get = (key: AttributeKey) => attributes[key] ?? 30;
    switch (context) {
      case MatchContextType.GoalkeeperSave:
        return Math.round((get(AttributeKey.Reflexes) + get(AttributeKey.Handling) + get(AttributeKey.Positioning)) / 3);
      case MatchContextType.DefensiveDuel:
        return Math.round((get(AttributeKey.Marking) + get(AttributeKey.Speed) + get(AttributeKey.Passing)) / 3);
      case MatchContextType.PenaltyKick:
      case MatchContextType.FreeKick:
        return Math.round((get(AttributeKey.Shooting) + get(AttributeKey.Positioning)) / 2);
      case MatchContextType.CornerKick:
        return Math.round((get(AttributeKey.Passing) + get(AttributeKey.Kicking)) / 2);
      default:
        if (action === MatchActionKey.Shoot) {
          return Math.round((get(AttributeKey.Shooting) + get(AttributeKey.Positioning) + get(AttributeKey.Speed)) / 3);
        }
        if (action === MatchActionKey.Dribble) {
          return Math.round((get(AttributeKey.Dribbling) + get(AttributeKey.Speed)) / 2);
        }
        return Math.round((get(AttributeKey.Passing) + get(AttributeKey.Dribbling) + get(AttributeKey.Speed)) / 3);
    }
  }

  private shouldScore(context: MatchContextType, action: MatchActionKey, roll: number, skill: number): boolean {
    if (context === MatchContextType.PenaltyKick) {
      return skill >= 34 || roll < 82;
    }
    if (context === MatchContextType.InBox && action === MatchActionKey.Shoot) {
      return roll < skill + 12;
    }
    return action === MatchActionKey.Shoot && roll < skill - 8;
  }

  private shouldTriggerFoul(sequence: number, roll: number, context: MatchContextType): boolean {
    return (sequence % 5 === 0 && roll % 3 === 0) || context === MatchContextType.DefensiveDuel;
  }

  private shouldConcedeCorner(roll: number): boolean {
    return roll % 4 === 0;
  }

  private shouldConcedeGoalKick(roll: number): boolean {
    return roll % 5 === 0;
  }

  private shouldGiveCard(sequence: number, roll: number, context: MatchContextType): boolean {
    return context === MatchContextType.DefensiveDuel || (sequence % 6 === 0 && roll % 2 === 0);
  }

  private shouldInjure(sequence: number, roll: number, energy: number): boolean {
    return energy < 55 && sequence >= 9 && roll % 9 === 0;
  }

  private shouldCpuScore(sequence: number, roll: number, position: string, energy: number): boolean {
    const goalkeeperBonus = position === PlayerPosition.Goalkeeper ? 12 : 0;
    return sequence % 4 === 0 && roll > 72 + goalkeeperBonus && energy < 78;
  }
}
