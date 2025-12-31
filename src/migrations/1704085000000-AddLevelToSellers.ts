import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLevelToSellers1704085000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'sellers',
      new TableColumn({
        name: 'level',
        type: 'integer',
        default: 0,
        isNullable: false,
      }),
    );

    await queryRunner.query(`
      UPDATE sellers 
      SET level = 0 
      WHERE level IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('sellers', 'level');
  }
}
