-- ============================================================
-- EVENT MANAGER - Software II
-- Soft delete: deleted_at TIMESTAMP (NULL = active)
-- Event lifecycle: active = deleted_at IS NULL AND date_time > NOW()
--                 completed = deleted_at IS NULL AND date_time <= NOW() - 1 day
-- All identifiers in English
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- Roles
CREATE TABLE "Role" (
    "id_role"    SERIAL PRIMARY KEY,
    "roleName"   VARCHAR(100) NOT NULL UNIQUE,
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
    "id_category"  SERIAL PRIMARY KEY,
    "categoryName" VARCHAR(255) NOT NULL UNIQUE,
    "created_at"   TIMESTAMP DEFAULT NOW(),
    "updated_at"   TIMESTAMP DEFAULT NOW(),
    "deleted_at"   TIMESTAMP DEFAULT NULL
);

-- ============================================================
-- GLOBAL TICKET TYPE CATALOG
-- Admin creates types once (Oro, Plata, VIP, General, etc.)
-- Each event then assigns these types with its own price & capacity.
-- ============================================================
CREATE TABLE "TicketTypeCatalog" (
    "id_catalog"  SERIAL PRIMARY KEY,
    "typeName"    VARCHAR(100) NOT NULL UNIQUE,   -- e.g. 'VIP', 'Oro', 'General'
    "created_at"  TIMESTAMP DEFAULT NOW(),
    "updated_at"  TIMESTAMP DEFAULT NOW(),
    "deleted_at"  TIMESTAMP DEFAULT NULL           -- soft delete: hidden from dropdowns
);

-- Events
-- price and capacity are NOT on Event: they live in EventTicketType.
-- "active"    = deleted_at IS NULL AND date_time > NOW()
-- "completed" = deleted_at IS NULL AND date_time <= (NOW() - INTERVAL '1 day')
-- "deleted"   = deleted_at IS NOT NULL
CREATE TABLE "Event" (
    "id_event"    SERIAL PRIMARY KEY,
    "eventName"   VARCHAR(255) NOT NULL UNIQUE,
    "id_category" INTEGER NOT NULL REFERENCES "Category"("id_category"),
    "description" TEXT NOT NULL
                    CHECK (char_length("description") >= 20),
    "location"    VARCHAR(255) NOT NULL,
    "date_time"   TIMESTAMP NOT NULL,
    "created_at"  TIMESTAMP DEFAULT NOW(),
    "updated_at"  TIMESTAMP DEFAULT NOW(),
    "deleted_at"  TIMESTAMP DEFAULT NULL
);

-- Event ↔ TicketTypeCatalog assignment
-- One row per (event, catalog type). Holds the price and capacity for that combination.
CREATE TABLE "EventTicketType" (
    "id_event_ticket"  SERIAL PRIMARY KEY,
    "id_event"         INTEGER NOT NULL REFERENCES "Event"("id_event") ON DELETE CASCADE,
    "id_catalog"       INTEGER NOT NULL REFERENCES "TicketTypeCatalog"("id_catalog"),
    "price"            DOUBLE PRECISION NOT NULL DEFAULT 0
                         CHECK ("price" >= 0),
    "capacity"         INTEGER NOT NULL CHECK ("capacity" > 0),
    "created_at"       TIMESTAMP DEFAULT NOW(),
    "updated_at"       TIMESTAMP DEFAULT NOW(),
    "deleted_at"       TIMESTAMP DEFAULT NULL,
    UNIQUE ("id_event", "id_catalog")              -- same type can't be assigned twice to the same event
);

CREATE INDEX idx_ett_event   ON "EventTicketType"("id_event");
CREATE INDEX idx_ett_catalog ON "EventTicketType"("id_catalog");

-- Event images
CREATE TABLE "EventImage" (
    "id_image"  SERIAL PRIMARY KEY,
    "id_event"  INTEGER NOT NULL REFERENCES "Event"("id_event") ON DELETE CASCADE,
    "image_url" VARCHAR(255) NOT NULL,
    "type"      VARCHAR(50) NOT NULL DEFAULT 'poster'
                  CHECK ("type" IN ('poster', 'banner', 'gallery'))
);

-- Event change history (RF-001.3)
CREATE TABLE "EventHistory" (
    "id_history"  SERIAL PRIMARY KEY,
    "id_event"    INTEGER NOT NULL REFERENCES "Event"("id_event"),
    "eventName"   VARCHAR(255),
    "id_category" INTEGER,
    "description" TEXT,
    "location"    VARCHAR(255),
    "date_time"   TIMESTAMP,
    "changed_at"  TIMESTAMP DEFAULT NOW()
);

