-- Fix Booking Status Enum for Production
-- Run this SQL script in your PostgreSQL database BEFORE starting the app
-- Connect to your database and run: psql -U your_user -d your_database -f fix-booking-enum-production.sql

-- Step 1: Update existing COMPLETED records to CONFIRMED (since completeJob tracks completion)
UPDATE "bookings" 
SET "status" = 'CONFIRMED' 
WHERE "status" = 'COMPLETED';

-- Step 2: Update existing CANCELLED records to REJECT
UPDATE "bookings" 
SET "status" = 'REJECT' 
WHERE "status" = 'CANCELLED';

-- Step 3: Temporarily change status column to varchar to allow enum modification
ALTER TABLE "bookings" 
ALTER COLUMN "status" TYPE varchar USING "status"::varchar;

-- Step 4: Drop the old enum type
DROP TYPE IF EXISTS "bookings_status_enum";

-- Step 5: Create new enum type with only PENDING, CONFIRMED, REJECT
CREATE TYPE "bookings_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'REJECT');

-- Step 6: Change status column back to enum type
ALTER TABLE "bookings" 
ALTER COLUMN "status" TYPE "bookings_status_enum" 
USING "status"::"bookings_status_enum";

-- Step 7: Set default value
ALTER TABLE "bookings" 
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Step 8: Drop unique index if exists (since we removed it from entity)
DROP INDEX IF EXISTS "IDX_bookings_user_gig_unique";
DROP INDEX IF EXISTS "IDX_bookings_userId_gigId";

-- Verify: Check if any invalid status values remain
SELECT DISTINCT "status" FROM "bookings";

