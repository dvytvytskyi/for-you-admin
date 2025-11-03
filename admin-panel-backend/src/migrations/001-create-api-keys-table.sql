-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "apiKey" VARCHAR(255) NOT NULL UNIQUE,
  "apiSecret" TEXT NOT NULL,
  name VARCHAR(255),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on apiKey for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys("apiKey");

-- Create index on isActive for filtering
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys("isActive");

