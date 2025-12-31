import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCountryAddressNamePostalCodeToBookings1704083000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('bookings', [
      new TableColumn({
        name: 'country',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'addressName',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'postalCode',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bookings', 'postalCode');
    await queryRunner.dropColumn('bookings', 'addressName');
    await queryRunner.dropColumn('bookings', 'country');
  }
}
