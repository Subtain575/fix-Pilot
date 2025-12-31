import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1704067200000 implements MigrationInterface {
  name = 'InitialMigration1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration will be auto-generated based on your entities
    // Run: npm run migration:generate src/migrations/InitialMigration

    // Example: Create users table if not exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying,
        "password" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'buyer',
        "isActive" boolean NOT NULL DEFAULT false,
        "profileImage" character varying,
        "otp" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // Example: Create categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id")
      )
    `);

    // Add indexes for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_categories_name" ON "categories" ("name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
