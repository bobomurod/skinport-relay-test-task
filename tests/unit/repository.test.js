import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import {
  getUserById,
  getItemById,
  getUsersAndBalances,
} from "../../dist/src/repository/index.js";

describe("Repository", () => {
  describe("getUserById", () => {
    it("должен вернуть alice по id=1", async () => {
      const result = await getUserById(1);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].username, "alice");
      assert.strictEqual(result[0].id, 1);
    });

    it("должен вернуть bob по id=2", async () => {
      const result = await getUserById(2);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].username, "bob");
    });

    it("должен вернуть charlie по id=3", async () => {
      const result = await getUserById(3);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].username, "charlie");
    });

    it("должен вернуть пустой массив для несуществующего пользователя", async () => {
      const result = await getUserById(999);
      assert.strictEqual(result.length, 0);
    });
  });

  describe("getItemById", () => {
    it("должен вернуть товар с правильной структурой по id=1", async () => {
      const item = await getItemById(1);
      assert.ok(item, "товар должен существовать");
      assert.ok(item.id !== undefined, "должен быть id");
      assert.ok(item.name !== undefined, "должен быть name");
      assert.ok(item.price_cents !== undefined, "должен быть price_cents");
    });

    it("должен вернуть товар по id=2", async () => {
      const item = await getItemById(2);
      assert.ok(item, "товар должен существовать");
      assert.strictEqual(item.id, 2);
    });

    it("должен вернуть товар по id=3", async () => {
      const item = await getItemById(3);
      assert.ok(item, "товар должен существовать");
      assert.strictEqual(item.id, 3);
    });

    it("должен вернуть товар по id=4", async () => {
      const item = await getItemById(4);
      assert.ok(item, "товар должен существовать");
      assert.strictEqual(item.id, 4);
    });

    it("должен вернуть undefined для несуществующего товара", async () => {
      const item = await getItemById(999);
      assert.strictEqual(item, undefined);
    });
  });

  describe("getUsersAndBalances", () => {
    it("должен вернуть всех пользователей с балансами", async () => {
      const result = await getUsersAndBalances();
      assert.strictEqual(result.rows.length, 3);

      const usernames = result.rows.map((u) => u.username).sort();
      assert.deepStrictEqual(usernames, ["alice", "bob", "charlie"]);
    });

    it("каждый пользователь должен иметь id, username и balance_cents", async () => {
      const result = await getUsersAndBalances();

      for (const user of result.rows) {
        assert.ok(user.id !== undefined, "должен быть id");
        assert.ok(user.username !== undefined, "должен быть username");
        assert.ok(
          user.balance_cents !== undefined,
          "должен быть balance_cents"
        );
      }
    });
  });
});
