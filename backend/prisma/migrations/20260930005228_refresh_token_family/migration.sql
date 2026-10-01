-- La familia agrupa los refresh tokens de una misma sesion: permite rotarlos
-- y detectar la reutilizacion de un token ya revocado.
-- Se agrega como columna opcional para poder poblar las filas existentes.
ALTER TABLE "refresh_tokens"
ADD COLUMN "tokenFamily" UUID;

-- Los tokens previos no son rotables porque no se conoce su familia de origen,
-- por lo que se revocan: cualquier sesion abierta antes de esta migracion
-- queda cerrada y el usuario debe iniciar sesion de nuevo.
UPDATE "refresh_tokens"
SET "revoked_at" = NOW()
WHERE "revoked_at" IS NULL;

-- Los tokens revocados se agrupan por usuario para que un login reutilizado
-- no arrastre sesiones ajenas.
WITH familias AS (
  SELECT "id" AS "user_id", gen_random_uuid() AS "family" FROM "users"
)
UPDATE "refresh_tokens" rt
SET "tokenFamily" = f."family"
FROM familias f
WHERE f."user_id" = rt."user_id";

ALTER TABLE "refresh_tokens"
ALTER COLUMN "tokenFamily" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "tokenFamily" SET NOT NULL;

CREATE INDEX "refresh_tokens_tokenFamily_idx" ON "refresh_tokens"("tokenFamily");
