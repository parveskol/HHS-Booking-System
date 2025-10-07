-- Create user notification tokens table
CREATE TABLE IF NOT EXISTS user_notification_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    fcm_token TEXT,
    web_push_subscription JSONB,
    notification_preferences JSONB DEFAULT '{"booking_request": true, "booking_approval": true, "booking_rejection": true, "booking_confirmation": true, "general": true}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon TEXT,
    badge TEXT,
    tag TEXT,
    data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table if it doesn't exist (for role-based queries)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'management', 'customer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notification_tokens_user_id ON user_notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_tokens_active ON user_notification_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable Row Level Security (RLS)
ALTER TABLE user_notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_notification_tokens
CREATE POLICY "Users can view their own notification tokens" ON user_notification_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification tokens" ON user_notification_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification tokens" ON user_notification_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification tokens" ON user_notification_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_notification_tokens_updated_at
    BEFORE UPDATE ON user_notification_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();