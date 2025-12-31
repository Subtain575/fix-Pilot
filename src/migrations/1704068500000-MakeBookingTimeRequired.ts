import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  fetchRows,
  getNumberValue,
  getStringValue,
} from './utils/query-result.util.js';

export class MakeBookingTimeRequired1704068500000
  implements MigrationInterface
{
  name = 'MakeBookingTimeRequired1704068500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if bookings table exists
      const tableExists = await fetchRows(
        queryRunner,
        `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bookings'
      `,
      );

      if (tableExists.length === 0) {
        console.log('✅ Bookings table does not exist, skipping migration');
        return;
      }

      // Check if endTime column exists
      const endTimeColumnExists = await fetchRows(
        queryRunner,
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'endTime'
      `,
      );

      // Add endTime column if it doesn't exist
      if (endTimeColumnExists.length === 0) {
        await queryRunner.query(`
          ALTER TABLE "bookings" 
          ADD COLUMN "endTime" varchar
        `);
        console.log('✅ Added endTime column to bookings table');
      }

      // Check for NULL values in bookingTime
      const nullBookingTimeCount = await fetchRows(
        queryRunner,
        `
        SELECT COUNT(*) as count 
        FROM "bookings" 
        WHERE "bookingTime" IS NULL
      `,
      );

      const bookingTimeNullCount = getNumberValue(
        nullBookingTimeCount[0],
        'count',
      );

      if (bookingTimeNullCount > 0) {
        console.log(
          `⚠️ Found ${bookingTimeNullCount} bookings with NULL bookingTime, updating...`,
        );
        // Update existing NULL values in bookingTime to a default value
        await queryRunner.query(`
          UPDATE "bookings" 
          SET "bookingTime" = '09:00 AM' 
          WHERE "bookingTime" IS NULL
        `);
        console.log('✅ Updated NULL bookingTime values');
      }

      // Check for NULL values in endTime
      const nullEndTimeCount = await fetchRows(
        queryRunner,
        `
        SELECT COUNT(*) as count 
        FROM "bookings" 
        WHERE "endTime" IS NULL
      `,
      );

      const endTimeNullCount = getNumberValue(nullEndTimeCount[0], 'count');

      if (endTimeNullCount > 0) {
        console.log(
          `⚠️ Found ${endTimeNullCount} bookings with NULL endTime, updating...`,
        );
        // Update existing NULL values in endTime to a default value
        await queryRunner.query(`
          UPDATE "bookings" 
          SET "endTime" = '05:00 PM' 
          WHERE "endTime" IS NULL
        `);
        console.log('✅ Updated NULL endTime values');
      }

      // Check if columns are already NOT NULL
      const bookingTimeColumn = await fetchRows(
        queryRunner,
        `
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'bookingTime'
      `,
      );

      if (
        bookingTimeColumn.length > 0 &&
        getStringValue(bookingTimeColumn[0], 'is_nullable') === 'YES'
      ) {
        // Make bookingTime NOT NULL
        await queryRunner.query(`
          ALTER TABLE "bookings" 
          ALTER COLUMN "bookingTime" SET NOT NULL
        `);
        console.log('✅ Made bookingTime NOT NULL');
      } else {
        console.log('ℹ️ bookingTime is already NOT NULL');
      }

      const endTimeColumn = await fetchRows(
        queryRunner,
        `
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'endTime'
      `,
      );

      if (
        endTimeColumn.length > 0 &&
        getStringValue(endTimeColumn[0], 'is_nullable') === 'YES'
      ) {
        // Make endTime NOT NULL
        await queryRunner.query(`
          ALTER TABLE "bookings" 
          ALTER COLUMN "endTime" SET NOT NULL
        `);
        console.log('✅ Made endTime NOT NULL');
      } else {
        console.log('ℹ️ endTime is already NOT NULL');
      }

      console.log('✅ Migration completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert bookingTime to nullable
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "bookingTime" DROP NOT NULL
    `);

    // Revert endTime to nullable
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "endTime" DROP NOT NULL
    `);

    console.log('✅ Reverted bookingTime and endTime to nullable');
  }
}
