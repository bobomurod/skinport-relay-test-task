import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { server } from "../../dist/server.js";
import { uuidv7 } from "uuidv7";

describe("API Endpoints", () => {
  before(async () => {
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  describe("GET /users", () => {
    it("должен вернуть список пользователей", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/users",
      });

      assert.strictEqual(response.statusCode, 200);
      const users = JSON.parse(response.payload);
      assert.ok(Array.isArray(users), "должен вернуть массив");
      assert.ok(users.length >= 3, "должно быть минимум 3 пользователя");
    });

    it("каждый пользователь должен иметь id, username и balance_cents", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/users",
      });

      const users = JSON.parse(response.payload);
      for (const user of users) {
        assert.ok(user.id !== undefined, "должен быть id");
        assert.ok(user.username !== undefined, "должен быть username");
        assert.ok(user.balance_cents !== undefined, "должен быть balance_cents");
      }
    });

    it("должен содержать alice, bob и charlie", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/users",
      });

      const users = JSON.parse(response.payload);
      const usernames = users.map((u) => u.username);
      assert.ok(usernames.includes("alice"), "должен быть alice");
      assert.ok(usernames.includes("bob"), "должен быть bob");
      assert.ok(usernames.includes("charlie"), "должен быть charlie");
    });
  });

  describe("POST /purchase", () => {
    it("должен обработать покупку", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/purchase",
        payload: {
          userId: 1,
          itemId: 1,
          quantity: 1,
          idempotencyKey: uuidv7(),
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const result = JSON.parse(response.payload);
      assert.ok(
        result.success === true ||
          (result.success === false && result.reason === "insufficient_funds"),
        "должен вернуть валидный результат"
      );
    });

    it("должен вернуть ошибку для несуществующего пользователя", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/purchase",
        payload: {
          userId: 999,
          itemId: 1,
          quantity: 1,
          idempotencyKey: uuidv7(),
        },
      });

      assert.strictEqual(response.statusCode, 500);
    });

    it("должен вернуть ошибку для несуществующего товара", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/purchase",
        payload: {
          userId: 1,
          itemId: 999,
          quantity: 1,
          idempotencyKey: uuidv7(),
        },
      });

      assert.strictEqual(response.statusCode, 500);
    });

    it("не должен позволить уйти в минус (insufficient_funds)", async () => {
      // Получаем баланс charlie (id=3) - у него меньше всего денег ($50 = 5000 cents)
      const usersResponse = await server.inject({
        method: "GET",
        url: "/users",
      });
      const users = JSON.parse(usersResponse.payload);
      const charlie = users.find((u) => u.username === "charlie");
      const balanceBefore = BigInt(charlie.balance_cents);

      // Пытаемся купить Armor (id=4, цена $100 = 10000 cents) - дороже чем баланс
      const purchaseResponse = await server.inject({
        method: "POST",
        url: "/purchase",
        payload: {
          userId: 3,
          itemId: 4,
          quantity: 1,
          idempotencyKey: uuidv7(),
        },
      });

      const result = JSON.parse(purchaseResponse.payload);

      // Должен вернуть insufficient_funds
      assert.strictEqual(result.success, false, "покупка должна быть отклонена");
      assert.strictEqual(
        result.reason,
        "insufficient_funds",
        "причина должна быть insufficient_funds"
      );

      // Проверяем что баланс не изменился
      const usersAfterResponse = await server.inject({
        method: "GET",
        url: "/users",
      });
      const usersAfter = JSON.parse(usersAfterResponse.payload);
      const charlieAfter = usersAfter.find((u) => u.username === "charlie");
      const balanceAfter = BigInt(charlieAfter.balance_cents);

      assert.strictEqual(
        balanceAfter,
        balanceBefore,
        "баланс не должен измениться после неудачной покупки"
      );
    });

    it("должен обеспечить идемпотентность", async () => {
      const idempotencyKey = uuidv7();

      const response1 = await server.inject({
        method: "POST",
        url: "/purchase",
        payload: {
          userId: 2,
          itemId: 2,
          quantity: 1,
          idempotencyKey,
        },
      });

      const response2 = await server.inject({
        method: "POST",
        url: "/purchase",
        payload: {
          userId: 2,
          itemId: 2,
          quantity: 1,
          idempotencyKey,
        },
      });

      const result1 = JSON.parse(response1.payload);
      const result2 = JSON.parse(response2.payload);

      assert.strictEqual(
        result1.success,
        result2.success,
        "повторный запрос должен вернуть тот же результат"
      );
    });
  });
});
