import "dotenv/config";
import Fastify from "fastify";
import { simpleTTLCache } from "./src/utils/simpleTTLCache.js";
import {
  getUsersAndBalances,
  getTransactions,
} from "./src/repository/index.js";
import { purchaseService } from "./src/services/purchase.service.js";
import { itemsService } from "./src/services/items.service.js";

export const server = Fastify({ logger: false });

const cache = simpleTTLCache(60 * 1000 * 15); //15 minut kesh

// поехали рауты
server.get("/items", async (req, res) => {
  const result = cache.get(req.pathname);
  if (!result) {
    const items = await itemsService();
    cache.set(req.pathname, items);
    res.send(items);
  } else {
    res.send(result);
  }
});

server.get("/users", async (req, res) => {
  const users = await getUsersAndBalances();
  res.send(users.rows);
});

server.get("/transactions", async (req, res) => {
  const transactions = await getTransactions();
  res.send(transactions.rows);
});

server.post("/purchase", async (req, res) => {
  const { userId, itemId, quantity, idempotencyKey } = req.body;
  const result = await purchaseService(
    userId,
    itemId,
    quantity,
    idempotencyKey,
  );
  res.send(result);
});

// Запускаем сервер только если файл запущен напрямую, не при импорте, так надо чтоб тестить легче было
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen({ port: 3003, host: "0.0.0.0" }, (err, address) => {
    if (err) {
      Fastify.log.error(err);
      process.exit(1);
    }
    console.log(`Server serving services on ${address}`);
  });
}
