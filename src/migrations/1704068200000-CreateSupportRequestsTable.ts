import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSupportRequestsTable1704068200000
  implements MigrationInterface
{
  name = 'CreateSupportRequestsTable1704068200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'support_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'character varying',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'character varying',
            isNullable: false,
          },
          {
            name: 'phone',
            type: 'character varying',
            isNullable: true,
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
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_support_requests_email" ON "support_requests" ("email")
    `);

    console.log('✅ Support requests table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_support_requests_email"`,
    );

    await queryRunner.dropTable('support_requests');

    console.log('✅ Support requests table dropped successfully');
  }
}
