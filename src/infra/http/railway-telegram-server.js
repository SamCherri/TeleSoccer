import { createServer } from "node:http";

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const content = Buffer.concat(chunks).toString("utf8");
  return content ? JSON.parse(content) : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export function createRailwayTelegramServer({ playerService, phase1Dispatcher }) {
  return createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        return sendJson(res, 200, { status: "ok" });
      }

      if (req.method === "GET" && req.url === "/players") {
        const players = await playerService.listPlayers();
        return sendJson(res, 200, { players });
      }

      if (req.method === "POST" && req.url === "/players") {
        const body = await readJson(req);
        const player = await playerService.createPlayer(body);
        return sendJson(res, 201, { player });
      }

      if (req.method === "POST" && req.url === "/telegram/webhook") {
        const body = await readJson(req);
        const message = await phase1Dispatcher.dispatch(body);
        return sendJson(res, 200, { message });
      }

      return sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro interno";
      return sendJson(res, 422, { error: message });
    }
  });
}
