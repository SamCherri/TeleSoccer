import { AttributeKey, PlayerPosition } from '../shared/enums';
import { CreateMatchTurnInput, MatchPlayerProfile, MatchResolutionInput } from './repository';
import { buildDefaultMatchLineups } from './lineup-factory';
import {
  MatchActionKey,
  MatchActionChoice,
  MatchContextType,
  MatchEventType,
  MatchFieldZone,
  MatchHalf,
  MatchLineupPlayer,
  MatchMoveDirection,
  MatchPossessionSide,
  MatchSceneKey,
  MatchStatus,
  MatchTurnState,
  MatchVisualActorRef,
  MatchVisualCoordinate,
  MatchVisualEvent,
  MatchVisualOutcome
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

const getChoice = (key: MatchActionKey): MatchActionChoice => ({ key, label: labelMap[key] });

const hashFrom = (input: string): number => {
  let acc = 0;
  for (let index = 0; index < input.length; index += 1) {
    acc = (acc * 31 + input.charCodeAt(index)) % 9973;
  }
  return acc;
};

interface TurnCreationOptions {
  previousOutcome?: string;
  now?: Date;
  forcedContextType?: MatchContextType;
  forcedPossessionSide?: MatchPossessionSide;
}

interface ForcedContinuation {
  contextType?: MatchContextType;
  possessionSide?: MatchPossessionSide;
}

const zoneFromCoordinate = (coordinate: MatchVisualCoordinate): MatchFieldZone => {
  if (coordinate.x >= 80 || coordinate.x <= 20) {
    return 'DEFENSIVE_THIRD';
  }
  if (coordinate.x > 42 && coordinate.x < 58) {
    return 'MIDDLE_THIRD';
  }
  if (coordinate.y <= 26) {
    return 'LEFT_WING';
  }
  if (coordinate.y >= 74) {
    return 'RIGHT_WING';
  }
  if (coordinate.x >= 72 || coordinate.x <= 28) {
    return 'ATTACKING_THIRD';
  }
  return 'CENTER_CHANNEL';
};

const movementDirectionFrom = (origin: MatchVisualCoordinate, destination: MatchVisualCoordinate): MatchMoveDirection => {
  if (Math.abs(destination.y - origin.y) >= Math.abs(destination.x - origin.x)) {
    return destination.y < origin.y ? 'LEFT' : destination.y > origin.y ? 'RIGHT' : 'CENTER';
  }

  return destination.x > origin.x ? 'FORWARD' : destination.x < origin.x ? 'BACKWARD' : 'CENTER';
};

const clampCoordinate = (coordinate: MatchVisualCoordinate): MatchVisualCoordinate => ({
  x: Math.max(4, Math.min(96, coordinate.x)),
  y: Math.max(8, Math.min(92, coordinate.y))
});

const toActorRef = (lineup: MatchLineupPlayer): MatchVisualActorRef => ({
  lineupId: lineup.id,
  playerName: lineup.displayName,
  side: lineup.side,
  role: lineup.role,
  shirtNumber: lineup.shirtNumber
});

export class MatchEngine {
  createInitialTurn(player: MatchPlayerProfile, lineupsOrNow?: MatchLineupPlayer[] | Date, now = new Date()): CreateMatchTurnInput {
    const lineups = Array.isArray(lineupsOrNow) ? lineupsOrNow : buildDefaultMatchLineups(player);
    const resolvedNow = Array.isArray(lineupsOrNow) ? now : lineupsOrNow instanceof Date ? lineupsOrNow : now;
    return this.createTurn(player, lineups, 1, { now: resolvedNow });
  }

  createTurn(player: MatchPlayerProfile, lineupsOrSequence: MatchLineupPlayer[] | number, sequenceOrOptions?: number | TurnCreationOptions, maybeOptions: TurnCreationOptions = {}): CreateMatchTurnInput {
    const lineups = Array.isArray(lineupsOrSequence) ? lineupsOrSequence : buildDefaultMatchLineups(player);
    const sequence = Array.isArray(lineupsOrSequence) ? (typeof sequenceOrOptions === 'number' ? sequenceOrOptions : 1) : lineupsOrSequence;
    const options = Array.isArray(lineupsOrSequence) ? maybeOptions : (typeof sequenceOrOptions === 'object' ? sequenceOrOptions : maybeOptions);
    const now = options.now ?? new Date();
    const contextType = options.forcedContextType ?? this.pickContext(player, sequence);
    const possessionSide = options.forcedPossessionSide ?? (sequence % 2 === 0 ? MatchPossessionSide.Away : MatchPossessionSide.Home);
    const minute = TURN_MINUTES[Math.min(sequence - 1, TURN_MINUTES.length - 1)];
    const visualEvent = this.createTurnStartVisualEvent(lineups, sequence, minute, possessionSide, contextType);

    return {
      sequence,
      minute,
      half: sequence <= FIRST_HALF_TURNS ? MatchHalf.First : MatchHalf.Second,
      possessionSide,
      contextType,
      contextText: contextTexts[contextType],
      availableActions: contextActionMap[contextType],
      deadlineAt: new Date(now.getTime() + TURN_TIME_LIMIT_SECONDS * 1000),
      isGoalkeeperContext: contextType === MatchContextType.GoalkeeperSave,
      previousOutcome: options.previousOutcome,
      visualEvent
    };
  }

  resolve(params: {
    matchId: string;
    player: MatchPlayerProfile;
    lineups: MatchLineupPlayer[];
    turn: {
      id: string;
      sequence: number;
      minute: number;
      half: MatchHalf;
      possessionSide: MatchPossessionSide;
      contextType: MatchContextType;
      deadlineAt: Date;
      homeScore: number;
      awayScore: number;
      energy: number;
      stoppageMinutes: number;
      currentYellowCards: number;
      visualEvent?: MatchVisualEvent;
    };
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
    let forcedContinuation: ForcedContinuation | undefined;

    const lineups = params.lineups ?? buildDefaultMatchLineups(params.player);
    const baseEvent = params.turn.visualEvent ?? this.createTurnStartVisualEvent(lineups, sequence, params.turn.minute, params.turn.possessionSide, params.turn.contextType);

    if (timedOut) {
      const timeoutEvent = this.createTimeoutVisualEvent(baseEvent);
      outcomeText = `Você não respondeu em 30 segundos. ${timeoutEvent.narration.end}`;
      possessionSide = timeoutEvent.possessionAfter;
      events.push({ type: MatchEventType.Timeout, minute: params.turn.minute, description: outcomeText, metadata: { visualEvent: timeoutEvent } });
      forcedContinuation = { possessionSide: MatchPossessionSide.Away };
    } else {
      const success = skill + 8 >= roll;
      const visualEvent = this.createActionVisualEvent({
        lineups,
        turnVisualEvent: baseEvent,
        contextType: params.turn.contextType,
        action: params.action!,
        success,
        roll,
        skill
      });
      outcomeText = visualEvent.narration.end;
      possessionSide = visualEvent.possessionAfter;
      events.push({
        type: MatchEventType.ActionResolved,
        minute: params.turn.minute,
        description: outcomeText,
        metadata: { action: params.action, roll, skill, visualEvent }
      });

      const foulTriggered = this.shouldTriggerFoul(params.turn.sequence, roll, params.turn.contextType);
      if (foulTriggered) {
        const isPenalty = params.turn.contextType === MatchContextType.InBox || params.turn.contextType === MatchContextType.PenaltyKick;
        const foulDescription = isPenalty ? 'Falta do adversário dentro da área. Pênalti marcado.' : 'Falta sofrida em zona perigosa.';
        events.push({ type: MatchEventType.Foul, minute: params.turn.minute, description: foulDescription, metadata: { visualEvent } });
        if (isPenalty) {
          events.push({ type: MatchEventType.PenaltyAwarded, minute: params.turn.minute, description: 'Pênalti confirmado após a falta na área.', metadata: { visualEvent } });
          outcomeText = `${outcomeText} O próximo lance será a cobrança de pênalti.`;
          forcedContinuation = { contextType: MatchContextType.PenaltyKick, possessionSide: MatchPossessionSide.Home };
          stoppageMinutes += 2;
        } else {
          outcomeText = `${outcomeText} O próximo lance será a cobrança da falta perigosa.`;
          forcedContinuation = { contextType: MatchContextType.FreeKick, possessionSide: MatchPossessionSide.Home };
          stoppageMinutes += 1;
        }
      } else if (visualEvent.outcome === 'GOAL') {
        if (visualEvent.possessionAfter === MatchPossessionSide.Home) {
          homeScore += 1;
        } else {
          awayScore += 1;
        }
        events.push({ type: MatchEventType.Goal, minute: params.turn.minute, description: `Gol de ${visualEvent.actor.playerName}.`, metadata: { visualEvent } });
        stoppageMinutes += 1;
      } else if (visualEvent.actionType === 'CORNER') {
        events.push({ type: MatchEventType.CornerAwarded, minute: params.turn.minute, description: 'Escanteio concedido após desvio.', metadata: { visualEvent } });
        forcedContinuation = { contextType: MatchContextType.CornerKick, possessionSide: MatchPossessionSide.Home };
      } else if (visualEvent.actionType === 'CLEAR') {
        events.push({ type: MatchEventType.GoalKickAwarded, minute: params.turn.minute, description: 'Tiro de meta para reorganizar a defesa.', metadata: { visualEvent } });
        forcedContinuation = { possessionSide: MatchPossessionSide.Away };
      }

      const cardResult = this.getCardOutcome(params.turn.sequence, roll, params.turn.contextType);
      if (cardResult === 'YELLOW') {
        yellowCardsDelta = 1;
        events.push({ type: MatchEventType.YellowCard, minute: params.turn.minute, description: 'Cartão amarelo por chegada atrasada.', metadata: { visualEvent } });
        if (params.turn.currentYellowCards + yellowCardsDelta >= 3) {
          suspensionMatchesToAdd = 1;
          events.push({ type: MatchEventType.Suspension, minute: params.turn.minute, description: 'Acúmulo de três amarelos gerou suspensão automática da próxima partida.' });
        }
      } else if (cardResult === 'RED') {
        redCardIssued = true;
        suspensionMatchesToAdd = 1;
        events.push({ type: MatchEventType.RedCard, minute: params.turn.minute, description: 'Cartão vermelho recebido. Suspensão automática para a próxima partida.' });
        events.push({ type: MatchEventType.Suspension, minute: params.turn.minute, description: 'Suspensão de 1 partida registrada.' });
      }

      if (this.shouldInjure(sequence, roll, energy)) {
        injury = {
          severity: energy < 40 ? 3 : 2,
          matchesRemaining: energy < 40 ? 2 : 1,
          description: energy < 40 ? 'Lesão muscular moderada após desgaste acumulado.' : 'Lesão leve registrada após choque no lance.'
        };
        events.push({ type: MatchEventType.Injury, minute: params.turn.minute, description: injury.description });
        stoppageMinutes += 2;
      }
    }

    if (!timedOut && params.turn.possessionSide === MatchPossessionSide.Away && this.shouldCpuScore(sequence, roll, params.player.position, energy)) {
      awayScore += 1;
      events.push({ type: MatchEventType.Goal, minute: params.turn.minute, description: 'O adversário aproveitou a sequência e marcou.' });
      outcomeText = `${outcomeText} Na sequência, o adversário também conseguiu finalizar com perigo.`;
      stoppageMinutes += 1;
    }

    const finished = nextSequence > MATCH_TOTAL_TURNS;
    const nextTurn = finished
      ? undefined
      : this.createTurn(params.player, lineups, nextSequence, {
          previousOutcome: outcomeText,
          now,
          forcedContextType: forcedContinuation?.contextType,
          forcedPossessionSide: forcedContinuation?.possessionSide
        });
    const currentMinute = nextTurn?.minute ?? 90 + stoppageMinutes;

    if (finished) {
      events.push({ type: MatchEventType.MatchFinished, minute: currentMinute, description: `Partida encerrada: ${homeScore} x ${awayScore}.` });
    }

    return {
      turnId: params.turn.id,
      action: params.action,
      turnState: timedOut ? MatchTurnState.TimedOut : MatchTurnState.Resolved,
      outcomeText,
      homeScore,
      awayScore,
      minute: currentMinute,
      half: nextTurn?.half ?? MatchHalf.Second,
      possessionSide: nextTurn?.possessionSide ?? possessionSide,
      status: finished ? MatchStatus.Finished : MatchStatus.InProgress,
      energy,
      stoppageMinutes,
      yellowCardsDelta,
      redCardIssued,
      suspensionMatchesToAdd,
      injury,
      events,
      nextTurn
    };
  }

  getActionChoices(keys: MatchActionKey[]): MatchActionChoice[] {
    return keys.map(getChoice);
  }

  private createTurnStartVisualEvent(lineups: MatchLineupPlayer[], sequence: number, minute: number, possessionSide: MatchPossessionSide, contextType: MatchContextType): MatchVisualEvent {
    const actor = this.pickActor(lineups, possessionSide, contextType, sequence);
    const marker = this.pickMarker(lineups, possessionSide, actor, sequence);
    const receiver = this.pickReceiver(lineups, possessionSide, actor, sequence);
    const goalkeeper = this.pickGoalkeeper(lineups, possessionSide === MatchPossessionSide.Home ? MatchPossessionSide.Away : MatchPossessionSide.Home);
    const origin = actor.tacticalPosition;
    const destination = this.buildDestinationForContext(contextType, possessionSide, origin);
    const sceneKey = this.sceneKeyForStartContext(contextType);
    const zone = contextType === MatchContextType.InBox || contextType === MatchContextType.PenaltyKick ? 'BOX' : zoneFromCoordinate(origin);

    return {
      sequence,
      actionType: contextType === MatchContextType.GoalkeeperSave ? 'SAVE' : contextType === MatchContextType.PenaltyKick ? 'PENALTY' : contextType === MatchContextType.FreeKick ? 'FREE_KICK' : contextType === MatchContextType.CornerKick ? 'CORNER' : contextType === MatchContextType.DefensiveDuel ? 'PRESSURE' : 'CONTROL',
      sceneKey,
      zone,
      actor: toActorRef(actor),
      receiver: receiver ? toActorRef(receiver) : undefined,
      marker: marker ? toActorRef(marker) : undefined,
      goalkeeper: goalkeeper ? toActorRef(goalkeeper) : undefined,
      possessionBefore: possessionSide,
      possessionAfter: possessionSide,
      origin,
      destination,
      ballTarget: destination,
      movementDirection: movementDirectionFrom(origin, destination),
      outcome: 'SUCCESS',
      headline: this.headlineForContext(contextType, actor.displayName),
      narration: this.narrationForStart(contextType, actor.displayName, marker?.displayName, receiver?.displayName)
    };
  }

  private createTimeoutVisualEvent(baseEvent: MatchVisualEvent): MatchVisualEvent {
    return {
      ...baseEvent,
      actionType: 'TIMEOUT',
      sceneKey: 'pass-intercepted',
      possessionAfter: baseEvent.possessionBefore === MatchPossessionSide.Home ? MatchPossessionSide.Away : MatchPossessionSide.Home,
      outcome: 'TIMEOUT',
      headline: `${baseEvent.actor.playerName} perde o tempo do lance`,
      primaryTarget: baseEvent.marker,
      ballTarget: baseEvent.marker ? baseEvent.destination : baseEvent.ballTarget,
      narration: {
        start: `${baseEvent.actor.playerName} recebe a bola, mas demora a agir.`,
        duel: baseEvent.marker ? `${baseEvent.marker.playerName} encurta o espaço e aumenta a pressão.` : undefined,
        action: `${baseEvent.actor.playerName} hesita e o lance fica exposto.`,
        end: `${baseEvent.marker?.playerName ?? 'O adversário'} toma a iniciativa e recupera a posse.`
      }
    };
  }

  private createActionVisualEvent(params: {
    lineups: MatchLineupPlayer[];
    turnVisualEvent: MatchVisualEvent;
    contextType: MatchContextType;
    action: MatchActionKey;
    success: boolean;
    roll: number;
    skill: number;
  }): MatchVisualEvent {
    const actor = this.requireLineup(params.lineups, params.turnVisualEvent.actor.lineupId);
    const receiver = params.turnVisualEvent.receiver ? this.requireLineup(params.lineups, params.turnVisualEvent.receiver.lineupId) : this.pickReceiver(params.lineups, actor.side, actor, params.turnVisualEvent.sequence + 2);
    const marker = params.turnVisualEvent.marker ? this.requireLineup(params.lineups, params.turnVisualEvent.marker.lineupId) : this.pickMarker(params.lineups, actor.side, actor, params.turnVisualEvent.sequence + 3);
    const goalkeeper = params.turnVisualEvent.goalkeeper ? this.requireLineup(params.lineups, params.turnVisualEvent.goalkeeper.lineupId) : this.pickGoalkeeper(params.lineups, actor.side === MatchPossessionSide.Home ? MatchPossessionSide.Away : MatchPossessionSide.Home);
    const origin = actor.tacticalPosition;
    const destination = this.buildActionDestination(params.action, actor.side, origin, params.success);
    const ballTarget = params.success ? destination : marker?.tacticalPosition ?? destination;
    const possessionAfter = params.success ? actor.side : marker?.side ?? actor.side;

    if (params.action === MatchActionKey.Pass) {
      return params.success
        ? this.createPassEvent(actor, receiver, marker, origin, destination)
        : this.createPassInterceptedEvent(actor, receiver, marker ?? receiver ?? actor, origin, marker?.tacticalPosition ?? receiver?.tacticalPosition ?? destination);
    }

    if (params.action === MatchActionKey.Dribble || params.action === MatchActionKey.Control || params.action === MatchActionKey.Protect) {
      return params.success
        ? this.createDribbleEvent(actor, marker, origin, destination)
        : this.createTackleEvent(marker ?? actor, actor, origin, ballTarget);
    }

    if (params.action === MatchActionKey.Tackle || params.action === MatchActionKey.Clear) {
      return this.createTackleEvent(actor, marker ?? receiver ?? actor, origin, destination);
    }

    if ([MatchActionKey.Shoot, MatchActionKey.AimLowLeft, MatchActionKey.AimLowRight, MatchActionKey.AimHighLeft, MatchActionKey.AimHighRight].includes(params.action)) {
      if (params.success && this.shouldScore(params.contextType, params.action, params.roll, params.skill)) {
        return this.createGoalEvent(actor, goalkeeper, origin, destination);
      }
      return params.success
        ? this.createSaveEvent(goalkeeper ?? actor, actor, origin, destination)
        : this.createCornerOrClearEvent(actor, marker, origin, destination, params.roll);
    }

    if ([MatchActionKey.Save, MatchActionKey.Catch, MatchActionKey.Punch, MatchActionKey.RushOut].includes(params.action)) {
      return this.createSaveEvent(actor, marker ?? receiver ?? actor, origin, destination);
    }

    return {
      ...params.turnVisualEvent,
      destination,
      ballTarget,
      possessionAfter,
      movementDirection: movementDirectionFrom(origin, destination)
    };
  }

  private createPassEvent(actor: MatchLineupPlayer, receiver: MatchLineupPlayer | undefined, marker: MatchLineupPlayer | undefined, origin: MatchVisualCoordinate, destination: MatchVisualCoordinate): MatchVisualEvent {
    return {
      sequence: 0,
      actionType: 'PASS',
      sceneKey: 'pass-received',
      zone: zoneFromCoordinate(origin),
      actor: toActorRef(actor),
      receiver: receiver ? toActorRef(receiver) : undefined,
      marker: marker ? toActorRef(marker) : undefined,
      possessionBefore: actor.side,
      possessionAfter: actor.side,
      origin,
      destination,
      ballTarget: receiver?.tacticalPosition ?? destination,
      movementDirection: movementDirectionFrom(origin, destination),
      outcome: 'SUCCESS',
      headline: `${actor.displayName} acha o passe`,
      narration: {
        start: `${actor.displayName} domina e levanta a cabeça no corredor central.`,
        duel: marker ? `${marker.displayName} tenta fechar a linha de passe.` : undefined,
        action: `${actor.displayName} solta a bola buscando ${receiver?.displayName ?? 'o companheiro mais próximo'}.`,
        end: `${receiver?.displayName ?? actor.displayName} recebe e mantém a posse do lance.`
      }
    };
  }

  private createPassInterceptedEvent(actor: MatchLineupPlayer, receiver: MatchLineupPlayer | undefined, marker: MatchLineupPlayer, origin: MatchVisualCoordinate, destination: MatchVisualCoordinate): MatchVisualEvent {
    return {
      sequence: 0,
      actionType: 'PASS',
      sceneKey: 'pass-intercepted',
      zone: zoneFromCoordinate(origin),
      actor: toActorRef(actor),
      receiver: receiver ? toActorRef(receiver) : undefined,
      marker: toActorRef(marker),
      primaryTarget: toActorRef(marker),
      possessionBefore: actor.side,
      possessionAfter: marker.side,
      origin,
      destination,
      ballTarget: destination,
      movementDirection: movementDirectionFrom(origin, destination),
      outcome: 'INTERCEPTED',
      headline: `${marker.displayName} intercepta o passe`,
      narration: {
        start: `${actor.displayName} prepara o passe tentando acelerar a troca de corredor.`,
        duel: `${marker.displayName} lê a jogada e fecha a rota antes da bola viajar inteira.`,
        action: `${actor.displayName} arrisca o passe mesmo pressionado.`,
        end: `${marker.displayName} intercepta e muda a posse do lance.`
      }
    };
  }

  private createDribbleEvent(actor: MatchLineupPlayer, marker: MatchLineupPlayer | undefined, origin: MatchVisualCoordinate, destination: MatchVisualCoordinate): MatchVisualEvent {
    return {
      sequence: 0,
      actionType: 'DRIBBLE',
      sceneKey: 'dribble',
      zone: zoneFromCoordinate(origin),
      actor: toActorRef(actor),
      marker: marker ? toActorRef(marker) : undefined,
      possessionBefore: actor.side,
      possessionAfter: actor.side,
      origin,
      destination,
      ballTarget: destination,
      movementDirection: movementDirectionFrom(origin, destination),
      outcome: 'SUCCESS',
      headline: `${actor.displayName} escapa no drible`,
      narration: {
        start: `${actor.displayName} prende a bola e encara a marcação.`,
        duel: marker ? `${marker.displayName} encosta para fechar a saída.` : undefined,
        action: `${actor.displayName} corta para ${movementDirectionFrom(origin, destination) === 'LEFT' ? 'a esquerda' : 'o lado oposto'} buscando espaço.`,
        end: `${actor.displayName} vence o 1x1 e segue com a posse.`
      }
    };
  }

  private createTackleEvent(actor: MatchLineupPlayer, target: MatchLineupPlayer, origin: MatchVisualCoordinate, destination: MatchVisualCoordinate): MatchVisualEvent {
    return {
      sequence: 0,
      actionType: 'TACKLE',
      sceneKey: 'defensive-duel',
      zone: zoneFromCoordinate(destination),
      actor: toActorRef(actor),
      primaryTarget: toActorRef(target),
      marker: toActorRef(actor),
      possessionBefore: target.side,
      possessionAfter: actor.side,
      origin: target.tacticalPosition,
      destination,
      ballTarget: destination,
      movementDirection: movementDirectionFrom(target.tacticalPosition, destination),
      outcome: 'TACKLED',
      headline: `${actor.displayName} desarma ${target.displayName}`,
      narration: {
        start: `${target.displayName} tenta proteger a bola sob pressão.`,
        duel: `${actor.displayName} encurta o espaço e trava o corpo a corpo.`,
        action: `${target.displayName} muda a passada para fugir do bote.`,
        end: `${actor.displayName} acerta o desarme e toma a posse.`
      }
    };
  }

  private createGoalEvent(actor: MatchLineupPlayer, goalkeeper: MatchLineupPlayer | undefined, origin: MatchVisualCoordinate, destination: MatchVisualCoordinate): MatchVisualEvent {
    return {
      sequence: 0,
      actionType: 'SHOT',
      sceneKey: 'goal',
      zone: 'BOX',
      actor: toActorRef(actor),
      goalkeeper: goalkeeper ? toActorRef(goalkeeper) : undefined,
      possessionBefore: actor.side,
      possessionAfter: actor.side,
      origin,
      destination,
      ballTarget: destination,
      movementDirection: movementDirectionFrom(origin, destination),
      outcome: 'GOAL',
      headline: `${actor.displayName} marca`,
      narration: {
        start: `${actor.displayName} arma o corpo para a finalização.`,
        duel: goalkeeper ? `${goalkeeper.displayName} tenta ajustar a posição no gol.` : undefined,
        action: `${actor.displayName} bate firme cruzado.`,
        end: `A bola vence ${goalkeeper?.displayName ?? 'o goleiro'} e entra no gol.`
      }
    };
  }

  private createSaveEvent(actor: MatchLineupPlayer, target: MatchLineupPlayer, origin: MatchVisualCoordinate, destination: MatchVisualCoordinate): MatchVisualEvent {
    return {
      sequence: 0,
      actionType: 'SAVE',
      sceneKey: 'goalkeeper-save',
      zone: 'BOX',
      actor: toActorRef(actor),
      primaryTarget: toActorRef(target),
      goalkeeper: toActorRef(actor),
      possessionBefore: target.side,
      possessionAfter: actor.side,
      origin,
      destination,
      ballTarget: actor.tacticalPosition,
      movementDirection: movementDirectionFrom(origin, destination),
      outcome: 'SAVED',
      headline: `${actor.displayName} faz a defesa`,
      narration: {
        start: `${target.displayName} bate buscando o canto.`,
        duel: `${actor.displayName} reage e ataca a trajetória da bola.`,
        action: `${actor.displayName} estica o braço no tempo certo.`,
        end: `${actor.displayName} evita o gol e segura a jogada.`
      }
    };
  }

  private createCornerOrClearEvent(actor: MatchLineupPlayer, marker: MatchLineupPlayer | undefined, origin: MatchVisualCoordinate, destination: MatchVisualCoordinate, roll: number): MatchVisualEvent {
    if (this.shouldConcedeCorner(roll)) {
      return {
        sequence: 0,
        actionType: 'CORNER',
        sceneKey: 'corner-kick',
        zone: 'ATTACKING_THIRD',
        actor: toActorRef(actor),
        marker: marker ? toActorRef(marker) : undefined,
        possessionBefore: actor.side,
        possessionAfter: actor.side,
        origin,
        destination,
        ballTarget: destination,
        movementDirection: movementDirectionFrom(origin, destination),
        outcome: 'OUT',
        headline: 'A defesa desvia para escanteio',
        narration: {
          start: `${actor.displayName} prepara o chute sob pressão.`,
          duel: marker ? `${marker.displayName} fecha o corpo para bloquear.` : undefined,
          action: `A bola sai pressionada e explode na marcação.`,
          end: `O desvio tira a bola pela linha de fundo e rende escanteio.`
        }
      };
    }

    return {
      sequence: 0,
      actionType: 'CLEAR',
      sceneKey: 'rebound',
      zone: zoneFromCoordinate(destination),
      actor: toActorRef(actor),
      marker: marker ? toActorRef(marker) : undefined,
      possessionBefore: actor.side,
      possessionAfter: marker?.side ?? MatchPossessionSide.Away,
      origin,
      destination,
      ballTarget: destination,
      movementDirection: movementDirectionFrom(origin, destination),
      outcome: 'CLEARED',
      headline: 'A defesa limpa o lance',
      narration: {
        start: `${actor.displayName} tenta acelerar a finalização.`,
        duel: marker ? `${marker.displayName} se joga no lance para impedir.` : undefined,
        action: `A bola perde força e sobra viva na pequena área.`,
        end: `A defesa afasta e reorganiza a posse.`
      }
    };
  }

  private pickContext(player: MatchPlayerProfile, sequence: number): MatchContextType {
    if (player.position === PlayerPosition.Goalkeeper) {
      return sequence % 3 === 0 ? MatchContextType.GoalkeeperSave : MatchContextType.ReceivedFree;
    }

    const generalAttackingContexts = [MatchContextType.ReceivedFree, MatchContextType.ReceivedPressed, MatchContextType.BackToGoal, MatchContextType.InBox];
    const defensiveContexts = [MatchContextType.DefensiveDuel, MatchContextType.GoalkeeperSave];
    const options = sequence % 4 === 0 ? defensiveContexts : generalAttackingContexts;
    return options[hashFrom(`${player.playerId}:${sequence}`) % options.length];
  }

  private pickActor(lineups: MatchLineupPlayer[], side: MatchPossessionSide, contextType: MatchContextType, sequence: number): MatchLineupPlayer {
    const candidates = lineups.filter((entry) => entry.side === side);
    const rolePreference =
      contextType === MatchContextType.GoalkeeperSave
        ? 'GOALKEEPER'
        : contextType === MatchContextType.InBox || contextType === MatchContextType.PenaltyKick
          ? 'FORWARD'
          : contextType === MatchContextType.DefensiveDuel
            ? 'DEFENDER'
            : 'MIDFIELDER';
    const sameRole = candidates.filter((entry) => entry.role === rolePreference);
    const pool = sameRole.length > 0 ? sameRole : candidates;
    const userControlled = pool.find((entry) => entry.isUserControlled);
    return userControlled ?? pool[hashFrom(`${side}:${contextType}:${sequence}`) % pool.length];
  }

  private pickReceiver(lineups: MatchLineupPlayer[], side: MatchPossessionSide, actor: MatchLineupPlayer, sequence: number): MatchLineupPlayer | undefined {
    const candidates = lineups.filter((entry) => entry.side === side && entry.id !== actor.id);
    if (candidates.length === 0) return undefined;
    return candidates[hashFrom(`${actor.id}:receiver:${sequence}`) % candidates.length];
  }

  private pickMarker(lineups: MatchLineupPlayer[], sideWithBall: MatchPossessionSide, actor: MatchLineupPlayer, sequence: number): MatchLineupPlayer | undefined {
    const opposingSide = sideWithBall === MatchPossessionSide.Home ? MatchPossessionSide.Away : MatchPossessionSide.Home;
    const candidates = lineups.filter((entry) => entry.side === opposingSide && entry.role !== 'GOALKEEPER');
    if (candidates.length === 0) return undefined;
    return candidates.sort((left, right) => {
      const leftDistance = Math.abs(left.tacticalPosition.x - actor.tacticalPosition.x) + Math.abs(left.tacticalPosition.y - actor.tacticalPosition.y);
      const rightDistance = Math.abs(right.tacticalPosition.x - actor.tacticalPosition.x) + Math.abs(right.tacticalPosition.y - actor.tacticalPosition.y);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return hashFrom(`${left.id}:${sequence}`) - hashFrom(`${right.id}:${sequence}`);
    })[0];
  }

  private pickGoalkeeper(lineups: MatchLineupPlayer[], side: MatchPossessionSide): MatchLineupPlayer | undefined {
    return lineups.find((entry) => entry.side === side && entry.role === 'GOALKEEPER');
  }

  private buildDestinationForContext(contextType: MatchContextType, side: MatchPossessionSide, origin: MatchVisualCoordinate): MatchVisualCoordinate {
    switch (contextType) {
      case MatchContextType.ReceivedPressed:
      case MatchContextType.BackToGoal:
        return clampCoordinate({ x: origin.x + (side === MatchPossessionSide.Home ? 8 : -8), y: origin.y - 10 });
      case MatchContextType.InBox:
      case MatchContextType.PenaltyKick:
        return clampCoordinate({ x: side === MatchPossessionSide.Home ? 88 : 12, y: 50 });
      case MatchContextType.CornerKick:
        return clampCoordinate({ x: side === MatchPossessionSide.Home ? 78 : 22, y: 40 });
      case MatchContextType.FreeKick:
        return clampCoordinate({ x: side === MatchPossessionSide.Home ? 82 : 18, y: 50 });
      default:
        return clampCoordinate({ x: origin.x + (side === MatchPossessionSide.Home ? 12 : -12), y: origin.y });
    }
  }

  private buildActionDestination(action: MatchActionKey, side: MatchPossessionSide, origin: MatchVisualCoordinate, success: boolean): MatchVisualCoordinate {
    const direction = side === MatchPossessionSide.Home ? 1 : -1;
    switch (action) {
      case MatchActionKey.Pass:
        return clampCoordinate({ x: origin.x + 16 * direction, y: origin.y + (success ? -8 : 0) });
      case MatchActionKey.Dribble:
        return clampCoordinate({ x: origin.x + 10 * direction, y: origin.y - 12 });
      case MatchActionKey.Control:
      case MatchActionKey.Protect:
        return clampCoordinate({ x: origin.x + 4 * direction, y: origin.y - 6 });
      case MatchActionKey.Shoot:
      case MatchActionKey.AimLowLeft:
      case MatchActionKey.AimLowRight:
      case MatchActionKey.AimHighLeft:
      case MatchActionKey.AimHighRight:
        return clampCoordinate({ x: side === MatchPossessionSide.Home ? 94 : 6, y: action === MatchActionKey.AimLowLeft || action === MatchActionKey.AimHighLeft ? 36 : action === MatchActionKey.AimLowRight || action === MatchActionKey.AimHighRight ? 64 : 50 });
      case MatchActionKey.Tackle:
      case MatchActionKey.Clear:
        return clampCoordinate({ x: origin.x - 8 * direction, y: origin.y + 4 });
      default:
        return clampCoordinate({ x: origin.x + 8 * direction, y: origin.y });
    }
  }

  private sceneKeyForStartContext(contextType: MatchContextType): MatchSceneKey {
    switch (contextType) {
      case MatchContextType.ReceivedFree:
        return 'pass-received';
      case MatchContextType.ReceivedPressed:
      case MatchContextType.BackToGoal:
        return 'dribble';
      case MatchContextType.DefensiveDuel:
        return 'defensive-duel';
      case MatchContextType.GoalkeeperSave:
        return 'goalkeeper-save';
      case MatchContextType.InBox:
      case MatchContextType.FreeKick:
        return 'shot';
      case MatchContextType.CornerKick:
        return 'corner-kick';
      case MatchContextType.PenaltyKick:
        return 'penalty-kick';
      default:
        return 'fallback';
    }
  }

  private headlineForContext(contextType: MatchContextType, actorName: string): string {
    switch (contextType) {
      case MatchContextType.ReceivedPressed:
        return `${actorName} recebe sob pressão`;
      case MatchContextType.BackToGoal:
        return `${actorName} recebe de costas`;
      case MatchContextType.DefensiveDuel:
        return `${actorName} entra no duelo defensivo`;
      case MatchContextType.GoalkeeperSave:
        return `${actorName} prepara a defesa`;
      case MatchContextType.PenaltyKick:
        return `${actorName} assume o pênalti`;
      default:
        return `${actorName} inicia a jogada`;
    }
  }

  private narrationForStart(contextType: MatchContextType, actorName: string, markerName?: string, receiverName?: string): MatchVisualEvent['narration'] {
    switch (contextType) {
      case MatchContextType.ReceivedFree:
        return {
          start: `${actorName} domina com espaço entre as linhas.`,
          action: `${actorName} observa ${receiverName ?? 'as opções próximas'} antes de acelerar o lance.`,
          end: `${actorName} mantém a posse e prepara a próxima decisão.`
        };
      case MatchContextType.ReceivedPressed:
        return {
          start: `${actorName} domina no setor lateral.`,
          duel: markerName ? `${markerName} aperta a marcação imediatamente.` : undefined,
          action: `${actorName} ajusta o corpo para sair da pressão.`,
          end: `${actorName} ainda tenta definir o melhor escape.`
        };
      case MatchContextType.BackToGoal:
        return {
          start: `${actorName} recebe de costas para o gol.`,
          duel: markerName ? `${markerName} cola nas costas e corta a virada.` : undefined,
          action: `${actorName} procura girar sem perder o controle.`,
          end: `${actorName} segura a posse por mais um instante.`
        };
      case MatchContextType.GoalkeeperSave:
        return {
          start: `${actorName} se posiciona para reagir ao chute.`,
          action: `${actorName} acompanha a preparação da finalização adversária.`,
          end: `${actorName} precisa decidir em frações de segundo.`
        };
      default:
        return {
          start: `${actorName} entra no lance.`,
          action: `${actorName} avalia a jogada em construção.`,
          end: `${actorName} conduz o momento do turno.`
        };
    }
  }

  private requireLineup(lineups: MatchLineupPlayer[], lineupId: string): MatchLineupPlayer {
    const lineup = lineups.find((entry) => entry.id === lineupId);
    if (!lineup) {
      throw new Error(`Lineup ${lineupId} não encontrado para o lance visual.`);
    }
    return lineup;
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
        if (action === MatchActionKey.Shoot) return Math.round((get(AttributeKey.Shooting) + get(AttributeKey.Positioning) + get(AttributeKey.Speed)) / 3);
        if (action === MatchActionKey.Dribble) return Math.round((get(AttributeKey.Dribbling) + get(AttributeKey.Speed)) / 2);
        return Math.round((get(AttributeKey.Passing) + get(AttributeKey.Dribbling) + get(AttributeKey.Speed)) / 3);
    }
  }

  private shouldScore(context: MatchContextType, action: MatchActionKey, roll: number, skill: number): boolean {
    if (context === MatchContextType.PenaltyKick) return skill >= 52 && roll <= 68;
    if (context === MatchContextType.InBox) return action === MatchActionKey.Shoot && skill >= 55 && roll <= 58;
    if (context === MatchContextType.FreeKick) return skill >= 63 && roll <= 34;
    return action === MatchActionKey.Shoot && skill >= 62 && roll <= 24;
  }

  private shouldConcedeCorner(roll: number): boolean { return roll % 9 === 0; }
  private shouldConcedeGoalKick(roll: number): boolean { return roll % 7 === 0; }
  private shouldTriggerFoul(sequence: number, roll: number, context: MatchContextType): boolean {
    if (context === MatchContextType.GoalkeeperSave) return false;
    if (context === MatchContextType.DefensiveDuel) return (sequence + roll) % 29 === 0;
    return (sequence + roll) % 17 === 0;
  }
  private getCardOutcome(sequence: number, roll: number, context: MatchContextType): 'NONE' | 'YELLOW' | 'RED' {
    if (context !== MatchContextType.DefensiveDuel) return 'NONE';
    if ((sequence * 11 + roll) % 31 === 0) return 'RED';
    if ((sequence * 7 + roll) % 13 === 0) return 'YELLOW';
    return 'NONE';
  }
  private shouldInjure(sequence: number, roll: number, energy: number): boolean { return energy < 38 ? (sequence + roll) % 11 === 0 : (sequence + roll) % 23 === 0; }
  private shouldCpuScore(sequence: number, roll: number, position: string, energy: number): boolean {
    if (position === PlayerPosition.Goalkeeper) return roll <= 12;
    if (energy < 32) return (sequence + roll) % 9 === 0;
    return (sequence + roll) % 19 === 0;
  }
}
