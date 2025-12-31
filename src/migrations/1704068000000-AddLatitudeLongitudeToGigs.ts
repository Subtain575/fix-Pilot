import { MigrationInterface, QueryRunner } from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class AddLatitudeLongitudeToGigs1704068000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if latitude column exists before adding
    const latitudeColumnExists = await fetchRows(
      queryRunner,
      `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gigs' AND column_name = 'latitude'
    `,
    );

    if (latitudeColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "gigs" 
        ADD COLUMN "latitude" DECIMAL(10,8) NULL
      `);
    }

    // Check if longitude column exists before adding
    const longitudeColumnExists = await fetchRows(
      queryRunner,
      `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gigs' AND column_name = 'longitude'
    `,
    );

    if (longitudeColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "gigs" 
        ADD COLUMN "longitude" DECIMAL(11,8) NULL
      `);
    }

    // Add indexes for better performance on location queries
    // Check if indexes exist before creating
    const latitudeIndexExists = await fetchRows(
      queryRunner,
      `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'gigs' AND indexname = 'IDX_gigs_latitude'
    `,
    );

    if (latitudeIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_gigs_latitude" ON "gigs" ("latitude")
      `);
    }

    const longitudeIndexExists = await fetchRows(
      queryRunner,
      `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'gigs' AND indexname = 'IDX_gigs_longitude'
    `,
    );

    if (longitudeIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_gigs_longitude" ON "gigs" ("longitude")
      `);
    }

    const locationIndexExists = await fetchRows(
      queryRunner,
      `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'gigs' AND indexname = 'IDX_gigs_location'
    `,
    );

    if (locationIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_gigs_location" ON "gigs" ("latitude", "longitude")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if indexes exist before dropping
    const locationIndexExists = await fetchRows(
      queryRunner,
      `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'gigs' AND indexname = 'IDX_gigs_location'
    `,
    );

    if (locationIndexExists.length > 0) {
      await queryRunner.query(`
        DROP INDEX "IDX_gigs_location"
      `);
    }

    const longitudeIndexExists = await fetchRows(
      queryRunner,
      `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'gigs' AND indexname = 'IDX_gigs_longitude'
    `,
    );

    if (longitudeIndexExists.length > 0) {
      await queryRunner.query(`
        DROP INDEX "IDX_gigs_longitude"
      `);
    }

    const latitudeIndexExists = await fetchRows(
      queryRunner,
      `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'gigs' AND indexname = 'IDX_gigs_latitude'
    `,
    );

    if (latitudeIndexExists.length > 0) {
      await queryRunner.query(`
        DROP INDEX "IDX_gigs_latitude"
      `);
    }

    // Check if columns exist before dropping
    const longitudeColumnExists = await fetchRows(
      queryRunner,
      `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gigs' AND column_name = 'longitude'
    `,
    );

    if (longitudeColumnExists.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "gigs" 
        DROP COLUMN "longitude"
      `);
    }

    const latitudeColumnExists = await fetchRows(
      queryRunner,
      `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gigs' AND column_name = 'latitude'
    `,
    );

    if (latitudeColumnExists.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "gigs" 
        DROP COLUMN "latitude"
      `);
    }
  }
}
