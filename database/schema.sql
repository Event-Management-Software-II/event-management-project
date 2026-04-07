-- ============================================================
-- EVENT MANAGER - Software II
-- Soft delete with deleted_at TIMESTAMP (NULL = active)
-- All identifiers in English
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- Roles
CREATE TABLE "Role" (
    "id_role"    SERIAL PRIMARY KEY,
    "name"       VARCHAR(100) NOT NULL UNIQUE,
    "created_at" TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE "User" (
    "id_user"    SERIAL PRIMARY KEY,
    "email"      VARCHAR(255) NOT NULL UNIQUE,
    "password"   VARCHAR(255) NOT NULL,
    "full_name"  VARCHAR(255) NOT NULL,
    "id_role"    INTEGER NOT NULL REFERENCES "Role"("id_role"),
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW(),
    "deleted_at" TIMESTAMP DEFAULT NULL
);

-- Categories
CREATE TABLE "Category" (
    "id_category" SERIAL PRIMARY KEY,
    "name"        VARCHAR(255) NOT NULL UNIQUE,
    "created_at"  TIMESTAMP DEFAULT NOW(),
    "updated_at"  TIMESTAMP DEFAULT NOW(),
    "deleted_at"  TIMESTAMP DEFAULT NULL
);

-- Events
CREATE TABLE "Event" (
    "id_event"    SERIAL PRIMARY KEY,
    "name"        VARCHAR(255) NOT NULL UNIQUE,
    "id_category" INTEGER NOT NULL REFERENCES "Category"("id_category"),
    "price"       DOUBLE PRECISION NOT NULL DEFAULT 0
                    CHECK ("price" >= 0),
    "description" TEXT NOT NULL
                    CHECK (char_length("description") >= 20),
    "location"    VARCHAR(255) NOT NULL,
    "date_time"   TIMESTAMP,
    "capacity"    INTEGER CHECK ("capacity" > 0),      -- NULL = unlimited
    "created_at"  TIMESTAMP DEFAULT NOW(),
    "updated_at"  TIMESTAMP DEFAULT NOW(),
    "deleted_at"  TIMESTAMP DEFAULT NULL
);

-- Event images
CREATE TABLE "EventImage" (
    "id_image"   SERIAL PRIMARY KEY,
    "id_event"   INTEGER NOT NULL REFERENCES "Event"("id_event") ON DELETE CASCADE,
    "image_url"  VARCHAR(255) NOT NULL,
    "type"       VARCHAR(50) NOT NULL DEFAULT 'poster'
                   CHECK ("type" IN ('poster', 'banner', 'gallery'))
);

-- Event change history (RF-001.3)
CREATE TABLE "EventHistory" (
    "id_history"  SERIAL PRIMARY KEY,
    "id_event"    INTEGER NOT NULL REFERENCES "Event"("id_event"),
    "name"        VARCHAR(255),
    "id_category" INTEGER,
    "price"       DOUBLE PRECISION,
    "description" TEXT,
    "location"    VARCHAR(255),
    "date_time"   TIMESTAMP,
    "changed_at"  TIMESTAMP DEFAULT NOW()
);

-- User interests (RF-002)
CREATE TABLE "Interest" (
    "id_interest"     SERIAL PRIMARY KEY,
    "id_event"        INTEGER NOT NULL REFERENCES "Event"("id_event"),
    "user_identifier" VARCHAR(255) NOT NULL,
    "created_at"      TIMESTAMP DEFAULT NOW(),
    UNIQUE ("id_event", "user_identifier")
);

-- User favorites (User ↔ Event)
CREATE TABLE "UserEvent" (
    "id_favorite" SERIAL PRIMARY KEY,
    "id_user"     INTEGER NOT NULL REFERENCES "User"("id_user") ON DELETE CASCADE,
    "id_event"    INTEGER NOT NULL REFERENCES "Event"("id_event") ON DELETE CASCADE,
    "created_at"  TIMESTAMP DEFAULT NOW(),
    UNIQUE ("id_user", "id_event")
);

CREATE INDEX idx_userevent_user  ON "UserEvent"("id_user");
CREATE INDEX idx_userevent_event ON "UserEvent"("id_event");

-- Purchases (User ↔ Event with ticket quantity)
CREATE TABLE "Purchase" (
    "id_purchase" SERIAL PRIMARY KEY,
    "id_user"     INTEGER NOT NULL REFERENCES "User"("id_user") ON DELETE CASCADE,
    "id_event"    INTEGER NOT NULL REFERENCES "Event"("id_event") ON DELETE CASCADE,
    "quantity"    INTEGER NOT NULL CHECK ("quantity" > 0),
    "unit_price"  DOUBLE PRECISION NOT NULL CHECK ("unit_price" >= 0),   -- snapshot of price at purchase time
    "total_price" DOUBLE PRECISION GENERATED ALWAYS AS ("quantity" * "unit_price") STORED,
    "status"      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK ("status" IN ('pending', 'completed', 'cancelled')),
    "created_at"  TIMESTAMP DEFAULT NOW(),
    "updated_at"  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_purchase_user   ON "Purchase"("id_user");
CREATE INDEX idx_purchase_event  ON "Purchase"("id_event");
CREATE INDEX idx_purchase_status ON "Purchase"("status");

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated_at" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_updated_at
    BEFORE UPDATE ON "Event"
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_category_updated_at
    BEFORE UPDATE ON "Category"
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_user_updated_at
    BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_purchase_updated_at
    BEFORE UPDATE ON "Purchase"
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Save previous event state before each UPDATE (RF-001.3)
CREATE OR REPLACE FUNCTION save_event_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "EventHistory" (
        "id_event", "name", "id_category", "price",
        "description", "location", "date_time"
    ) VALUES (
        OLD."id_event", OLD."name", OLD."id_category", OLD."price",
        OLD."description", OLD."location", OLD."date_time"
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_history
    BEFORE UPDATE ON "Event"
    FOR EACH ROW EXECUTE FUNCTION save_event_history();

-- Validate available ticket capacity before inserting or updating a purchase.
-- Only counts confirmed (completed) purchases. Raises an exception if the
-- event would be over capacity. Events with NULL capacity are unlimited.
CREATE OR REPLACE FUNCTION check_ticket_capacity()
RETURNS TRIGGER AS $$
DECLARE
    v_capacity       INTEGER;
    v_tickets_sold   INTEGER;
    v_current_qty    INTEGER;
BEGIN
    -- Skip capacity check for cancelled purchases
    IF NEW."status" = 'cancelled' THEN
        RETURN NEW;
    END IF;

    SELECT "capacity" INTO v_capacity
    FROM "Event"
    WHERE "id_event" = NEW."id_event";

    -- NULL capacity means unlimited tickets
    IF v_capacity IS NULL THEN
        RETURN NEW;
    END IF;

    -- Total completed tickets for this event (excluding the current row on UPDATE)
    SELECT COALESCE(SUM("quantity"), 0) INTO v_tickets_sold
    FROM "Purchase"
    WHERE "id_event"   = NEW."id_event"
      AND "status"     = 'completed'
      AND "id_purchase" <> COALESCE(NEW."id_purchase", -1);

    -- On UPDATE, the old row is already excluded above; on INSERT id_purchase is NULL
    v_current_qty := NEW."quantity";

    IF (v_tickets_sold + v_current_qty) > v_capacity THEN
        RAISE EXCEPTION
            'Not enough tickets available. Capacity: %, Sold: %, Requested: %',
            v_capacity, v_tickets_sold, v_current_qty;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_capacity
    BEFORE INSERT OR UPDATE ON "Purchase"
    FOR EACH ROW EXECUTE FUNCTION check_ticket_capacity();

-- ============================================================
-- VIEWS
-- ============================================================

-- Active events with category and poster image
CREATE OR REPLACE VIEW v_events AS
SELECT
    e."id_event",
    e."name"        AS "event_name",
    e."price",
    e."description",
    e."location",
    e."date_time",
    e."capacity",
    e."created_at",
    c."id_category",
    c."name"        AS "category_name",
    (
        SELECT "image_url"
        FROM "EventImage"
        WHERE "id_event" = e."id_event" AND "type" = 'poster'
        LIMIT 1
    ) AS "image_url"
FROM "Event" e
JOIN "Category" c ON e."id_category" = c."id_category"
WHERE e."deleted_at" IS NULL;

-- Active categories
CREATE OR REPLACE VIEW v_categories AS
SELECT
    "id_category",
    "name",
    "created_at"
FROM "Category"
WHERE "deleted_at" IS NULL;

-- Interest ranking (RF-002.2)
CREATE OR REPLACE VIEW v_interest_report AS
SELECT
    e."name"                        AS "event_name",
    COUNT(i."id_interest")::INT     AS "interest_count"
FROM "Event" e
LEFT JOIN "Interest" i ON e."id_event" = i."id_event"
WHERE e."deleted_at" IS NULL
GROUP BY e."id_event", e."name"
ORDER BY "interest_count" DESC;

-- Favorites per user (active users and events only)
CREATE OR REPLACE VIEW v_user_favorites AS
SELECT
    u."id_user",
    u."email",
    u."full_name",
    e."id_event",
    e."name"         AS "event_name",
    e."price",
    e."description",
    e."location",
    e."date_time",
    c."name"         AS "category_name",
    (
        SELECT "image_url"
        FROM "EventImage"
        WHERE "id_event" = e."id_event" AND "type" = 'poster'
        LIMIT 1
    ) AS "image_url",
    ue."created_at"  AS "favorited_at"
FROM "UserEvent" ue
JOIN "User"     u ON ue."id_user"  = u."id_user"
JOIN "Event"    e ON ue."id_event" = e."id_event"
JOIN "Category" c ON e."id_category" = c."id_category"
WHERE e."deleted_at" IS NULL
  AND u."deleted_at" IS NULL
ORDER BY ue."created_at" DESC;

-- Purchase detail with user and event info
-- Shows all statuses (pending, completed, cancelled) for full history.
-- Filter by status = 'completed' in the application layer when needed.
CREATE OR REPLACE VIEW v_purchases AS
SELECT
    p."id_purchase",
    p."quantity",
    p."unit_price",
    p."total_price",
    p."status",
    p."created_at",
    p."updated_at",
    u."id_user",
    u."email",
    u."full_name",
    e."id_event",
    e."name"         AS "event_name",
    e."location",
    e."date_time",
    c."name"         AS "category_name",
    (
        SELECT "image_url"
        FROM "EventImage"
        WHERE "id_event" = e."id_event" AND "type" = 'poster'
        LIMIT 1
    ) AS "image_url"
FROM "Purchase" p
JOIN "User"     u ON p."id_user"  = u."id_user"
JOIN "Event"    e ON p."id_event" = e."id_event"
JOIN "Category" c ON e."id_category" = c."id_category"
WHERE u."deleted_at" IS NULL
  AND e."deleted_at" IS NULL
ORDER BY p."created_at" DESC;

-- Sales summary per event (completed purchases only)
CREATE OR REPLACE VIEW v_event_sales AS
SELECT
    e."id_event",
    e."name"                                    AS "event_name",
    e."capacity",
    c."name"                                    AS "category_name",
    COUNT(p."id_purchase")::INT                 AS "total_orders",
    COALESCE(SUM(p."quantity"), 0)::INT         AS "total_tickets_sold",
    COALESCE(SUM(p."total_price"), 0)           AS "total_revenue"
FROM "Event" e
JOIN "Category" c ON e."id_category" = c."id_category"
LEFT JOIN "Purchase" p ON e."id_event" = p."id_event"
    AND p."status" = 'completed'
WHERE e."deleted_at" IS NULL
GROUP BY e."id_event", e."name", e."capacity", c."name"
ORDER BY "total_tickets_sold" DESC;

-- ============================================================
-- SEED DATA - Roles only (required for the system to work)
-- ============================================================
INSERT INTO "Role" ("name") VALUES ('admin') ON CONFLICT DO NOTHING;
INSERT INTO "Role" ("name") VALUES ('user')  ON CONFLICT DO NOTHING;