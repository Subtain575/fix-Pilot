import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateGigCategoryRelationship1704067500000
  implements MigrationInterface
{
  name = 'UpdateGigCategoryRelationship1704067500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, create the gigs table if it doesn't exist (in case it wasn't created yet)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "gigs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "seller_id" character varying NOT NULL,
        "title" character varying NOT NULL,
        "photos" text array DEFAULT '{}',
        "shortDescription" text NOT NULL,
        "priceFrom" numeric(10,2) NOT NULL,
        "serviceArea" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gigs_id" PRIMARY KEY ("id")
      )
    `);

    // Add category_id column to gigs table (nullable initially)
    await queryRunner.query(`
      ALTER TABLE "gigs" 
      ADD COLUMN IF NOT EXISTS "category_id" uuid
    `);

    // Remove designation column if it exists
    await queryRunner.query(`
      ALTER TABLE "gigs" 
      DROP COLUMN IF EXISTS "designation"
    `);

    // Add foreign key constraint for category_id (nullable initially)
    await queryRunner.query(`
      ALTER TABLE "gigs" 
      ADD CONSTRAINT "FK_gigs_category_id" 
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") 
      ON DELETE CASCADE
    `);

    // Add foreign key constraint for seller_id
    await queryRunner.query(`
      ALTER TABLE "gigs" 
      ADD CONSTRAINT "FK_gigs_seller_id" 
      FOREIGN KEY ("seller_id") REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_gigs_category_id" ON "gigs" ("category_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_gigs_seller_id" ON "gigs" ("seller_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_gigs_status" ON "gigs" ("status")
    `);

    console.log('✅ Gig-Category relationship updated successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "gigs" 
      DROP CONSTRAINT IF EXISTS "FK_gigs_category_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "gigs" 
      DROP CONSTRAINT IF EXISTS "FK_gigs_seller_id"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gigs_category_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gigs_seller_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gigs_status"
    `);

    // Add back designation column
    await queryRunner.query(`
      ALTER TABLE "gigs" 
      ADD COLUMN "designation" character varying
    `);

    // Remove category_id column
    await queryRunner.query(`
      ALTER TABLE "gigs" 
      DROP COLUMN IF EXISTS "category_id"
    `);

    console.log('✅ Gig-Category relationship reverted successfully');
  }
}
