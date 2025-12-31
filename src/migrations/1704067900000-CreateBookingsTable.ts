import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBookingsTable1704067900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bookings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'gigId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'bookingDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'bookingTime',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'serviceAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'fullName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'emailAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'describeProblem',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'urgencyLevel',
            type: 'enum',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            default: "'MEDIUM'",
          },
          {
            name: 'uploadPhotos',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'estimatedBudget',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
            default: "'PENDING'",
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

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_bookings_gig_id" ON "bookings" ("gigId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bookings_user_id" ON "bookings" ("userId")
    `);

    // Remove duplicate bookings before creating unique index
    // Keep only the most recent booking for each (userId, gigId) combination
    await queryRunner.query(`
      DELETE FROM "bookings" b1
      USING "bookings" b2
      WHERE b1.id < b2.id
        AND b1."userId" = b2."userId"
        AND b1."gigId" = b2."gigId"
        AND b1."userId" IS NOT NULL
        AND b1."gigId" IS NOT NULL
        AND b2."userId" IS NOT NULL
        AND b2."gigId" IS NOT NULL
    `);

    // Create unique constraint to prevent duplicate bookings
    // Only apply uniqueness when both userId and gigId are NOT NULL
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_bookings_user_gig_unique" 
      ON "bookings" ("userId", "gigId")
      WHERE "userId" IS NOT NULL AND "gigId" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bookings_status" ON "bookings" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bookings_booking_date" ON "bookings" ("bookingDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bookings_urgency_level" ON "bookings" ("urgencyLevel")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bookings_created_at" ON "bookings" ("createdAt")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ADD CONSTRAINT "FK_bookings_gig_id" 
      FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ADD CONSTRAINT "FK_bookings_user_id" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bookings');
  }
}
