-- Міграція для створення таблиць Collections, Favorites, Investments
-- Та розширення Areas та Developers

-- 1. Створення таблиці collections
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_collections_user_id ON collections(user_id);

-- 2. Створення таблиці для зв'язку collection_properties (many-to-many)
CREATE TABLE IF NOT EXISTS collection_properties (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    PRIMARY KEY (collection_id, property_id)
);

CREATE INDEX idx_collection_properties_collection ON collection_properties(collection_id);
CREATE INDEX idx_collection_properties_property ON collection_properties(property_id);

-- 3. Створення таблиці favorites
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_property_id ON favorites(property_id);

-- 4. Створення enum для InvestmentStatus
DO $$ BEGIN
    CREATE TYPE investment_status_enum AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Створення таблиці investments
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    status investment_status_enum DEFAULT 'pending',
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_property_id ON investments(property_id);
CREATE INDEX idx_investments_status ON investments(status);

-- 6. Додавання нових полів до areas
ALTER TABLE areas 
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS images TEXT[];

-- 7. Додавання нових полів до developers
ALTER TABLE developers 
    ADD COLUMN IF NOT EXISTS images TEXT[];

