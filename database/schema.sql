-- ============================================================
-- GESTOR DE EVENTOS - Software II
-- Soft delete con deleted_at TIMESTAMP (NULL = activo)
-- ============================================================

-- Tabla de roles
CREATE TABLE "Role" (
    "id_role"   SERIAL PRIMARY KEY,
    "nameRole"  VARCHAR(100) NOT NULL UNIQUE,
    "created_at" TIMESTAMP DEFAULT NOW()
);

-- Tabla de usuarios
CREATE TABLE "User" (
    "id_user"    SERIAL PRIMARY KEY,
    "email"      VARCHAR(255) NOT NULL UNIQUE,
    "password"   VARCHAR(255) NOT NULL,
    "fullName"   VARCHAR(255) NOT NULL,
    "id_role"    INTEGER NOT NULL REFERENCES "Role"("id_role"),
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW(),
    "deleted_at" TIMESTAMP DEFAULT NULL
);

-- Tabla de categorías
CREATE TABLE "Category" (
    "id_category"  SERIAL PRIMARY KEY,
    "nameCategory" VARCHAR(255) NOT NULL UNIQUE,
    "created_at"   TIMESTAMP DEFAULT NOW(),
    "updated_at"   TIMESTAMP DEFAULT NOW(),
    "deleted_at"   TIMESTAMP DEFAULT NULL
);

-- Tabla de eventos
CREATE TABLE "Event" (
    "id_event"    SERIAL PRIMARY KEY,
    "NameEvent"   VARCHAR(255) NOT NULL UNIQUE,
    "Id_category" INTEGER NOT NULL REFERENCES "Category"("id_category"),
    "value"       DOUBLE PRECISION NOT NULL DEFAULT 0
                    CHECK ("value" >= 0),
    "description" TEXT NOT NULL
                    CHECK (char_length("description") >= 20),
    "location"    VARCHAR(255) NOT NULL,
    "date_time"   TIMESTAMP,
    "created_at"  TIMESTAMP DEFAULT NOW(),
    "updated_at"  TIMESTAMP DEFAULT NOW(),
    "deleted_at"  TIMESTAMP DEFAULT NULL
);

-- Tabla de imágenes de eventos
CREATE TABLE "EventImage" (
    "id_image"  SERIAL PRIMARY KEY,
    "id_event"  INTEGER NOT NULL REFERENCES "Event"("id_event") ON DELETE CASCADE,
    "imageUrl"  VARCHAR(255) NOT NULL,
    "type"      VARCHAR(50) NOT NULL DEFAULT 'poster'
                  CHECK ("type" IN ('poster', 'banner', 'gallery'))
);

-- Tabla de historial de cambios (RF-001.3)
CREATE TABLE "EventHistory" (
    "id_history"  SERIAL PRIMARY KEY,
    "id_event"    INTEGER NOT NULL REFERENCES "Event"("id_event"),
    "NameEvent"   VARCHAR(255),
    "Id_category" INTEGER,
    "value"       DOUBLE PRECISION,
    "description" TEXT,
    "location"    VARCHAR(255),
    "date_time"   TIMESTAMP,
    "changed_at"  TIMESTAMP DEFAULT NOW()
);

-- Tabla de intereses de usuarios (RF-002)
CREATE TABLE "Interest" (
    "id_interest"      SERIAL PRIMARY KEY,
    "id_event"         INTEGER NOT NULL REFERENCES "Event"("id_event"),
    "user_identifier"  VARCHAR(255) NOT NULL,
    "created_at"       TIMESTAMP DEFAULT NOW(),
    UNIQUE ("id_event", "user_identifier")
);

-- Tabla de favoritos Usuario ↔ Evento
CREATE TABLE "UserEvent" (
    "id_favorite"  SERIAL PRIMARY KEY,
    "id_user"      INTEGER NOT NULL REFERENCES "User"("id_user") ON DELETE CASCADE,
    "id_event"     INTEGER NOT NULL REFERENCES "Event"("id_event") ON DELETE CASCADE,
    "created_at"   TIMESTAMP DEFAULT NOW(),
    UNIQUE ("id_user", "id_event")
);

CREATE INDEX idx_userevent_user  ON "UserEvent"("id_user");
CREATE INDEX idx_userevent_event ON "UserEvent"("id_event");

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Actualizar updated_at automáticamente
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

-- Guardar versión anterior antes de cada UPDATE (RF-001.3)
CREATE OR REPLACE FUNCTION save_event_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "EventHistory" (
        "id_event", "NameEvent", "Id_category", "value",
        "description", "location", "date_time"
    ) VALUES (
        OLD."id_event", OLD."NameEvent", OLD."Id_category", OLD."value",
        OLD."description", OLD."location", OLD."date_time"
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_history
    BEFORE UPDATE ON "Event"
    FOR EACH ROW EXECUTE FUNCTION save_event_history();

-- ============================================================
-- VIEWS
-- ============================================================

-- Eventos activos con categoría e imagen poster
CREATE OR REPLACE VIEW v_events AS
SELECT
    e."id_event",
    e."NameEvent",
    e."value",
    e."description",
    e."location",
    e."date_time",
    e."created_at",
    c."id_category",
    c."nameCategory",
    (
        SELECT "imageUrl"
        FROM "EventImage"
        WHERE "id_event" = e."id_event" AND "type" = 'poster'
        LIMIT 1
    ) AS "imageUrl"
FROM "Event" e
JOIN "Category" c ON e."Id_category" = c."id_category"
WHERE e."deleted_at" IS NULL;

-- Categorías activas
CREATE OR REPLACE VIEW v_categories AS
SELECT
    "id_category",
    "nameCategory",
    "created_at"
FROM "Category"
WHERE "deleted_at" IS NULL;

-- Ranking de intereses (RF-002.2)
CREATE OR REPLACE VIEW v_interest_report AS
SELECT
    e."NameEvent"               AS "Event Name",
    COUNT(i."id_interest")::INT AS "Number of Interests"
FROM "Event" e
LEFT JOIN "Interest" i ON e."id_event" = i."id_event"
WHERE e."deleted_at" IS NULL
GROUP BY e."id_event", e."NameEvent"
ORDER BY "Number of Interests" DESC;

-- Favoritos por usuario (solo eventos y usuarios activos)
CREATE OR REPLACE VIEW v_user_favorites AS
SELECT
    u."id_user",
    u."email",
    u."fullName",
    e."id_event",
    e."NameEvent",
    e."value",
    e."description",
    e."location",
    e."date_time",
    c."nameCategory",
    (
        SELECT "imageUrl"
        FROM "EventImage"
        WHERE "id_event" = e."id_event" AND "type" = 'poster'
        LIMIT 1
    ) AS "imageUrl",
    ue."created_at" AS "favorited_at"
FROM "UserEvent" ue
JOIN "User"     u ON ue."id_user"  = u."id_user"
JOIN "Event"    e ON ue."id_event" = e."id_event"
JOIN "Category" c ON e."Id_category" = c."id_category"
WHERE e."deleted_at" IS NULL
  AND u."deleted_at" IS NULL
ORDER BY ue."created_at" DESC;

-- ============================================================
-- DATOS INICIALES
-- ============================================================
INSERT INTO "Role" ("nameRole") VALUES ('admin') ON CONFLICT DO NOTHING;
INSERT INTO "Role" ("nameRole") VALUES ('user')  ON CONFLICT DO NOTHING;