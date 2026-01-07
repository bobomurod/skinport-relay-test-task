import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getMergedItems } from "../../dist/src/services/items.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDir = join(__dirname, "../");

describe("getMergedItems", () => {
  it("должен быть хотя бы один item с обеими ценами (tradable и non-tradable)", async () => {
    const tradable = JSON.parse(
      await readFile(join(testDir, "tradable_min.json"), "utf-8"),
    );
    const nonTradable = JSON.parse(
      await readFile(join(testDir, "non-tradable_min.json"), "utf-8"),
    );

    const merged = await getMergedItems(tradable, nonTradable);

    const itemWithBothPrices = merged.find(
      (item) =>
        item.min_tradable_price !== null &&
        item.min_non_tradable_price !== null &&
        item.min_tradable_price !== item.min_non_tradable_price,
    );

    assert.ok(
      itemWithBothPrices,
      "должен существовать item с разными min_tradable_price и min_non_tradable_price",
    );

    console.log("Найден item:", itemWithBothPrices.market_hash_name);
    console.log("  min_tradable_price:", itemWithBothPrices.min_tradable_price);
    console.log(
      "  min_non_tradable_price:",
      itemWithBothPrices.min_non_tradable_price,
    );
  });
});
