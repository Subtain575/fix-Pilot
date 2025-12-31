-- Migration Script: Remove countries column and add isRead column to notifications table
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

-- Step 2: Remove countries column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'countries'
    ) THEN
        ALTER TABLE "notifications" DROP COLUMN "countries";
        RAISE NOTICE '✅ Successfully removed countries column from notifications table';
    ELSE
        RAISE NOTICE 'ℹ️ countries column does not exist. Skipping drop.';
    END IF;
END $$;

-- Step 3: Add isRead column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'isRead'
    ) THEN
        ALTER TABLE "notifications"
        ADD COLUMN "isRead" boolean NOT NULL DEFAULT false;
        RAISE NOTICE '✅ Successfully added isRead column to notifications table';
    ELSE
        RAISE NOTICE 'ℹ️ isRead column already exists. Skipping add.';
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'notifications' 
  AND column_name IN ('countries', 'isRead')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
END $$;
