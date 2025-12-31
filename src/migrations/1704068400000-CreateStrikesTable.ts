import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class CreateStrikesTable1704068400000 implements MigrationInterface {
  name = 'CreateStrikesTable1704068400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if strikes table already exists
    const tableExists = await fetchRows(
      queryRunner,
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'strikes'
    `,
    );

    if (tableExists.length > 0) {
      console.log('✅ Strikes table already exists, skipping creation');
      return;
    }

    // Create enum type for strike type
    await queryRunner.query(`
      CREATE TYPE "strikes_type_enum" AS ENUM (
        'No Show',
        'Late Arrival',
        'Abuse / Misconduct',
        'Price Change',
        'Poor Service'
      )
    `);

    // Create strikes table
    await queryRunner.createTable(
      new Table({
        name: 'strikes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'seller_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'No Show',
              'Late Arrival',
              'Abuse / Misconduct',
              'Price Change',
              'Poor Service',
            ],
            enumName: 'strikes_type_enum',
          },
          {
            name: 'points',
            type: 'int',
            default: 0,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expiresAt',
            type: 'date',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create foreign key to sellers table
    await queryRunner.createForeignKey(
      'strikes',
      new TableForeignKey({
        columnNames: ['seller_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sellers',
        onDelete: 'CASCADE',
        name: 'FK_strikes_seller_id',
      }),
    );

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_strikes_seller_id" ON "strikes" ("seller_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_strikes_type" ON "strikes" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_strikes_created_at" ON "strikes" ("createdAt")
    `);

    console.log('✅ Strikes table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('strikes');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.name === 'FK_strikes_seller_id',
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('strikes', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('strikes', true);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "strikes_type_enum" CASCADE
    `);
  }
}
