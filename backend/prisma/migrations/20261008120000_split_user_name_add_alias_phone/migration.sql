-- Divide `name` en first_name/last_name y agrega alias y phone (con backfill).

ALTER TABLE "users" ADD COLUMN "first_name" TEXT;
ALTER TABLE "users" ADD COLUMN "last_name" TEXT DEFAULT '';
ALTER TABLE "users" ADD COLUMN "alias" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;

-- Backfill de las filas existentes: el primer token de `name` va a first_name, el
-- resto a last_name; el alias se deriva del correo y el celular es un marcador.
UPDATE "users" SET
  "first_name" = CASE
    WHEN strpos("name", ' ') > 0 THEN split_part("name", ' ', 1)
    ELSE "name"
  END,
  "last_name" = CASE
    WHEN strpos("name", ' ') > 0 THEN substr("name", strpos("name", ' ') + 1)
    ELSE ''
  END,
  "alias" = CASE
    WHEN left(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9._-]', '_', 'g'), 30) = ''
      THEN 'usuario'
    ELSE left(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9._-]', '_', 'g'), 30)
  END,
  "phone" = '+1' || (100000000 + floor(random() * 900000000))::text;

ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "alias" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;

-- El trigger del search vector dependía de la columna `name`; se recrea sobre
-- las columnas nuevas antes de eliminar `name`.
DROP TRIGGER IF EXISTS users_search_vector_trigger ON "users";

CREATE OR REPLACE FUNCTION search_vector_users() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'spanish',
    coalesce(NEW.first_name, '') || ' ' ||
    coalesce(NEW.last_name, '') || ' ' ||
    coalesce(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_search_vector_trigger
BEFORE INSERT OR UPDATE OF first_name, last_name, email ON "users"
FOR EACH ROW EXECUTE FUNCTION search_vector_users();

ALTER TABLE "users" DROP COLUMN "name";

CREATE UNIQUE INDEX "users_alias_key" ON "users"("alias");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");