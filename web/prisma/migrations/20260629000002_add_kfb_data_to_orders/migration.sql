-- Add kfb_data JSONB column to orders (was missing from migration 64)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kfb_data JSONB;
