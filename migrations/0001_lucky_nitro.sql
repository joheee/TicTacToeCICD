ALTER TABLE "users" ADD COLUMN "wins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "losses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "draws" integer DEFAULT 0 NOT NULL;