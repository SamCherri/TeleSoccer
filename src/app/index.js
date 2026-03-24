import { createContainer } from "./container.js";
import { createRailwayTelegramServer } from "../infra/http/railway-telegram-server.js";

const container = createContainer();
const server = createRailwayTelegramServer(container);

server.listen(container.env.port, () => {
  console.log(`[TeleSoccer] HTTP online na porta ${container.env.port}`);
});
