import { MigrationInterface, QueryRunner } from 'typeorm';

export class DataSync1704067400000 implements MigrationInterface {
  name = 'DataSync1704067400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration handles data synchronization from local to live

    // 1. Add new categories if they don't exist
    await queryRunner.query(`
      INSERT INTO "categories" ("name") VALUES
      ('Blockchain Development'),
      ('Game Development'),
      ('Cybersecurity')
      ON CONFLICT ("name") DO UPDATE SET 
        "updatedAt" = now()
    `);

    // 2. Sync user data (example - adjust based on your needs)
    await queryRunner.query(`
      -- Update user active status
      UPDATE "users" 
      SET "isActive" = true 
      WHERE "email" LIKE '%@gmail.com' OR "email" LIKE '%@yahoo.com'
    `);

    // 3. Clean up orphaned or invalid data (skip for now as gigs table may not exist yet)
    // This can be uncommented later when gigs table is created
    /*
    await queryRunner.query(`
      -- Remove categories with no associated gigs (if applicable)
      DELETE FROM "categories" 
      WHERE "id" NOT IN (
        SELECT DISTINCT "categoryId" FROM "gigs" WHERE "categoryId" IS NOT NULL
      ) AND "name" NOT IN (
        'Web Development', 'Mobile Development', 'UI/UX Design', 
        'Digital Marketing', 'Content Writing', 'Data Science', 'DevOps',
        'Blockchain Development', 'Game Development', 'Cybersecurity'
      )
    `);
    */

    // 4. Update timestamps for data freshness
    await queryRunner.query(`
      UPDATE "categories" SET "updatedAt" = now()
    `);

    console.log('✅ Data synchronization completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert data sync changes
    await queryRunner.query(`
      DELETE FROM "categories" WHERE "name" IN (
        'Blockchain Development', 'Game Development', 'Cybersecurity'
      )
    `);

    // No additional revert needed for categories

    console.log('✅ Data sync reverted successfully');
  }
}
