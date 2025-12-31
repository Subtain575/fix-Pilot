import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignDefaultCategories1704067600000
  implements MigrationInterface
{
  name = 'AssignDefaultCategories1704067600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, ensure we have a default category
    await queryRunner.query(`
      INSERT INTO "categories" ("name") VALUES
      ('General Services')
      ON CONFLICT ("name") DO NOTHING
    `);

    // Get the ID of the default category
    const defaultCategory = (await queryRunner.query(`
      SELECT "id" FROM "categories" WHERE "name" = 'General Services' LIMIT 1
    `)) as Array<{ id: string }>;

    if (defaultCategory && defaultCategory.length > 0) {
      const defaultCategoryId = defaultCategory[0].id;

      // Update all gigs that have null category_id to use the default category
      await queryRunner.query(
        `
        UPDATE "gigs" 
        SET "category_id" = $1 
        WHERE "category_id" IS NULL
      `,
        [defaultCategoryId],
      );

      console.log('✅ Assigned default category to existing gigs');
    }

    // Now we can make the category_id column NOT NULL
    await queryRunner.query(`
      ALTER TABLE "gigs" 
      ALTER COLUMN "category_id" SET NOT NULL
    `);

    console.log('✅ Made category_id column NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Make category_id nullable again
    await queryRunner.query(`
      ALTER TABLE "gigs" 
      ALTER COLUMN "category_id" DROP NOT NULL
    `);

    // Set category_id back to NULL for gigs that were using the default category
    await queryRunner.query(`
      UPDATE "gigs" 
      SET "category_id" = NULL 
      WHERE "category_id" IN (
        SELECT "id" FROM "categories" WHERE "name" = 'General Services'
      )
    `);

    // Remove the default category if it was created by this migration
    await queryRunner.query(`
      DELETE FROM "categories" WHERE "name" = 'General Services'
    `);

    console.log('✅ Reverted category assignments');
  }
}
