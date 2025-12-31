import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class CreateNotificationsTable1704077000000
  implements MigrationInterface
{
  name = 'CreateNotificationsTable1704077000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await fetchRows(
      queryRunner,
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'notifications'
    `,
    );

    if (tableExists.length > 0) {
      console.log('✅ Notifications table already exists, skipping creation');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'receiverId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'senderId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'link',
            type: 'varchar',
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

    // Foreign key: receiverId -> users.id
    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        columnNames: ['receiverId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'FK_notifications_receiver_id',
      }),
    );

    // Foreign key: senderId -> users.id
    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        columnNames: ['senderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'FK_notifications_sender_id',
      }),
    );

    // Indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_receiver_id" ON "notifications" ("receiverId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_sender_id" ON "notifications" ("senderId")
    `);

    console.log('✅ Notifications table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_sender_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_receiver_id"`,
    );

    // Drop foreign keys
    const table = await queryRunner.getTable('notifications');
    if (table) {
      const fkReceiver = table.foreignKeys.find(
        (fk) => fk.name === 'FK_notifications_receiver_id',
      );
      if (fkReceiver) {
        await queryRunner.dropForeignKey('notifications', fkReceiver);
      }

      const fkSender = table.foreignKeys.find(
        (fk) => fk.name === 'FK_notifications_sender_id',
      );
      if (fkSender) {
        await queryRunner.dropForeignKey('notifications', fkSender);
      }
    }

    // Drop table
    await queryRunner.dropTable('notifications', true);
  }
}
