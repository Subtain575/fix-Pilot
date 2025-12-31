import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class AddFileUrlAndFileTypeToMessages1704086000000
  implements MigrationInterface
{
  name = 'AddFileUrlAndFileTypeToMessages1704086000000';

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
        console.log('⚠️ Messages table does not exist, skipping migration');
        return;
      }

      // Check if fileUrl column already exists
      const fileUrlColumnExists = await fetchRows(
        queryRunner,
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'fileUrl'
      `,
      );

      if (fileUrlColumnExists.length === 0) {
        // Add fileUrl column
        await queryRunner.addColumn(
          'messages',
          new TableColumn({
            name: 'fileUrl',
            type: 'varchar',
            isNullable: true,
          }),
        );
        console.log('✅ Added fileUrl column to messages table');
      } else {
        console.log('✅ fileUrl column already exists, skipping');
      }

      // Check if fileType column already exists
      const fileTypeColumnExists = await fetchRows(
        queryRunner,
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'fileType'
      `,
      );

      if (fileTypeColumnExists.length === 0) {
        // Add fileType column
        await queryRunner.addColumn(
          'messages',
          new TableColumn({
            name: 'fileType',
            type: 'varchar',
            isNullable: true,
          }),
        );
        console.log('✅ Added fileType column to messages table');
      } else {
        console.log('✅ fileType column already exists, skipping');
      }

      // Make message column nullable to support file-only messages
      const messageColumn = await fetchRows(
        queryRunner,
        `
        SELECT column_name, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'message'
      `,
      );

      if (messageColumn.length > 0 && messageColumn[0].is_nullable === 'NO') {
        await queryRunner.query(`
          ALTER TABLE "messages" ALTER COLUMN "message" DROP NOT NULL
        `);
        console.log('✅ Made message column nullable');
      } else {
        console.log('✅ message column is already nullable, skipping');
      }
    } catch (error) {
      console.error(
        '❌ AddFileUrlAndFileTypeToMessages migration failed:',
        error,
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      const messagesTable = await queryRunner.getTable('messages');
      if (messagesTable) {
        // Check if fileUrl column exists before dropping
        const fileUrlColumn = messagesTable.findColumnByName('fileUrl');
        if (fileUrlColumn) {
          await queryRunner.dropColumn('messages', 'fileUrl');
          console.log('✅ Dropped fileUrl column from messages table');
        }

        // Check if fileType column exists before dropping
        const fileTypeColumn = messagesTable.findColumnByName('fileType');
        if (fileTypeColumn) {
          await queryRunner.dropColumn('messages', 'fileType');
          console.log('✅ Dropped fileType column from messages table');
        }

        // Revert message column to NOT NULL (optional - only if you want to revert)
        // await queryRunner.query(`
        //   ALTER TABLE "messages" ALTER COLUMN "message" SET NOT NULL
        // `);
      }
    } catch (error) {
      console.error(
        '❌ AddFileUrlAndFileTypeToMessages down migration failed:',
        error,
      );
      throw error;
    }
  }
}
