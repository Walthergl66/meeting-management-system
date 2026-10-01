-- DropForeignKey
ALTER TABLE "decisions" DROP CONSTRAINT "decisions_meeting_id_fkey";

-- DropForeignKey
ALTER TABLE "meeting_notes" DROP CONSTRAINT "meeting_notes_meeting_id_fkey";

-- AlterTable
ALTER TABLE "decisions" ALTER COLUMN "meeting_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "meeting_notes" ALTER COLUMN "meeting_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "meeting_notes" ADD CONSTRAINT "meeting_notes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
