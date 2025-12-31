import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class CreateConversationsTable1704079000000
  implements MigrationInterface
{
  name = 'CreateConversationsTable1704079000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if conversations table exists
      const conversationsTableExists = await fetchRows(
        queryRunner,
        `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'conversations'
      `,
      );

      if (conversationsTableExists.length === 0) {
        // Create conversations table
        await queryRunner.createTable(
          new Table({
            name: 'conversations',
            columns: [
              {
                name: 'id',
                type: 'uuid',
                isPrimary: true,
                generationStrategy: 'uuid',
                default: 'uuid_generate_v4()',
              },
              {
                name: 'sellerId',
                type: 'uuid',
                isNullable: false,
              },
              {
                name: 'buyerId',
                type: 'uuid',
                isNullable: false,
              },
              {
                name: 'gigId',
                type: 'uuid',
                isNullable: true,
              },
              {
                name: 'createdAt',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
          }),
          true,
        );

        // Add foreign keys for conversations
        await queryRunner.createForeignKey(
          'conversations',
          new TableForeignKey({
            columnNames: ['sellerId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );

        await queryRunner.createForeignKey(
          'conversations',
          new TableForeignKey({
            columnNames: ['buyerId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );

        await queryRunner.createForeignKey(
          'conversations',
          new TableForeignKey({
            columnNames: ['gigId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'gigs',
            onDelete: 'SET NULL',
          }),
        );

        // Create index for better performance
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "IDX_conversations_seller_buyer" ON "conversations" ("sellerId", "buyerId")
        `);

        console.log('✅ Created conversations table');
      } else {
        console.log('✅ Conversations table already exists, skipping creation');
      }
    } catch (error) {
      console.error('❌ CreateConversationsTable migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      const conversationsTable = await queryRunner.getTable('conversations');
      if (conversationsTable) {
        const foreignKeys = conversationsTable.foreignKeys;
        for (const fk of foreignKeys) {
          await queryRunner.dropForeignKey('conversations', fk);
        }
        await queryRunner.dropTable('conversations');
        console.log('✅ Dropped conversations table');
      }
    } catch (error) {
      console.error(
        '❌ CreateConversationsTable down migration failed:',
        error,
      );
      throw error;
    }
  }
}
