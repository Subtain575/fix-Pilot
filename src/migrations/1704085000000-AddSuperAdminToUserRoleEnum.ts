import { MigrationInterface, QueryRunner } from 'typeorm';
import { fetchRows } from './utils/query-result.util.js';

export class AddSuperAdminToUserRoleEnum1704085000000
  implements MigrationInterface
{
  name = 'AddSuperAdminToUserRoleEnum1704085000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if users table exists
    const tableExists = await fetchRows(
      queryRunner,
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `,
    );

    if (tableExists.length === 0) {
      console.log('✅ Users table does not exist, skipping enum update');
      return;
    }

    // Check if enum type exists
    const enumExists = await fetchRows(
      queryRunner,
      `
      SELECT typname 
      FROM pg_type 
      WHERE typname = 'users_role_enum'
    `,
    );

    if (enumExists.length === 0) {
      console.log(
        '✅ users_role_enum does not exist, creating it with all values',
      );
      // Create enum with all values including super_admin
      await queryRunner.query(`
        CREATE TYPE "users_role_enum" AS ENUM ('buyer', 'seller', 'admin', 'super_admin')
      `);

      // Alter users table to use the enum if it's not already using it
      await queryRunner.query(`
        ALTER TABLE "users" 
        ALTER COLUMN "role" TYPE "users_role_enum" 
        USING "role"::"users_role_enum"
      `);
    } else {
      // Enum exists, add super_admin value
      // Note: PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE
      // So we'll try to add it and catch if it already exists
      try {
        await queryRunner.query(`
          ALTER TYPE "users_role_enum" ADD VALUE 'super_admin'
        `);
        console.log('✅ Successfully added super_admin to users_role_enum');
      } catch (error: any) {
        // If value already exists, that's fine
        if (error.message && error.message.includes('already exists')) {
          console.log('✅ super_admin already exists in users_role_enum');
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // We would need to recreate the enum without super_admin
    // For safety, we'll just log a warning

    console.log(
      '⚠️ Cannot remove enum value directly. Manual intervention required if needed.',
    );

    // If you really need to remove it, you would need to:
    // 1. Alter column to varchar temporarily
    // 2. Update any super_admin values to another role
    // 3. Drop and recreate enum without super_admin
    // 4. Convert column back to enum

    // For now, we'll leave it as is since removing enum values is complex
  }
}
