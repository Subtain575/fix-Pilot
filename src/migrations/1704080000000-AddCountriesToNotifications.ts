import { MigrationInterface, QueryRunner } from 'typeorm';
import { fetchRows, getStringValue } from './utils/query-result.util.js';

export class AddCountriesToNotifications1704080000000
  implements MigrationInterface
{
  name = 'AddCountriesToNotifications1704080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if notifications table exists
      const tableExists = await fetchRows(
        queryRunner,
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
      `,
      );

      if (tableExists.length === 0) {
        console.log(
          'ℹ️ notifications table does not exist, skipping AddCountriesToNotifications migration',
        );
        return;
      }

      // Check if countries column already exists
      const columnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'countries'
      `,
      );

      const existingColumn = getStringValue(columnInfo[0], 'column_name');

      if (existingColumn === 'countries') {
        console.log(
          'ℹ️ countries column already exists on notifications table, skipping add column',
        );
        return;
      }

      // Add countries column (nullable varchar)
      await queryRunner.query(`
        ALTER TABLE "notifications"
        ADD COLUMN "countries" varchar NULL
      `);

      console.log('✅ Added countries column to notifications table');
    } catch (error) {
      console.error('❌ AddCountriesToNotifications migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if notifications table exists
      const tableExists = await fetchRows(
        queryRunner,
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
      `,
      );

      if (tableExists.length === 0) {
        console.log(
          'ℹ️ notifications table does not exist, skipping drop countries column',
        );
        return;
      }

      // Check if countries column exists before dropping
      const columnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'countries'
      `,
      );

      const existingColumn = getStringValue(columnInfo[0], 'column_name');

      if (existingColumn !== 'countries') {
        console.log(
          'ℹ️ countries column does not exist on notifications table, skipping drop',
        );
        return;
      }

      await queryRunner.query(`
        ALTER TABLE "notifications"
        DROP COLUMN "countries"
      `);

      console.log('✅ Dropped countries column from notifications table');
    } catch (error) {
      console.error(
        '❌ AddCountriesToNotifications down migration failed:',
        error,
      );
      throw error;
    }
  }
}
