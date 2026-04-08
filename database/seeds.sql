CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ROLES
-- ============================================================
INSERT INTO "Role" ("roleName") VALUES ('admin') ON CONFLICT DO NOTHING;
INSERT INTO "Role" ("roleName") VALUES ('user')  ON CONFLICT DO NOTHING;

-- ============================================================
-- USERS
-- ============================================================
INSERT INTO "User" ("email", "password", "full_name", "id_role")
VALUES (
    'admin@eventos.com',
    crypt('admin123', gen_salt('bf', 10)),
    'Administrador',
    (SELECT "id_role" FROM "Role" WHERE "roleName" = 'admin')
) ON CONFLICT DO NOTHING;

INSERT INTO "User" ("email", "password", "full_name", "id_role")
VALUES (
    'cliente@eventos.com',
    crypt('cliente123', gen_salt('bf', 10)),
    'Cliente Demo',
    (SELECT "id_role" FROM "Role" WHERE "roleName" = 'user')
) ON CONFLICT DO NOTHING;

-- ============================================================
-- CATEGORIES
-- ============================================================
INSERT INTO "Category" ("categoryName") VALUES ('Música')   ON CONFLICT DO NOTHING;
INSERT INTO "Category" ("categoryName") VALUES ('Teatro')   ON CONFLICT DO NOTHING;
INSERT INTO "Category" ("categoryName") VALUES ('Deportes') ON CONFLICT DO NOTHING;

-- ============================================================
-- GLOBAL TICKET TYPE CATALOG
-- These are reusable across all events.
-- ============================================================
INSERT INTO "TicketTypeCatalog" ("typeName") VALUES ('Oro')      ON CONFLICT DO NOTHING;
INSERT INTO "TicketTypeCatalog" ("typeName") VALUES ('Plata')    ON CONFLICT DO NOTHING;
INSERT INTO "TicketTypeCatalog" ("typeName") VALUES ('VIP')      ON CONFLICT DO NOTHING;
INSERT INTO "TicketTypeCatalog" ("typeName") VALUES ('General')  ON CONFLICT DO NOTHING;

-- ============================================================
-- EVENTS
-- ============================================================
INSERT INTO "Event" ("eventName", "id_category", "description", "location", "date_time")
VALUES (
    'Concierto A',
    (SELECT "id_category" FROM "Category" WHERE "categoryName" = 'Música'),
    'Gran concierto con artistas internacionales y nacionales de primer nivel.',
    'Coliseo El Campín, Bogotá',
    NOW() + INTERVAL '30 days'
) ON CONFLICT DO NOTHING;

INSERT INTO "Event" ("eventName", "id_category", "description", "location", "date_time")
VALUES (
    'Concierto B',
    (SELECT "id_category" FROM "Category" WHERE "categoryName" = 'Música'),
    'Noche de jazz y blues con los mejores músicos de la región andina.',
    'Teatro Mayor Julio Mario Santo Domingo, Bogotá',
    NOW() + INTERVAL '45 days'
) ON CONFLICT DO NOTHING;

INSERT INTO "Event" ("eventName", "id_category", "description", "location", "date_time")
VALUES (
    'Concierto C',
    (SELECT "id_category" FROM "Category" WHERE "categoryName" = 'Música'),
    'Festival de música electrónica con DJs internacionales y producción de lujo.',
    'Parque Simón Bolívar, Bogotá',
    NOW() + INTERVAL '60 days'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- EVENT TICKET TYPES
-- Concierto A: Oro-100, Plata-100
-- Concierto B: VIP-10,  General-100
-- Concierto C: Oro-100, VIP-10
-- ============================================================

-- Concierto A
INSERT INTO "EventTicketType" ("id_event", "id_catalog", "price", "capacity")
VALUES (
    (SELECT "id_event" FROM "Event" WHERE "eventName" = 'Concierto A'),
    (SELECT "id_catalog" FROM "TicketTypeCatalog" WHERE "typeName" = 'Oro'),
    150000, 100
) ON CONFLICT DO NOTHING;

INSERT INTO "EventTicketType" ("id_event", "id_catalog", "price", "capacity")
VALUES (
    (SELECT "id_event" FROM "Event" WHERE "eventName" = 'Concierto A'),
    (SELECT "id_catalog" FROM "TicketTypeCatalog" WHERE "typeName" = 'Plata'),
    80000, 100
) ON CONFLICT DO NOTHING;

-- Concierto B
INSERT INTO "EventTicketType" ("id_event", "id_catalog", "price", "capacity")
VALUES (
    (SELECT "id_event" FROM "Event" WHERE "eventName" = 'Concierto B'),
    (SELECT "id_catalog" FROM "TicketTypeCatalog" WHERE "typeName" = 'VIP'),
    300000, 10
) ON CONFLICT DO NOTHING;

INSERT INTO "EventTicketType" ("id_event", "id_catalog", "price", "capacity")
VALUES (
    (SELECT "id_event" FROM "Event" WHERE "eventName" = 'Concierto B'),
    (SELECT "id_catalog" FROM "TicketTypeCatalog" WHERE "typeName" = 'General'),
    60000, 100
) ON CONFLICT DO NOTHING;

-- Concierto C
INSERT INTO "EventTicketType" ("id_event", "id_catalog", "price", "capacity")
VALUES (
    (SELECT "id_event" FROM "Event" WHERE "eventName" = 'Concierto C'),
    (SELECT "id_catalog" FROM "TicketTypeCatalog" WHERE "typeName" = 'Oro'),
    200000, 100
) ON CONFLICT DO NOTHING;

INSERT INTO "EventTicketType" ("id_event", "id_catalog", "price", "capacity")
VALUES (
    (SELECT "id_event" FROM "Event" WHERE "eventName" = 'Concierto C'),
    (SELECT "id_catalog" FROM "TicketTypeCatalog" WHERE "typeName" = 'VIP'),
    400000, 10
) ON CONFLICT DO NOTHING;