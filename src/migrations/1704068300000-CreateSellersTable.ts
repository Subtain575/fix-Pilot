import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class CreateSellersTable1704068300000 implements MigrationInterface {
  name = 'CreateSellersTable1704068300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if sellers table already exists
    const tableExists = await fetchRows(
      queryRunner,
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sellers'
    `,
    );

    if (tableExists.length > 0) {
      console.log('✅ Sellers table already exists, skipping creation');
      return;
    }

    // Create enum type for seller verification status
    await queryRunner.query(`
      CREATE TYPE "sellers_verification_seller_enum" AS ENUM (
        'pending',
        'approved',
        'rejected',
        'request_photo'
      )
    `);

    // Create sellers table
    await queryRunner.createTable(
      new Table({
        name: 'sellers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'verificationSeller',
            type: 'enum',
            enum: ['pending', 'approved', 'rejected', 'request_photo'],
            enumName: 'sellers_verification_seller_enum',
            default: "'pending'",
          },
          {
            name: 'reason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'adminNote',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'coachingNote',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'sellers',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'FK_sellers_user_id',
      }),
    );

    // Create index on userId for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_sellers_user_id" ON "sellers" ("userId")
    `);

    console.log('✅ Sellers table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('sellers');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.name === 'FK_sellers_user_id',
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('sellers', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('sellers', true);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "sellers_verification_seller_enum" CASCADE
    `);
  }
}
