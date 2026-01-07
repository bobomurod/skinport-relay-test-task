const SKINPORT_BASE_API = process.env.SKINPORT_BASE_API;
// console.log(process.env.SKINPORT_CLIENT_ID);
const clientId = process.env.SKINPORT_CLIENT_ID;
const clientSecret = process.env.SKINPORT_CLIENT_SECRET;
// Combine Client ID and Client Secret with a colon
const encodedData = Buffer.from(`${clientId}:${clientSecret}`).toString(
  "base64",
);

// Generate the Authorization header
const authorizationHeaderString = `Basic ${encodedData}`;

// console.log(authorizationHeaderString);
// Example output: Authorization: Basic <Base64_Encoded_String>
// ___________
//

const params = new URLSearchParams({
  app_id: 730,
  currency: "EUR",
  tradable: true,
});
async function fetchItems(tradable) {
  let res;
  try {
    res = await fetch(`${SKINPORT_BASE_API}/items?tradable=${tradable}`, {
      headers: {
        Authorization: authorizationHeaderString,
        "Content-Type": "br",
      },
    });
  } catch (error) {
    console.error(error);
  }
  return await res.json();
}

export async function itemsService() {
  const [tradableItems, nonTradableItems] = await Promise.all([
    fetchItems(true),
    fetchItems(false),
  ]);
  const mergedItems = await getMergedItems(tradableItems, nonTradableItems);
  return mergedItems;
}

export async function getMergedItems(tradableItems, nonTradableItems) {
  const byName = new Map();

  for (const item of tradableItems) {
    byName.set(item.market_hash_name, {
      market_hash_name: item.market_hash_name,
      version: item.version ?? null,
      min_tradable_price: item.min_price ?? null,
      suggested_price: item.suggested_price,
      item_page: item.item_page,
      market_page: item.market_page,
      updated_at: item.updated_at,
      min_non_tradable_price: null,
    });
  }

  for (const item of nonTradableItems) {
    const exist = byName.get(item.market_hash_name);
    if (exist) {
      exist.min_non_tradable_price = item.min_price ?? null;
    } else {
      byName.set(item.market_hash_name, {
        market_hash_name: item.market_hash_name,
        version: item.version ?? null,
        min_tradable_price: null,
        suggested_price: item.suggested_price,
        item_page: item.item_page,
        market_page: item.market_page,
        updated_at: item.updated_at,
        min_non_tradable_price: item.min_price ?? null,
      });
    }
  }

  return Array.from(byName.values());
}
