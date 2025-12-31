-- Check if chat tables exist in production database
-- Run this query in your production database

-- 1. Check if conversations table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'conversations'
        ) 
        THEN '✅ conversations table EXISTS'
        ELSE '❌ conversations table DOES NOT EXIST'
    END as conversations_status;

-- 2. Check if messages table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'messages'
        ) 
        THEN '✅ messages table EXISTS'
        ELSE '❌ messages table DOES NOT EXIST'
    END as messages_status;

-- 3. Check if migrations ran
SELECT 
    name,
    timestamp
FROM migrations
WHERE name IN (
    'CreateConversationsTable1704079000000',
    'CreateMessagesTable1704079100000'
)
ORDER BY timestamp DESC;

-- 4. If tables don't exist, show all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%chat%' OR table_name LIKE '%conversation%' OR table_name LIKE '%message%'
ORDER BY table_name;

