import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  fetchRows,
  getStringValue,
  getNumberValue,
} from './utils/query-result.util.js';

export class MakeEndTimeNullable1704078000000 implements MigrationInterface {
  name = 'MakeEndTimeNullable1704078000000';

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

      if (endTimeColumn.length === 0) {
        console.log('ℹ️ endTime column does not exist, skipping migration');
        return;
      }

      const isNullable = getStringValue(endTimeColumn[0], 'is_nullable');

      if (isNullable === 'NO') {
        // Make endTime nullable
        await queryRunner.query(`
          ALTER TABLE "bookings" 
          ALTER COLUMN "endTime" DROP NOT NULL
        `);
        console.log('✅ Made endTime nullable');
      } else {
        console.log('ℹ️ endTime is already nullable');
      }

      console.log('✅ Migration completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check for NULL values in endTime before making it NOT NULL
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

    // Revert endTime to NOT NULL
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ALTER COLUMN "endTime" SET NOT NULL
    `);

    console.log('✅ Reverted endTime to NOT NULL');
  }
}
