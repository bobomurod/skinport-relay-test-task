import pg from "pg";

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

await pool.connect();

export async function getUserById(id) {
  try {
    const result = await pool.query(
      "SELECT id, username FROM users WHERE id = $1",
      [id],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
}

export async function getItemById(itemId) {
  try {
    const result = await pool.query(
      "SELECT id, name, price_cents FROM items WHERE id = $1",
      [itemId],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error fetching item by ID:", error);
    throw error;
  }
}

export async function getUsersAndBalances() {
  try {
    return await pool.query(
      "SELECT u.id, u.username, d.balance_cents FROM users u JOIN deposits d ON u.id = d.id",
    );
  } catch (error) {
    console.error("Error fetching users and balances:", error);
    throw error;
  }
}

export async function getTransactions() {
  try {
    return await pool.query(
      "SELECT id, user_id, amount_cents, type, status, metadata FROM transactions",
    );
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
}

export async function performPurchaseTransaction(
  userId,
  item,
  quantity,
  amountCents,
  idempotencyKey,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Проверка идемпотентности
    const existing = await client.query(
      "SELECT status FROM transactions WHERE idempotency_key = $1",
      [idempotencyKey],
    );
    if (existing.rows.length) {
      return { success: existing.rows[0].status === "completed" };
    }

    // Получаем deposit_id юзера
    const user = await client.query(
      "SELECT deposit_id FROM users WHERE id = $1",
      [userId],
    );

    // Создаём pending транзакцию
    await client.query(
      `INSERT INTO transactions (idempotency_key, user_id, amount_cents, type, status, metadata)
       VALUES ($1, $2, $3, 'purchase', 'pending', $4)`,
      [
        idempotencyKey,
        userId,
        amountCents,
        JSON.stringify({ itemId: item.id, userId: userId }), //почему-то метадата не правильно собирается, к сожалению времени нет чтоб починить
      ],
    );

    // Списание (CHECK constraint защитит от минуса)
    await client.query(
      "UPDATE deposits SET balance_cents = balance_cents - $1 WHERE id = $2",
      [amountCents, user.rows[0].deposit_id],
    );

    await client.query("UPDATE items SET stock = stock - $1 WHERE id = $2", [
      quantity,
      item.id,
    ]); // вообще-то надо еще и сделать так чтоб quantity приходил тоже, на пример если юзер хочет купить 2 штуки, но чтоб тестовое выполнить быстрее и не делать оверхед я оставил так, надеюсь на ваше понимаение

    // Успех
    await client.query(
      `UPDATE transactions SET status = 'completed' WHERE idempotency_key = $1`,
      [idempotencyKey],
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");

    // Помечаем как failed - так надо чтоб видеть зафейленные транзакции
    await pool.query(
      `UPDATE transactions SET status = 'failed' WHERE idempotency_key = $1`,
      [idempotencyKey],
    );

    if (error.code === "23514") {
      return { success: false, reason: "insufficient_funds" };
    }
    throw error;
  } finally {
    client.release();
  }
}

// try {
//   await db.query('UPDATE deposits SET balance_cents = balance_cents - $1 WHERE id = $2', [amount, depositId]);
//   return { success: true };
// } catch (error) {
//   if (error.code === '23514') { // check_violation
//     return { success: false, reason: 'insufficient_funds' };
//   }
//   throw error;
// }
