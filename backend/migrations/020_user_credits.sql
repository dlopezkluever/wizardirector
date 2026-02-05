-- Migration 020: User Credits Table for Stage 11 Cost Tracking
-- Tracks user credit balance for video generation billing

CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Credit balance (with 4 decimal precision for fractional credits)
    balance NUMERIC(12,4) NOT NULL DEFAULT 100.00,

    -- Low credit warning threshold
    low_credit_threshold NUMERIC(12,4) DEFAULT 10.00,

    -- Timestamps for billing tracking
    last_topup_at TIMESTAMPTZ,
    last_deduction_at TIMESTAMPTZ,

    -- Standard timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One credit record per user
    UNIQUE(user_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_user_credits_user ON user_credits(user_id);
CREATE INDEX idx_user_credits_balance ON user_credits(balance);

-- Row Level Security
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Users can only view their own credits
CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own credit record (for initial setup)
CREATE POLICY "Users can insert own credits" ON user_credits
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own credits (for balance changes)
CREATE POLICY "Users can update own credits" ON user_credits
    FOR UPDATE USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_user_credits_updated_at();

-- Comments for documentation
COMMENT ON TABLE user_credits IS 'User credit balance for video generation billing';
COMMENT ON COLUMN user_credits.balance IS 'Current credit balance (default 100 credits for new users)';
COMMENT ON COLUMN user_credits.low_credit_threshold IS 'Threshold for low credit warning display';
COMMENT ON COLUMN user_credits.last_topup_at IS 'Timestamp of last credit purchase/addition';
COMMENT ON COLUMN user_credits.last_deduction_at IS 'Timestamp of last credit deduction';
