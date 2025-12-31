import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddArrivalCoordinatesToBookings1704069000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('bookings', [
      new TableColumn({
        name: 'arrivalLatitude',
        type: 'decimal',
        precision: 10,
        scale: 8,
        isNullable: true,
      }),
      new TableColumn({
        name: 'arrivalLongitude',
        type: 'decimal',
        precision: 11,
        scale: 8,
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bookings', 'arrivalLongitude');
    await queryRunner.dropColumn('bookings', 'arrivalLatitude');
  }
}
