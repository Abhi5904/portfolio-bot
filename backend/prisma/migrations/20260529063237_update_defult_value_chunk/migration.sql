-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "chunk_size" SET DEFAULT 1500,
ALTER COLUMN "chunk_overlap" SET DEFAULT 200;
