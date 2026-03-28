import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MatchApplicationService } from "../../../application/services/match-application-service.js";
import type { ApiResponse } from "../../../shared/contracts/match-contracts.js";

const paramsSchema = z.object({ matchId: z.string().min(1) });

const actionSchema = z.object({
  action: z.enum(["PASS", "DRIBBLE", "SHOT", "PROTECT_BALL", "PASS_BACK", "SWITCH_PLAY"])
});

const createMatchSchema = z.object({
  homeTeamName: z.string().min(2),
  awayTeamName: z.string().min(2)
});

const claimSlotSchema = z.object({
  teamSide: z.enum(["HOME", "AWAY"]),
  slotNumber: z.number().int().min(1).max(11),
  userId: z.string().min(1)
});

const response = <T>(data: T): ApiResponse<T> => ({
  data,
  meta: {
    generatedAt: new Date().toISOString(),
    requestId: crypto.randomUUID()
  }
});

export const registerMatchRoutes = (
  server: FastifyInstance,
  dependencies: { matchService: MatchApplicationService }
): void => {
  const { matchService } = dependencies;

  server.get("/scene-catalog", async () => response({ items: await matchService.getSceneCatalog() }));

  server.post("/matches", async (request, reply) => {
    const parse = createMatchSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(response({ error: parse.error.flatten() }));
    }

    const { homeTeamName, awayTeamName } = parse.data;
    const matchState = await matchService.createMatch(homeTeamName, awayTeamName);
    return reply.status(201).send(response({ matchState }));
  });

  server.get("/matches/:matchId/state", async (request, reply) => {
    const parse = paramsSchema.safeParse(request.params);
    if (!parse.success) {
      return reply.status(400).send(response({ error: parse.error.flatten() }));
    }

    const matchState = await matchService.getMatchState(parse.data.matchId);
    if (!matchState) {
      return reply.status(404).send(response({ error: "match-not-found" }));
    }

    return response({ matchState });
  });

  server.post("/matches/:matchId/actions", async (request, reply) => {
    const paramsParse = paramsSchema.safeParse(request.params);
    const bodyParse = actionSchema.safeParse(request.body);

    if (!paramsParse.success || !bodyParse.success) {
      return reply.status(400).send(
        response({
          error: {
            params: paramsParse.success ? null : paramsParse.error.flatten(),
            body: bodyParse.success ? null : bodyParse.error.flatten()
          }
        })
      );
    }

    const result = await matchService.submitAction(paramsParse.data.matchId, bodyParse.data.action);
    if (!result) {
      return reply.status(404).send(response({ error: "match-not-found" }));
    }

    return response(result);
  });

  server.post("/matches/:matchId/advance", async (request, reply) => {
    const parse = paramsSchema.safeParse(request.params);
    if (!parse.success) {
      return reply.status(400).send(response({ error: parse.error.flatten() }));
    }

    const result = await matchService.advanceTurn(parse.data.matchId);
    if (!result) {
      return reply.status(404).send(response({ error: "match-not-found" }));
    }

    return response(result);
  });

  server.post("/matches/:matchId/join", async (request, reply) => {
    const parse = paramsSchema.safeParse(request.params);
    if (!parse.success) {
      return reply.status(400).send(response({ error: parse.error.flatten() }));
    }

    const user = await matchService.joinMatch(parse.data.matchId);
    if (!user) {
      return reply.status(404).send(response({ error: "match-not-found" }));
    }

    return response({ user });
  });

  server.post("/matches/:matchId/claim-slot", async (request, reply) => {
    const paramsParse = paramsSchema.safeParse(request.params);
    const bodyParse = claimSlotSchema.safeParse(request.body);

    if (!paramsParse.success || !bodyParse.success) {
      return reply.status(400).send(
        response({
          error: {
            params: paramsParse.success ? null : paramsParse.error.flatten(),
            body: bodyParse.success ? null : bodyParse.error.flatten()
          }
        })
      );
    }

    const result = await matchService.claimSlot({
      matchId: paramsParse.data.matchId,
      ...bodyParse.data
    });

    if ("error" in result) {
      if (result.error === "match-not-found" || result.error === "slot-not-found") {
        return reply.status(404).send(response({ error: result.error }));
      }

      if (result.error === "slot-already-claimed") {
        return reply.status(409).send(response({ error: result.error }));
      }

      return reply.status(400).send(response({ error: result.error }));
    }

    return response(result);
  });
};
