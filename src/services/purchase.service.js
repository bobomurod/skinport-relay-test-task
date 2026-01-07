import {
  performPurchaseTransaction,
  getUserById,
  getItemById,
} from "../repository/index.js";

export async function purchaseService(
  userId,
  itemId,
  quantity,
  idempotencyKey,
) {
  // сюда можно зафигачить кучу другой логики которая должна сработать до perform transaction, например заюзать скидку или купон, перепроверить наличие товара или пермишнт пользователя на этот товар, можно вызызвать даже просто для того чтоб верно отрисовать кнопку
  try {
    const user = await getUserById(userId);
    const item = await getItemById(itemId);
    if (!user || user.length === 0) throw new Error("User not found");
    if (!item) throw new Error("Item not found");
    if (!item.quantity < quantity) throw new Error("Not enough items in stock");
    // if (!user.permissions.includes(item.permission)) throw new Error("User does not have permission to purchase this item");
    const amountCents = item.price_cents * quantity;
    const result = await performPurchaseTransaction(
      userId,
      item,
      quantity,
      amountCents,
      idempotencyKey,
    );
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
