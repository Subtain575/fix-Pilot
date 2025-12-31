CREATE TABLE IF NOT EXISTS "support_requests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" character varying NOT NULL,
  "email" character varying NOT NULL,
  "phone" character varying,
  "message" text NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_support_requests_id" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_support_requests_email" ON "support_requests" ("email");

