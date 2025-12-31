import { MigrationInterface, QueryRunner } from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class AddCompletedStatusToBookings1704075000000
  implements MigrationInterface
{
  name = 'AddCompletedStatusToBookings1704075000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await fetchRows(
      queryRunner,
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = 'bookings'
      `,
    );

    if (tableExists.length === 0) {
      console.log('✅ Bookings table does not exist, skipping enum update');
      return;
    }

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" TYPE varchar USING "status"::varchar
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "bookings_status_enum" CASCADE
    `);

    await queryRunner.query(`
      CREATE TYPE "bookings_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'REJECT', 'COMPLETED')
    `);

    await queryRunner.query(`
      UPDATE "bookings"
      SET "status" = 'PENDING'
      WHERE "status" NOT IN ('PENDING', 'CONFIRMED', 'REJECT', 'COMPLETED')
        OR "status" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" TYPE "bookings_status_enum"
      USING "status"::"bookings_status_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" SET DEFAULT 'PENDING'
    `);

    console.log('✅ Added COMPLETED status back to bookings enum');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" TYPE varchar USING "status"::varchar
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "bookings_status_enum" CASCADE
    `);

    await queryRunner.query(`
      CREATE TYPE "bookings_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'REJECT')
    `);

    await queryRunner.query(`
      UPDATE "bookings"
      SET "status" = 'REJECT'
      WHERE "status" = 'COMPLETED'
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" TYPE "bookings_status_enum"
      USING "status"::"bookings_status_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" SET DEFAULT 'PENDING'
    `);

    console.log('↩️ Removed COMPLETED status from bookings enum');
  }
}
