import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddArrivalRatingToBookings1704076000000
  implements MigrationInterface
{
  name = 'AddArrivalRatingToBookings1704076000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('bookings', 'arrivalRating');
    if (hasColumn) {
      return;
    }

    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'arrivalRating',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('bookings', 'arrivalRating');
    if (!hasColumn) {
      return;
    }

    await queryRunner.dropColumn('bookings', 'arrivalRating');
  }
}
