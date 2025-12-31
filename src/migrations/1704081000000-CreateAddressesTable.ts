import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class CreateAddressesTable1704081000000 implements MigrationInterface {
  name = 'CreateAddressesTable1704081000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if addresses table already exists
      const tableExists = await fetchRows(
        queryRunner,
        `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'addresses'
      `,
      );

      if (tableExists.length > 0) {
        console.log('✅ Addresses table already exists, skipping creation');
        return;
      }

      // Create addresses table
      await queryRunner.createTable(
        new Table({
          name: 'addresses',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'service_address',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'address_name',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'lat',
              type: 'decimal',
              precision: 10,
              scale: 8,
              isNullable: true,
            },
            {
              name: 'long',
              type: 'decimal',
              precision: 11,
              scale: 8,
              isNullable: true,
            },
            {
              name: 'postal_code',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'city',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'country',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Create index on created_at for better query performance
      await queryRunner.query(`
        CREATE INDEX "IDX_addresses_created_at" ON "addresses" ("created_at")
      `);

      console.log('✅ Addresses table created successfully');
    } catch (error) {
      console.error('❌ CreateAddressesTable migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Drop index
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_addresses_created_at"`,
      );

      // Drop table
      await queryRunner.dropTable('addresses', true);

      console.log('✅ Addresses table dropped successfully');
    } catch (error) {
      console.error('❌ CreateAddressesTable down migration failed:', error);
      throw error;
    }
  }
}
