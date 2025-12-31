import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCategoriesTable1704067800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to categories table (only if they don't exist)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='categories' AND column_name='parent_category_name') THEN
          ALTER TABLE "categories" ADD COLUMN "parent_category_name" VARCHAR(100);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='categories' AND column_name='description') THEN
          ALTER TABLE "categories" ADD COLUMN "description" TEXT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='categories' AND column_name='help_text_for_buyers') THEN
          ALTER TABLE "categories" ADD COLUMN "help_text_for_buyers" TEXT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='categories' AND column_name='icon') THEN
          ALTER TABLE "categories" ADD COLUMN "icon" VARCHAR(255);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='categories' AND column_name='minimum_price') THEN
          ALTER TABLE "categories" ADD COLUMN "minimum_price" DECIMAL(10,2);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='categories' AND column_name='maximum_price') THEN
          ALTER TABLE "categories" ADD COLUMN "maximum_price" DECIMAL(10,2);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='categories' AND column_name='suggested_base_price') THEN
          ALTER TABLE "categories" ADD COLUMN "suggested_base_price" DECIMAL(10,2);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='categories' AND column_name='platform_commission_rate') THEN
          ALTER TABLE "categories" ADD COLUMN "platform_commission_rate" DECIMAL(5,2);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='categories' AND column_name='default_service_radius') THEN
          ALTER TABLE "categories" ADD COLUMN "default_service_radius" INTEGER;
        END IF;
      END $$;
    `);

    // Add index for better performance (only if it doesn't exist)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_categories_parent_name" ON "categories" ("parent_category_name")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_categories_icon" ON "categories" ("icon")
    `);

    console.log('✅ Categories table updated successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_categories_parent_name"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_categories_icon"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "parent_category_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "description"
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "help_text_for_buyers"
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "icon"
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "minimum_price"
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "maximum_price"
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "suggested_base_price"
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "platform_commission_rate"
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "default_service_radius"
    `);
  }
}
