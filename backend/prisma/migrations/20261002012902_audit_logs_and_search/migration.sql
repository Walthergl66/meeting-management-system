-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_LOGIN', 'USER_LOGOUT', 'MEETING_CREATED', 'MEETING_UPDATED', 'MEETING_CANCELLED', 'MEMBER_INVITED', 'MEMBER_REMOVED', 'TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED', 'DECISION_CREATED');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('USER', 'MEETING', 'TEAM', 'TASK', 'DECISION');

-- AlterTable
ALTER TABLE "decisions" ADD COLUMN     "search_vector" tsvector;

-- AlterTable
ALTER TABLE "meeting_notes" ADD COLUMN     "search_vector" tsvector;

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "search_vector" tsvector;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "search_vector" tsvector;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "search_vector" tsvector;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" "AuditEntity" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "decisions_search_vector_idx" ON "decisions" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "meeting_notes_search_vector_idx" ON "meeting_notes" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "meetings_search_vector_idx" ON "meetings" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "tasks_search_vector_idx" ON "tasks" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "users_search_vector_idx" ON "users" USING GIN ("search_vector");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Search full-text (FASE 12). Prisma no gestiona triggers: se maintainen aqui.
-- El vector se recalcula en cada INSERT/UPDATE para que el indice GIN no quede obsoleto.

CREATE OR REPLACE FUNCTION search_vector_meetings() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('spanish', coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description ON meetings
  FOR EACH ROW EXECUTE FUNCTION search_vector_meetings();

CREATE OR REPLACE FUNCTION search_vector_notes() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish', coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meeting_notes_search_vector_trigger
  BEFORE INSERT OR UPDATE OF content ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION search_vector_notes();

CREATE OR REPLACE FUNCTION search_vector_decisions() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('spanish', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decisions_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content ON decisions
  FOR EACH ROW EXECUTE FUNCTION search_vector_decisions();

CREATE OR REPLACE FUNCTION search_vector_tasks() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('spanish', coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description ON tasks
  FOR EACH ROW EXECUTE FUNCTION search_vector_tasks();

CREATE OR REPLACE FUNCTION search_vector_users() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish', coalesce(NEW.name, '') || ' ' || coalesce(NEW.email, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, email ON users
  FOR EACH ROW EXECUTE FUNCTION search_vector_users();

-- Backfill de los registros que ya existian antes de los triggers.
UPDATE meetings SET title = title;
UPDATE meeting_notes SET content = content;
UPDATE decisions SET title = title;
UPDATE tasks SET title = title;
UPDATE users SET name = name;
