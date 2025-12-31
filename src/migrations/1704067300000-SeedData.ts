import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedData1704067300000 implements MigrationInterface {
  name = 'SeedData1704067300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed Categories
    await queryRunner.query(`
      INSERT INTO "categories" ("name") VALUES
      ('Web Development'),
      ('Mobile Development'),
      ('UI/UX Design'),
      ('Digital Marketing'),
      ('Content Writing'),
      ('Data Science'),
      ('DevOps')
      ON CONFLICT ("name") DO NOTHING
    `);

    // Seed Admin User (if needed)
    await queryRunner.query(`
      INSERT INTO "users" ("name", "email", "password", "role", "isActive") VALUES
      ('Admin User', 'admin@example.com', '$2b$10$example.hash.here', 'buyer', true)
      ON CONFLICT ("email") DO NOTHING
    `);

    // You can add more seed data here
    console.log('✅ Seed data inserted successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seed data in reverse order to avoid foreign key constraints
    await queryRunner.query(
      `DELETE FROM "users" WHERE "email" = 'admin@example.com'`,
    );
    await queryRunner.query(`DELETE FROM "categories" WHERE "name" IN (
      'Web Development', 'Mobile Development', 'UI/UX Design', 
      'Digital Marketing', 'Content Writing', 'Data Science', 'DevOps'
    )`);

    console.log('✅ Seed data removed successfully');
  }
}
