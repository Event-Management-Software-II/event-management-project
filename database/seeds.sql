-- ============================================================
-- SEEDS - Solo para desarrollo / staging
-- NO incluir en producción
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles base (requeridos para que el sistema funcione)
INSERT INTO "Role" ("nameRole") VALUES ('admin') ON CONFLICT DO NOTHING;
INSERT INTO "Role" ("nameRole") VALUES ('user')  ON CONFLICT DO NOTHING;

-- Usuario admin por defecto
-- Contraseña: admin123
INSERT INTO "User" ("email", "password", "fullName", "id_role")
VALUES (
    'admin@eventos.com',
    crypt('admin123', gen_salt('bf', 10)),
    'Administrador',
    (SELECT "id_role" FROM "Role" WHERE "nameRole" = 'admin')
) ON CONFLICT DO NOTHING;-- ============================================================
-- SEEDS - Solo para desarrollo / staging
-- NO incluir en producción
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles base (requeridos para que el sistema funcione)
INSERT INTO "Role" ("nameRole") VALUES ('admin') ON CONFLICT DO NOTHING;
INSERT INTO "Role" ("nameRole") VALUES ('user')  ON CONFLICT DO NOTHING;

-- Usuario admin por defecto
-- Contraseña: admin123
INSERT INTO "User" ("email", "password", "fullName", "id_role")
VALUES (
    'admin@eventos.com',
    crypt('admin123', gen_salt('bf', 10)),
    'Administrador',
    (SELECT "id_role" FROM "Role" WHERE "nameRole" = 'admin')
) ON CONFLICT DO NOTHING;