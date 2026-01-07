import "dotenv/config";
import { describe, it } from "node:test";
import assert from "node:assert";
import { purchaseService } from "../../src/services/purchase.service.js";
import { uuidv7 } from "uuidv7";

describe("purchaseService", () => {
  it("должен выбросить ошибку если пользователь не найден", async () => {
    await assert.rejects(
      () => purchaseService(999, 1, 1, uuidv7()),
      { message: "User not found" }
    );
  });

  it("должен выбросить ошибку если товар не найден", async () => {
    await assert.rejects(
      () => purchaseService(1, 999, 1, uuidv7()),
      { message: "Item not found" }
    );
  });

  it("должен выполнить покупку для alice (id=1)", async () => {
    const idempotencyKey = uuidv7();
    const result = await purchaseService(1, 1, 1, idempotencyKey);
    // success: true если баланс есть, или success: false с reason если нет
    assert.ok(
      result.success === true ||
        (result.success === false && result.reason === "insufficient_funds"),
      "должен вернуть валидный результат транзакции"
    );
  });

  it("должен вернуть тот же результат для повторного запроса с тем же idempotencyKey", async () => {
    const idempotencyKey = uuidv7();

    const result1 = await purchaseService(1, 1, 1, idempotencyKey);
    const result2 = await purchaseService(1, 1, 1, idempotencyKey);

    assert.strictEqual(result1.success, result2.success);
  });

  it("должен работать для bob (id=2)", async () => {
    const result = await purchaseService(2, 2, 1, uuidv7());
    assert.ok(
      result.success === true ||
        (result.success === false && result.reason === "insufficient_funds"),
      "должен вернуть валидный результат транзакции"
    );
  });

  it("должен работать для charlie (id=3)", async () => {
    const result = await purchaseService(3, 3, 1, uuidv7());
    assert.ok(
      result.success === true ||
        (result.success === false && result.reason === "insufficient_funds"),
      "должен вернуть валидный результат транзакции"
    );
  });
});
