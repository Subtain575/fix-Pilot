import { MigrationInterface, QueryRunner } from 'typeorm';
import { fetchRows, getStringValue } from './utils/query-result.util.js';

export class AddCityCountryToAddresses1704082000000
  implements MigrationInterface
{
  name = 'AddCityCountryToAddresses1704082000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if addresses table exists
      const tableExists = await fetchRows(
        queryRunner,
        `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'addresses'
      `,
      );

      if (tableExists.length === 0) {
        console.log(
          'ℹ️ addresses table does not exist, skipping AddCityCountryToAddresses migration',
        );
        return;
      }

      // Check if city column already exists
      const cityColumnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'addresses'
          AND column_name = 'city'
      `,
      );

      const existingCityColumn = getStringValue(
        cityColumnInfo[0],
        'column_name',
      );

      if (existingCityColumn !== 'city') {
        // Add city column (nullable varchar)
        await queryRunner.query(`
          ALTER TABLE "addresses"
          ADD COLUMN "city" varchar NULL
        `);
        console.log('✅ Added city column to addresses table');
      } else {
        console.log(
          'ℹ️ city column already exists on addresses table, skipping add column',
        );
      }

      // Check if country column already exists
      const countryColumnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'addresses'
          AND column_name = 'country'
      `,
      );

      const existingCountryColumn = getStringValue(
        countryColumnInfo[0],
        'column_name',
      );

      if (existingCountryColumn !== 'country') {
        // Add country column (nullable varchar)
        await queryRunner.query(`
          ALTER TABLE "addresses"
          ADD COLUMN "country" varchar NULL
        `);
        console.log('✅ Added country column to addresses table');
      } else {
        console.log(
          'ℹ️ country column already exists on addresses table, skipping add column',
        );
      }
    } catch (error) {
      console.error('❌ AddCityCountryToAddresses migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if addresses table exists
      const tableExists = await fetchRows(
        queryRunner,
        `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'addresses'
      `,
      );

      if (tableExists.length === 0) {
        console.log(
          'ℹ️ addresses table does not exist, skipping drop city/country columns',
        );
        return;
      }

      // Check if city column exists before dropping
      const cityColumnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'addresses'
          AND column_name = 'city'
      `,
      );

      const existingCityColumn = getStringValue(
        cityColumnInfo[0],
        'column_name',
      );

      if (existingCityColumn === 'city') {
        await queryRunner.query(`
          ALTER TABLE "addresses"
          DROP COLUMN "city"
        `);
        console.log('✅ Dropped city column from addresses table');
      }

      // Check if country column exists before dropping
      const countryColumnInfo = await fetchRows(
        queryRunner,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'addresses'
          AND column_name = 'country'
      `,
      );

      const existingCountryColumn = getStringValue(
        countryColumnInfo[0],
        'column_name',
      );

      if (existingCountryColumn === 'country') {
        await queryRunner.query(`
          ALTER TABLE "addresses"
          DROP COLUMN "country"
        `);
        console.log('✅ Dropped country column from addresses table');
      }
    } catch (error) {
      console.error(
        '❌ AddCityCountryToAddresses down migration failed:',
        error,
      );
      throw error;
    }
  }
}
