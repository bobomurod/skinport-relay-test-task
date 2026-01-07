-- Таблица депозитов (баланс в центах но лучше будет если сделать в микроцентах )
CREATE TABLE deposits (
    id SERIAL PRIMARY KEY,
    balance_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT balance_non_negative CHECK (balance_cents >= 0)
);

-- Запрет DELETE на deposits потому что так надо
CREATE RULE no_delete_deposits AS ON DELETE TO deposits DO INSTEAD NOTHING;

-- История операций (только INSERT)
CREATE TABLE deposit_history (
    id SERIAL PRIMARY KEY,
    deposit_id INT NOT NULL REFERENCES deposits(id),
    old_balance_cents BIGINT NOT NULL,
    new_balance_cents BIGINT NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'credit' | 'debit'
    amount_cents BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- no UPDATE и no DELETE на историю
CREATE RULE no_update_history AS ON UPDATE TO deposit_history DO INSTEAD NOTHING;
CREATE RULE no_delete_history AS ON DELETE TO deposit_history DO INSTEAD NOTHING;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    deposit_id INT NOT NULL REFERENCES deposits(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Триггер для автоматической записи в историю
CREATE OR REPLACE FUNCTION log_deposit_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO deposit_history (deposit_id, old_balance_cents, new_balance_cents, operation, amount_cents)
    VALUES (
        NEW.id,
        OLD.balance_cents,
        NEW.balance_cents,
        CASE WHEN NEW.balance_cents > OLD.balance_cents THEN 'credit' ELSE 'debit' END,
        ABS(NEW.balance_cents - OLD.balance_cents)
    );
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deposit_change_trigger
BEFORE UPDATE ON deposits
FOR EACH ROW EXECUTE FUNCTION log_deposit_change();

-- Каталог айтемов
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_cents BIGINT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    CONSTRAINT price_positive CHECK (price_cents > 0),
    CONSTRAINT stock_non_negative CHECK (stock >= 0)
);

-- Инвентарь юзера
CREATE TABLE user_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    item_id INT NOT NULL REFERENCES items(id),
    quantity INT NOT NULL DEFAULT 1,
    purchased_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT quantity_positive CHECK (quantity > 0)
);

-- Таблица транзакций берем как источник правды
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    user_id INT NOT NULL REFERENCES users(id),
    amount_cents BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'purchase', 'refund', 'topup'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE RULE no_delete_transactions AS ON DELETE TO transactions DO INSTEAD NOTHING;


-- Seed данных чтоб было на чем тестить
INSERT INTO deposits (balance_cents) VALUES
    (15000),  -- $150.00
    (10000),  -- $100.00
    (5000);   -- $50.00

INSERT INTO users (username, deposit_id) VALUES
    ('alice', 1),
    ('bob', 2),
    ('charlie', 3);

INSERT INTO items (name, price_cents, stock) VALUES
    ('Star', 5000, 10),      -- $50.00
    ('Shield', 3000, 15),     -- $30.00
    ('Sticker', 1000, 100),    -- $10.00
    ('Armor', 10000, 5);      -- $100.00
