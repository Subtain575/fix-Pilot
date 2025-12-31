import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class CreateMessagesTable1704079100000 implements MigrationInterface {
  name = 'CreateMessagesTable1704079100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if messages table exists
      const messagesTableExists = await fetchRows(
        queryRunner,
        `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'messages'
      `,
      );

      if (messagesTableExists.length === 0) {
        // Create messages table
        await queryRunner.createTable(
          new Table({
            name: 'messages',
            columns: [
              {
                name: 'id',
                type: 'uuid',
                isPrimary: true,
                generationStrategy: 'uuid',
                default: 'uuid_generate_v4()',
              },
              {
                name: 'roomId',
                type: 'uuid',
                isNullable: false,
              },
              {
                name: 'senderId',
                type: 'uuid',
                isNullable: false,
              },
              {
                name: 'message',
                type: 'text',
                isNullable: false,
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

        // Add foreign keys for messages
        await queryRunner.createForeignKey(
          'messages',
          new TableForeignKey({
            columnNames: ['roomId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'conversations',
            onDelete: 'CASCADE',
          }),
        );

        await queryRunner.createForeignKey(
          'messages',
          new TableForeignKey({
            columnNames: ['senderId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );

        // Create indexes for better performance
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "IDX_messages_roomId" ON "messages" ("roomId")
        `);

        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "IDX_messages_createdAt" ON "messages" ("createdAt")
        `);

        console.log('✅ Created messages table');
      } else {
        console.log('✅ Messages table already exists, skipping creation');
      }
    } catch (error) {
      console.error('❌ CreateMessagesTable migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      const messagesTable = await queryRunner.getTable('messages');
      if (messagesTable) {
        const foreignKeys = messagesTable.foreignKeys;
        for (const fk of foreignKeys) {
          await queryRunner.dropForeignKey('messages', fk);
        }
        await queryRunner.dropTable('messages');
        console.log('✅ Dropped messages table');
      }
    } catch (error) {
      console.error('❌ CreateMessagesTable down migration failed:', error);
      throw error;
    }
  }
}
