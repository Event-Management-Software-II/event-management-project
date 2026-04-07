CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "Role" ("roleName") VALUES ('admin') ON CONFLICT DO NOTHING;
INSERT INTO "Role" ("roleName") VALUES ('user')  ON CONFLICT DO NOTHING;

INSERT INTO "User" ("email", "password", "full_name", "id_role")
VALUES (
    'admin@eventos.com',
    crypt('admin123', gen_salt('bf', 10)),
    'Administrador',
    (SELECT "id_role" FROM "Role" WHERE "roleName" = 'admin')
) ON CONFLICT DO NOTHING;