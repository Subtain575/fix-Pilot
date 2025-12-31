-- Migration Script: Add countries column to notifications table
-- Run this script directly on your live/production database

-- Step 1: Check if notifications table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN
        RAISE NOTICE 'Notifications table does not exist. Skipping migration.';
        RETURN;
    END IF;
END $$;

-- Step 2: Check if countries column already exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'countries'
    ) THEN
        RAISE NOTICE 'Countries column already exists. Skipping migration.';
        RETURN;
    END IF;
END $$;

-- Step 3: Add countries column (nullable varchar)
ALTER TABLE "notifications"
ADD COLUMN IF NOT EXISTS "countries" varchar NULL;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'notifications' 
  AND column_name = 'countries';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added countries column to notifications table';
END $$;

