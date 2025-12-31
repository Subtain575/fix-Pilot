import { MigrationInterface, QueryRunner } from 'typeorm';
import { fetchRows, getStringValue } from './utils/query-result.util.js';

export class RemoveCountriesAddIsReadToNotifications1704084000000
  implements MigrationInterface
{
  name = 'RemoveCountriesAddIsReadToNotifications1704084000000';

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
          'ℹ️ notifications table does not exist, skipping RemoveCountriesAddIsReadToNotifications migration',
        );
        return;
      }

      // Step 1: Remove countries column if it exists
      const countriesColumnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'countries'
      `,
      );

      const existingCountriesColumn = getStringValue(
        countriesColumnInfo[0],
        'column_name',
      );

      if (existingCountriesColumn === 'countries') {
        await queryRunner.query(`
          ALTER TABLE "notifications"
          DROP COLUMN "countries"
        `);
        console.log('✅ Removed countries column from notifications table');
      } else {
        console.log(
          'ℹ️ countries column does not exist on notifications table, skipping drop',
        );
      }

      // Step 2: Add isRead column if it doesn't exist
      const isReadColumnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'isRead'
      `,
      );

      const existingIsReadColumn = getStringValue(
        isReadColumnInfo[0],
        'column_name',
      );

      if (existingIsReadColumn !== 'isRead') {
        await queryRunner.query(`
          ALTER TABLE "notifications"
          ADD COLUMN "isRead" boolean NOT NULL DEFAULT false
        `);
        console.log('✅ Added isRead column to notifications table');
      } else {
        console.log(
          'ℹ️ isRead column already exists on notifications table, skipping add column',
        );
      }
    } catch (error) {
      console.error(
        '❌ RemoveCountriesAddIsReadToNotifications migration failed:',
        error,
      );
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
          'ℹ️ notifications table does not exist, skipping RemoveCountriesAddIsReadToNotifications down migration',
        );
        return;
      }

      // Step 1: Remove isRead column if it exists
      const isReadColumnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'isRead'
      `,
      );

      const existingIsReadColumn = getStringValue(
        isReadColumnInfo[0],
        'column_name',
      );

      if (existingIsReadColumn === 'isRead') {
        await queryRunner.query(`
          ALTER TABLE "notifications"
          DROP COLUMN "isRead"
        `);
        console.log('✅ Removed isRead column from notifications table');
      } else {
        console.log(
          'ℹ️ isRead column does not exist on notifications table, skipping drop',
        );
      }

      // Step 2: Add countries column back if it doesn't exist
      const countriesColumnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'countries'
      `,
      );

      const existingCountriesColumn = getStringValue(
        countriesColumnInfo[0],
        'column_name',
      );

      if (existingCountriesColumn !== 'countries') {
        await queryRunner.query(`
          ALTER TABLE "notifications"
          ADD COLUMN "countries" varchar NULL
        `);
        console.log('✅ Added countries column back to notifications table');
      } else {
        console.log(
          'ℹ️ countries column already exists on notifications table, skipping add column',
        );
      }
    } catch (error) {
      console.error(
        '❌ RemoveCountriesAddIsReadToNotifications down migration failed:',
        error,
      );
      throw error;
    }
  }
}
