import { DominantFoot, PlayerPosition } from '../domain/shared/enums';
import { BotReply, phase1BotActions } from './phase1-bot';
import { PlayerCreationConversationStore, PlayerCreationSession } from './conversation-store';
import { CreatePlayerInput } from '../domain/player/types';

interface CreationReplyResult {
  kind: 'reply';
  reply: BotReply;
}

interface CreationSubmitResult {
  kind: 'submit';
  input: CreatePlayerInput;
}

export type PlayerCreationFlowResult = CreationReplyResult | CreationSubmitResult;

const positionActionMap = new Map<string, PlayerPosition>([
  [phase1BotActions.positionGoalkeeper, PlayerPosition.Goalkeeper],
  [phase1BotActions.positionDefender, PlayerPosition.Defender],
  [phase1BotActions.positionMidfielder, PlayerPosition.Midfielder],
  [phase1BotActions.positionForward, PlayerPosition.Forward]
]);

const dominantFootActionMap = new Map<string, DominantFoot>([
  [phase1BotActions.footRight, DominantFoot.Right],
  [phase1BotActions.footLeft, DominantFoot.Left]
]);

export class Phase1PlayerCreationFlow {
  constructor(private readonly store: PlayerCreationConversationStore) {}

  isActive(telegramId: string): boolean {
    return this.store.get(telegramId) !== null;
  }

  start(telegramId: string): BotReply {
    const session: PlayerCreationSession = {
      telegramId,
      step: 'name',
      draft: { visual: {} }
    };

    this.store.save(session);
    return this.buildPrompt(session);
  }

  cancel(telegramId: string): BotReply {
    this.store.clear(telegramId);
    return {
      text: 'Criação de jogador cancelada com segurança. Quando quiser, inicie novamente.',
      actions: [phase1BotActions.createPlayer, phase1BotActions.mainMenu]
    };
  }

  restart(telegramId: string): BotReply {
    this.store.clear(telegramId);
    return this.start(telegramId);
  }

  remindCurrentStep(telegramId: string): BotReply {
    const session = this.store.get(telegramId);
    if (!session) {
      return {
        text: 'Nenhuma criação de jogador está em andamento.',
        actions: [phase1BotActions.createPlayer]
      };
    }

    return {
      text: `A criação do jogador está em andamento. ${this.buildPrompt(session).text}`,
      actions: this.buildPrompt(session).actions
    };
  }

  handleInput(telegramId: string, rawInput: string): PlayerCreationFlowResult {
    const session = this.store.get(telegramId);
    if (!session) {
      return {
        kind: 'reply',
        reply: {
          text: 'Nenhuma criação de jogador está em andamento.',
          actions: [phase1BotActions.createPlayer]
        }
      };
    }

    const input = rawInput.trim();
    if (!input) {
      return { kind: 'reply', reply: this.withValidationMessage(session, 'Envie um valor antes de continuar.') };
    }

    switch (session.step) {
      case 'name':
        session.draft.name = input;
        session.step = 'nationality';
        break;
      case 'nationality':
        session.draft.nationality = input;
        session.step = 'position';
        break;
      case 'position': {
        const position = positionActionMap.get(input);
        if (!position) {
          return { kind: 'reply', reply: this.withValidationMessage(session, 'Escolha a posição usando um dos botões sugeridos.') };
        }
        session.draft.position = position;
        session.step = 'dominantFoot';
        break;
      }
      case 'dominantFoot': {
        const dominantFoot = dominantFootActionMap.get(input);
        if (!dominantFoot) {
          return { kind: 'reply', reply: this.withValidationMessage(session, 'Escolha o pé dominante usando um dos botões sugeridos.') };
        }
        session.draft.dominantFoot = dominantFoot;
        session.step = 'heightCm';
        break;
      }
      case 'heightCm': {
        const heightCm = Number.parseInt(input, 10);
        if (!Number.isInteger(heightCm)) {
          return { kind: 'reply', reply: this.withValidationMessage(session, 'Informe a altura em centímetros usando apenas números.') };
        }
        session.draft.heightCm = heightCm;
        session.step = 'weightKg';
        break;
      }
      case 'weightKg': {
        const weightKg = Number.parseInt(input, 10);
        if (!Number.isInteger(weightKg)) {
          return { kind: 'reply', reply: this.withValidationMessage(session, 'Informe o peso em quilos usando apenas números.') };
        }
        session.draft.weightKg = weightKg;
        session.step = 'skinTone';
        break;
      }
      case 'skinTone':
        session.draft.visual = {
          ...session.draft.visual,
          skinTone: input
        };
        session.step = 'hairStyle';
        break;
      case 'hairStyle':
        session.draft.visual = {
          ...session.draft.visual,
          hairStyle: input
        };
        session.step = 'confirmation';
        break;
      case 'confirmation':
        if (input === phase1BotActions.restartCreation) {
          return { kind: 'reply', reply: this.restart(telegramId) };
        }
        if (input !== phase1BotActions.confirmCreatePlayer) {
          return { kind: 'reply', reply: this.withValidationMessage(session, 'Use Confirmar criação ou Refazer criação para concluir.') };
        }

        this.store.clear(telegramId);
        return {
          kind: 'submit',
          input: this.buildCreateInput(telegramId, session)
        };
    }

    this.store.save(session);
    return { kind: 'reply', reply: this.buildPrompt(session) };
  }

