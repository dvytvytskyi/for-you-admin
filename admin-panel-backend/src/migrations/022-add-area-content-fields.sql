ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS content_general_information_en TEXT,
  ADD COLUMN IF NOT EXISTS content_general_information_ru TEXT,
  ADD COLUMN IF NOT EXISTS content_quick_access_description_en TEXT,
  ADD COLUMN IF NOT EXISTS content_quick_access_description_ru TEXT;