-- EventTicketType change history
-- Tracks every modification to price / capacity of a ticket tier.
CREATE TABLE "EventTicketTypeHistory" (
    "id_history"      SERIAL PRIMARY KEY,
    "id_event_ticket" INTEGER NOT NULL REFERENCES "EventTicketType"("id_event_ticket"),
    "id_event"        INTEGER NOT NULL,
    "id_catalog"      INTEGER NOT NULL,
    "price"           DOUBLE PRECISION,
    "capacity"        INTEGER,
    "changed_at"      TIMESTAMP DEFAULT NOW()
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

-- Purchases
-- A purchase is always tied to a specific EventTicketType (tier + event).
-- unit_price is a snapshot of the price at purchase time.
CREATE TABLE "Purchase" (
    "id_purchase"      SERIAL PRIMARY KEY,
    "id_user"          INTEGER NOT NULL REFERENCES "User"("id_user") ON DELETE CASCADE,
    "id_event"         INTEGER NOT NULL REFERENCES "Event"("id_event") ON DELETE CASCADE,
    "id_event_ticket"  INTEGER NOT NULL REFERENCES "EventTicketType"("id_event_ticket"),
    "quantity"         INTEGER NOT NULL CHECK ("quantity" > 0),
    "unit_price"       DOUBLE PRECISION NOT NULL CHECK ("unit_price" >= 0),
    "total_price"      DOUBLE PRECISION GENERATED ALWAYS AS ("quantity" * "unit_price") STORED,
    "qr_code"          TEXT,             -- base64 or URL of the generated QR for the whole purchase
    "status"           VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK ("status" IN ('pending', 'completed', 'cancelled')),
    "created_at"       TIMESTAMP DEFAULT NOW(),
    "updated_at"       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_purchase_user         ON "Purchase"("id_user");
CREATE INDEX idx_purchase_event        ON "Purchase"("id_event");
CREATE INDEX idx_purchase_eventticket  ON "Purchase"("id_event_ticket");
CREATE INDEX idx_purchase_status       ON "Purchase"("status");

-- Individual tickets (one row per physical ticket / seat within a purchase)
-- Each ticket has its own QR code so it can be printed individually.
CREATE TABLE "Ticket" (
    "id_ticket"   SERIAL PRIMARY KEY,
    "id_purchase" INTEGER NOT NULL REFERENCES "Purchase"("id_purchase") ON DELETE CASCADE,
    "ticket_number" VARCHAR(50) NOT NULL UNIQUE,  -- human-readable code, e.g. EVT001-VIP-0042
    "qr_code"     TEXT NOT NULL,                  -- base64 or URL for individual QR
    "created_at"  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ticket_purchase ON "Ticket"("id_purchase");

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
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

CREATE TRIGGER trg_ticketcatalog_updated_at
    BEFORE UPDATE ON "TicketTypeCatalog"
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_ett_updated_at
    BEFORE UPDATE ON "EventTicketType"
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_purchase_updated_at
    BEFORE UPDATE ON "Purchase"
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Save previous event state before UPDATE
CREATE OR REPLACE FUNCTION save_event_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "EventHistory" (
        "id_event", "eventName", "id_category",
        "description", "location", "date_time"
    ) VALUES (
        OLD."id_event", OLD."eventName", OLD."id_category",
        OLD."description", OLD."location", OLD."date_time"
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_history
    BEFORE UPDATE ON "Event"
    FOR EACH ROW EXECUTE FUNCTION save_event_history();

-- Save previous EventTicketType state before UPDATE
CREATE OR REPLACE FUNCTION save_ett_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "EventTicketTypeHistory" (
        "id_event_ticket", "id_event", "id_catalog", "price", "capacity"
    ) VALUES (
        OLD."id_event_ticket", OLD."id_event", OLD."id_catalog",
        OLD."price", OLD."capacity"
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ett_history
    BEFORE UPDATE ON "EventTicketType"
    FOR EACH ROW EXECUTE FUNCTION save_ett_history();

-- Guard: prevent reducing capacity below already-sold quantity.
-- Fires on UPDATE of EventTicketType when capacity changes.
CREATE OR REPLACE FUNCTION check_ett_capacity_reduction()
RETURNS TRIGGER AS $$
DECLARE
    v_sold INTEGER;
BEGIN
    -- Only enforce when capacity is being lowered
    IF NEW."capacity" >= OLD."capacity" THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM("quantity"), 0) INTO v_sold
    FROM "Purchase"
    WHERE "id_event_ticket" = OLD."id_event_ticket"
      AND "status" = 'completed';

    IF NEW."capacity" < v_sold THEN
        RAISE EXCEPTION
            'Cannot reduce capacity below tickets already sold. Sold: %, Requested capacity: %',
            v_sold, NEW."capacity";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ett_capacity_guard
    BEFORE UPDATE ON "EventTicketType"
    FOR EACH ROW EXECUTE FUNCTION check_ett_capacity_reduction();

-- Guard: prevent removing (soft-deleting) an EventTicketType that has sold tickets.
CREATE OR REPLACE FUNCTION check_ett_softdelete()
RETURNS TRIGGER AS $$
DECLARE
    v_sold INTEGER;
BEGIN
    -- Only care when deleted_at transitions from NULL to a value
    IF OLD."deleted_at" IS NOT NULL OR NEW."deleted_at" IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM("quantity"), 0) INTO v_sold
    FROM "Purchase"
    WHERE "id_event_ticket" = OLD."id_event_ticket"
      AND "status" = 'completed';

    IF v_sold > 0 THEN
        RAISE EXCEPTION
            'Cannot remove a ticket type that already has % ticket(s) sold.', v_sold;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ett_softdelete_guard
    BEFORE UPDATE ON "EventTicketType"
    FOR EACH ROW EXECUTE FUNCTION check_ett_softdelete();

-- Guard: validate capacity before inserting or updating a purchase.
-- Also blocks purchases on non-active events (deleted or past).
CREATE OR REPLACE FUNCTION check_purchase_rules()
RETURNS TRIGGER AS $$
DECLARE
    v_capacity   INTEGER;
    v_sold       INTEGER;
    v_date_time  TIMESTAMP;
    v_deleted_at TIMESTAMP;
BEGIN
    IF NEW."status" = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- 1. Event must be active (not deleted, not past)
    SELECT "date_time", "deleted_at"
      INTO v_date_time, v_deleted_at
      FROM "Event"
     WHERE "id_event" = NEW."id_event";

    IF v_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Event is deleted and cannot accept purchases.';
    END IF;

    IF v_date_time <= NOW() THEN
        RAISE EXCEPTION 'Event has already taken place and cannot accept purchases.';
    END IF;

    -- 2. Capacity check per ticket tier
    SELECT "capacity" INTO v_capacity
      FROM "EventTicketType"
     WHERE "id_event_ticket" = NEW."id_event_ticket";

    SELECT COALESCE(SUM("quantity"), 0) INTO v_sold
      FROM "Purchase"
     WHERE "id_event_ticket" = NEW."id_event_ticket"
       AND "status"          = 'completed'
       AND "id_purchase"    <> COALESCE(NEW."id_purchase", -1);

    IF (v_sold + NEW."quantity") > v_capacity THEN
        RAISE EXCEPTION
            'Not enough tickets available. Capacity: %, Sold: %, Requested: %',
            v_capacity, v_sold, NEW."quantity";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_rules
    BEFORE INSERT OR UPDATE ON "Purchase"
    FOR EACH ROW EXECUTE FUNCTION check_purchase_rules();

-- ============================================================
-- VIEWS
-- ============================================================

-- Computed event status (used by all other views)
-- active    = not deleted, date_time > NOW()
-- completed = not deleted, date_time <= NOW() - 1 day
-- deleted   = deleted_at IS NOT NULL
CREATE OR REPLACE VIEW v_event_status AS
SELECT
    "id_event",
    CASE
        WHEN "deleted_at" IS NOT NULL                          THEN 'deleted'
        WHEN "date_time" > NOW()                               THEN 'active'
        WHEN "date_time" <= (NOW() - INTERVAL '1 day')         THEN 'completed'
        ELSE 'pending_completion'   -- within the 1-day grace window
    END AS "status"
FROM "Event";

-- Active events (public + client pages)
CREATE OR REPLACE VIEW v_events AS
SELECT
    e."id_event",
    e."eventName"   AS "event_name",
    e."description",
    e."location",
    e."date_time",
    e."created_at",
    c."id_category",
    c."categoryName"  AS "category_name",
    MIN(ett."price")  AS "min_price",
    MAX(ett."price")  AS "max_price",
    SUM(ett."capacity") AS "total_capacity",
    (
        SELECT "image_url"
        FROM "EventImage"
        WHERE "id_event" = e."id_event" AND "type" = 'poster'
        LIMIT 1
    ) AS "image_url"
FROM "Event" e
JOIN "Category"       c   ON e."id_category" = c."id_category"
LEFT JOIN "EventTicketType" ett ON ett."id_event"   = e."id_event"
                                AND ett."deleted_at" IS NULL
WHERE e."deleted_at" IS NULL
  AND e."date_time"  > NOW()
GROUP BY e."id_event", e."eventName", e."description",
         e."location", e."date_time", e."created_at",
         c."id_category", c."categoryName";

-- Completed events (historical view, no purchase options)
CREATE OR REPLACE VIEW v_events_completed AS
SELECT
    e."id_event",
    e."eventName"   AS "event_name",
    e."description",
    e."location",
    e."date_time",
    c."categoryName" AS "category_name",
    (
        SELECT "image_url"
        FROM "EventImage"
        WHERE "id_event" = e."id_event" AND "type" = 'poster'
        LIMIT 1
    ) AS "image_url"
FROM "Event" e
JOIN "Category" c ON e."id_category" = c."id_category"
WHERE e."deleted_at" IS NULL
  AND e."date_time" <= (NOW() - INTERVAL '1 day');

-- Active ticket types per event with sold/remaining counts
CREATE OR REPLACE VIEW v_event_ticket_types AS
SELECT
    ett."id_event_ticket",
    ett."id_event",
    e."eventName"        AS "event_name",
    ett."id_catalog",
    ttc."typeName"       AS "type_name",
    ett."price",
    ett."capacity",
    COALESCE(sold.qty, 0)::INT                           AS "tickets_sold",
    (ett."capacity" - COALESCE(sold.qty, 0))::INT        AS "tickets_remaining",
    CASE WHEN (ett."capacity" - COALESCE(sold.qty, 0)) <= 0
         THEN TRUE ELSE FALSE END                        AS "sold_out",
    ett."created_at"
FROM "EventTicketType" ett
JOIN "Event"           e   ON ett."id_event"   = e."id_event"
JOIN "TicketTypeCatalog" ttc ON ett."id_catalog" = ttc."id_catalog"
LEFT JOIN (
    SELECT "id_event_ticket", SUM("quantity") AS qty
    FROM "Purchase"
    WHERE "status" = 'completed'
    GROUP BY "id_event_ticket"
) sold ON sold."id_event_ticket" = ett."id_event_ticket"
WHERE ett."deleted_at" IS NULL
  AND e."deleted_at"   IS NULL;

-- Active categories
CREATE OR REPLACE VIEW v_categories AS
SELECT "id_category", "categoryName", "created_at"
FROM "Category"
WHERE "deleted_at" IS NULL;

-- Global ticket type catalog (active entries only)
CREATE OR REPLACE VIEW v_ticket_catalog AS
SELECT "id_catalog", "typeName", "created_at"
FROM "TicketTypeCatalog"
WHERE "deleted_at" IS NULL;

-- Interest ranking (RF-002.2)
CREATE OR REPLACE VIEW v_interest_report AS
SELECT
    e."eventName"               AS "event_name",
    COUNT(i."id_interest")::INT AS "interest_count"
FROM "Event" e
LEFT JOIN "Interest" i ON e."id_event" = i."id_event"
WHERE e."deleted_at" IS NULL
GROUP BY e."id_event", e."eventName"
ORDER BY "interest_count" DESC;

-- User favorites
CREATE OR REPLACE VIEW v_user_favorites AS
SELECT
    u."id_user",
    u."email",
    u."full_name",
    e."id_event",
    e."eventName"    AS "event_name",
    e."description",
    e."location",
    e."date_time",
    c."categoryName" AS "category_name",
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

-- Purchase detail (includes ticket type name)
CREATE OR REPLACE VIEW v_purchases AS
SELECT
    p."id_purchase",
    p."quantity",
    p."unit_price",
    p."total_price",
    p."status",
    p."qr_code",
    p."created_at",
    p."updated_at",
    u."id_user",
    u."email",
    u."full_name",
    e."id_event",
    e."eventName"    AS "event_name",
    e."location",
    e."date_time",
    c."categoryName" AS "category_name",
    ett."id_event_ticket",
    ttc."typeName"   AS "ticket_type_name",
    (
        SELECT "image_url"
        FROM "EventImage"
        WHERE "id_event" = e."id_event" AND "type" = 'poster'
        LIMIT 1
    ) AS "image_url"
FROM "Purchase" p
JOIN "User"             u   ON p."id_user"         = u."id_user"
JOIN "Event"            e   ON p."id_event"         = e."id_event"
JOIN "Category"         c   ON e."id_category"      = c."id_category"
JOIN "EventTicketType"  ett ON p."id_event_ticket"  = ett."id_event_ticket"
JOIN "TicketTypeCatalog" ttc ON ett."id_catalog"    = ttc."id_catalog"
WHERE u."deleted_at" IS NULL
  AND e."deleted_at" IS NULL
ORDER BY p."created_at" DESC;

-- Admin report: tickets sold per event, broken down by type
CREATE OR REPLACE VIEW v_event_sales_report AS
SELECT
    e."id_event",
    e."eventName"                         AS "event_name",
    c."categoryName"                      AS "category_name",
    ttc."typeName"                        AS "ticket_type_name",
    ett."capacity",
    COALESCE(SUM(p."quantity"), 0)::INT   AS "tickets_sold",
    (ett."capacity" - COALESCE(SUM(p."quantity"), 0))::INT AS "tickets_remaining",
    COALESCE(SUM(p."total_price"), 0)     AS "revenue"
FROM "Event" e
JOIN "Category"          c   ON e."id_category"  = c."id_category"
JOIN "EventTicketType"   ett ON ett."id_event"   = e."id_event"
                             AND ett."deleted_at" IS NULL
JOIN "TicketTypeCatalog" ttc ON ett."id_catalog" = ttc."id_catalog"
LEFT JOIN "Purchase" p ON p."id_event_ticket" = ett."id_event_ticket"
                       AND p."status" = 'completed'
WHERE e."deleted_at" IS NULL
GROUP BY e."id_event", e."eventName", c."categoryName",
         ttc."typeName", ett."capacity", ett."id_event_ticket"
ORDER BY e."id_event", "tickets_sold" DESC;

-- Admin home: company-wide KPIs
CREATE OR REPLACE VIEW v_admin_home_stats AS
SELECT
    -- Total revenue (all time, completed purchases)
    COALESCE(
        (SELECT SUM("total_price") FROM "Purchase" WHERE "status" = 'completed'),
        0
    ) AS "total_revenue",

    -- Active events
    (
        SELECT COUNT(*) FROM "Event"
        WHERE "deleted_at" IS NULL AND "date_time" > NOW()
    )::INT AS "active_events",

    -- Past / completed events
    (
        SELECT COUNT(*) FROM "Event"
        WHERE "deleted_at" IS NULL AND "date_time" <= (NOW() - INTERVAL '1 day')
    )::INT AS "completed_events",

    -- Registered non-admin users
    (
        SELECT COUNT(*) FROM "User" u
        JOIN "Role" r ON u."id_role" = r."id_role"
        WHERE u."deleted_at" IS NULL AND r."roleName" <> 'admin'
    )::INT AS "registered_users";

-- Top 3 best-selling active events (source of truth for Redis cache)
-- The backend reads from this view to warm / refresh the cache.
CREATE OR REPLACE VIEW v_top3_active_events AS
SELECT
    e."id_event",
    e."eventName"                         AS "event_name",
    e."location",
    e."date_time",
    c."categoryName"                      AS "category_name",
    COALESCE(SUM(p."quantity"), 0)::INT   AS "total_tickets_sold",
    COALESCE(SUM(p."total_price"), 0)     AS "total_revenue",
    (
        SELECT "image_url"
        FROM "EventImage"
        WHERE "id_event" = e."id_event" AND "type" = 'poster'
        LIMIT 1
    ) AS "image_url"
FROM "Event" e
JOIN "Category" c ON e."id_category" = c."id_category"
LEFT JOIN "EventTicketType"  ett ON ett."id_event" = e."id_event"
LEFT JOIN "Purchase"         p   ON p."id_event_ticket" = ett."id_event_ticket"
                                 AND p."status" = 'completed'
WHERE e."deleted_at" IS NULL
  AND e."date_time"  > NOW()
GROUP BY e."id_event", e."eventName", e."location", e."date_time", c."categoryName"
ORDER BY "total_tickets_sold" DESC
LIMIT 3;

-- ============================================================
-- SEED DATA - Roles only (minimum required for system boot)
-- ============================================================
INSERT INTO "Role" ("roleName") VALUES ('admin') ON CONFLICT DO NOTHING;
INSERT INTO "Role" ("roleName") VALUES ('user')  ON CONFLICT DO NOTHING;