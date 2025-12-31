import { MigrationInterface, QueryRunner } from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class RenameBookingTimeToStartTime1704068600000
  implements MigrationInterface
{
  name = 'RenameBookingTimeToStartTime1704068600000';

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

      // Check if bookingTime column exists
      const bookingTimeColumnExists = await fetchRows(
        queryRunner,
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'bookingTime'
      `,
      );

      // Check if startTime column already exists
      const startTimeColumnExists = await fetchRows(
        queryRunner,
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'startTime'
      `,
      );

      if (
        bookingTimeColumnExists.length > 0 &&
        startTimeColumnExists.length === 0
      ) {
        // Rename bookingTime column to startTime
        await queryRunner.query(`
          ALTER TABLE "bookings" 
          RENAME COLUMN "bookingTime" TO "startTime"
        `);
        console.log('✅ Renamed bookingTime column to startTime');
      } else if (startTimeColumnExists.length > 0) {
        console.log('ℹ️ startTime column already exists, skipping rename');
      } else {
        console.log('ℹ️ bookingTime column does not exist, skipping rename');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if startTime column exists
      const startTimeColumnExists = await fetchRows(
        queryRunner,
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'startTime'
      `,
      );

      // Check if bookingTime column already exists
      const bookingTimeColumnExists = await fetchRows(
        queryRunner,
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'bookingTime'
      `,
      );

      if (
        startTimeColumnExists.length > 0 &&
        bookingTimeColumnExists.length === 0
      ) {
        // Rename startTime column back to bookingTime
        await queryRunner.query(`
          ALTER TABLE "bookings" 
          RENAME COLUMN "startTime" TO "bookingTime"
        `);
        console.log('✅ Renamed startTime column back to bookingTime');
      } else {
        console.log('ℹ️ Column rename not needed for rollback');
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
}
