import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateGigFavouritesTable1704067700000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'gig_favourites',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'gig_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "gig_favourites" 
      ADD CONSTRAINT "FK_gig_favourites_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "gig_favourites" 
      ADD CONSTRAINT "FK_gig_favourites_gig_id" 
      FOREIGN KEY ("gig_id") REFERENCES "gigs"("id") ON DELETE CASCADE
    `);

    // Create unique constraint to prevent duplicate favourites
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_gig_favourites_user_gig_unique" 
      ON "gig_favourites" ("user_id", "gig_id")
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_gig_favourites_user_id" 
      ON "gig_favourites" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_gig_favourites_gig_id" 
      ON "gig_favourites" ("gig_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('gig_favourites');
  }
}
