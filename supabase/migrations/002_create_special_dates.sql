-- Create special_dates table for admin-designated special availability dates
CREATE TABLE IF NOT EXISTS special_dates (
    id SERIAL PRIMARY KEY,
    date DATE, -- Single date (for backward compatibility)
    start_date DATE, -- Start date for date ranges
    end_date DATE, -- End date for date ranges
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT, -- Admin user who created this special date
    CONSTRAINT special_dates_date_check CHECK (
        (date IS NOT NULL AND start_date IS NULL AND end_date IS NULL) OR
        (date IS NULL AND start_date IS NOT NULL AND end_date IS NOT NULL)
    ),
    CONSTRAINT special_dates_range_check CHECK (
        end_date IS NULL OR start_date <= end_date
    )
);

-- Create indexes for faster date lookups
CREATE INDEX IF NOT EXISTS idx_special_dates_date ON special_dates(date);
CREATE INDEX IF NOT EXISTS idx_special_dates_start_date ON special_dates(start_date);
CREATE INDEX IF NOT EXISTS idx_special_dates_end_date ON special_dates(end_date);
CREATE INDEX IF NOT EXISTS idx_special_dates_active ON special_dates(is_active);
CREATE INDEX IF NOT EXISTS idx_special_dates_range ON special_dates(start_date, end_date);

-- Enable RLS (Row Level Security)
ALTER TABLE special_dates ENABLE ROW LEVEL SECURITY;

-- Policy: Only admin and management users can manage special dates
CREATE POLICY "Admin and management can manage special dates" ON special_dates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'management')
        )
    );

-- Policy: All authenticated users can view active special dates
CREATE POLICY "Authenticated users can view special dates" ON special_dates
    FOR SELECT USING (
        auth.role() = 'authenticated' AND is_active = true
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_special_dates_updated_at
    BEFORE UPDATE ON special_dates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();