import { MigrationInterface, QueryRunner } from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class UpdateBookingStatusEnum1704068100000
  implements MigrationInterface
{
  name = 'UpdateBookingStatusEnum1704068100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Check if bookings table exists
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

    // Step 2: Remove default value first (required before dropping enum)
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "status" DROP DEFAULT
    `);

    // Step 3: Temporarily change status column to varchar to allow enum modification
    // This allows us to update values that don't exist in the current enum
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "status" TYPE varchar USING "status"::varchar
    `);

    // Step 4: Update existing COMPLETED records to CONFIRMED (since completeJob tracks completion)
    await queryRunner.query(`
      UPDATE "bookings" 
      SET "status" = 'CONFIRMED' 
      WHERE "status" = 'COMPLETED'
    `);

    // Step 5: Update existing CANCELLED records to REJECT
    await queryRunner.query(`
      UPDATE "bookings" 
      SET "status" = 'REJECT' 
      WHERE "status" = 'CANCELLED'
    `);

    // Step 6: Drop the old enum type if it exists (now safe since default is removed)
    await queryRunner.query(`
      DROP TYPE IF EXISTS "bookings_status_enum" CASCADE
    `);

    // Step 7: Create new enum type with only PENDING, CONFIRMED, REJECT
    await queryRunner.query(`
      CREATE TYPE "bookings_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'REJECT')
    `);

    // Step 8: Ensure all status values are valid before converting back to enum
    // Update any invalid values to PENDING
    await queryRunner.query(`
      UPDATE "bookings" 
      SET "status" = 'PENDING' 
      WHERE "status" NOT IN ('PENDING', 'CONFIRMED', 'REJECT') 
        OR "status" IS NULL
    `);

    // Step 9: Change status column back to enum type
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "status" TYPE "bookings_status_enum" 
      USING "status"::"bookings_status_enum"
    `);

    // Step 10: Set default value
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "status" SET DEFAULT 'PENDING'
    `);

    console.log(
      '✅ Updated booking status enum: Removed COMPLETED, renamed CANCELLED to REJECT',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Remove default value first
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "status" DROP DEFAULT
    `);

    // Step 2: Change status column to varchar
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "status" TYPE varchar USING "status"::varchar
    `);

    // Step 3: Drop new enum
    await queryRunner.query(`
      DROP TYPE IF EXISTS "bookings_status_enum" CASCADE
    `);

    // Step 4: Create old enum type with all values
    await queryRunner.query(`
      CREATE TYPE "bookings_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')
    `);

    // Step 5: Update REJECT back to CANCELLED
    await queryRunner.query(`
      UPDATE "bookings" 
      SET "status" = 'CANCELLED' 
      WHERE "status" = 'REJECT'
    `);

    // Step 6: Change status column back to enum
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "status" TYPE "bookings_status_enum" 
      USING "status"::"bookings_status_enum"
    `);

    // Step 7: Set default
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "status" SET DEFAULT 'PENDING'
    `);
  }
}