  private buildCreateInput(telegramId: string, session: PlayerCreationSession): CreatePlayerInput {
    return {
      telegramId,
      name: session.draft.name ?? '',
      nationality: session.draft.nationality ?? '',
      position: session.draft.position as PlayerPosition,
      dominantFoot: session.draft.dominantFoot as DominantFoot,
      heightCm: session.draft.heightCm ?? 0,
      weightKg: session.draft.weightKg ?? 0,
      visual: {
        skinTone: session.draft.visual?.skinTone ?? '',
        hairStyle: session.draft.visual?.hairStyle ?? ''
      }
    };
  }

  private withValidationMessage(session: PlayerCreationSession, message: string): BotReply {
    const prompt = this.buildPrompt(session);
    return {
      text: `${message}\n\n${prompt.text}`,
      actions: prompt.actions
    };
  }

  private buildPrompt(session: PlayerCreationSession): BotReply {
    switch (session.step) {
      case 'name':
        return {
          text: 'Criação do jogador - Etapa 1/9\nInforme o nome do seu jogador.',
          actions: [phase1BotActions.cancel]
        };
      case 'nationality':
        return {
          text: 'Criação do jogador - Etapa 2/9\nInforme a nacionalidade do seu jogador.',
          actions: [phase1BotActions.cancel]
        };
      case 'position':
        return {
          text: 'Criação do jogador - Etapa 3/9\nEscolha a posição principal.',
          actions: [
            phase1BotActions.positionGoalkeeper,
            phase1BotActions.positionDefender,
            phase1BotActions.positionMidfielder,
            phase1BotActions.positionForward,
            phase1BotActions.cancel
          ]
        };
      case 'dominantFoot':
        return {
          text: 'Criação do jogador - Etapa 4/9\nEscolha o pé dominante.',
          actions: [phase1BotActions.footRight, phase1BotActions.footLeft, phase1BotActions.cancel]
        };
      case 'heightCm':
        return {
          text: 'Criação do jogador - Etapa 5/9\nInforme a altura em centímetros.',
          actions: [phase1BotActions.cancel]
        };
      case 'weightKg':
        return {
          text: 'Criação do jogador - Etapa 6/9\nInforme o peso em quilos.',
          actions: [phase1BotActions.cancel]
        };
      case 'skinTone':
        return {
          text: 'Criação do jogador - Etapa 7/9\nDefina o tom de pele do jogador.',
          actions: [
            phase1BotActions.skinToneFair,
            phase1BotActions.skinToneTan,
            phase1BotActions.skinToneBrown,
            phase1BotActions.skinToneDark,
            phase1BotActions.cancel
          ]
        };
      case 'hairStyle':
        return {
          text: 'Criação do jogador - Etapa 8/9\nDefina o estilo de cabelo do jogador.',
          actions: [
            phase1BotActions.hairStyleShort,
            phase1BotActions.hairStyleCurly,
            phase1BotActions.hairStyleWavy,
            phase1BotActions.hairStyleShaved,
            phase1BotActions.cancel
          ]
        };
      case 'confirmation':
        return {
          text: [
            'Criação do jogador - Etapa 9/9',
            'Confira os dados antes de confirmar:',
            `Nome: ${session.draft.name}`,
            `Nacionalidade: ${session.draft.nationality}`,
            `Posição: ${session.draft.position}`,
            `Pé dominante: ${session.draft.dominantFoot}`,
            `Altura: ${session.draft.heightCm} cm`,
            `Peso: ${session.draft.weightKg} kg`,
            `Tom de pele: ${session.draft.visual?.skinTone}`,
            `Cabelo: ${session.draft.visual?.hairStyle}`
          ].join('\n'),
          actions: [phase1BotActions.confirmCreatePlayer, phase1BotActions.restartCreation, phase1BotActions.cancel]
        };
    }
  }
}
