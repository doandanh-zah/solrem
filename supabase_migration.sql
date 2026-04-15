-- =====================================================
-- SOLREM DATABASE MIGRATION
-- For Supabase Postgres
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  rank INTEGER DEFAULT 999,
  total_rem_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

COMMENT ON TABLE users IS 'User profiles linked to Solana wallet addresses';
COMMENT ON COLUMN users.wallet_address IS 'Solana wallet public key';
COMMENT ON COLUMN users.total_rem_points IS 'Lifetime Proof of REM points earned';

-- =====================================================
-- 2. SLEEP RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sleep_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  rem_score INTEGER NOT NULL CHECK (rem_score >= 0 AND rem_score <= 100),
  deep_score INTEGER NOT NULL CHECK (deep_score >= 0 AND deep_score <= 100),
  efficiency INTEGER NOT NULL CHECK (efficiency >= 0 AND efficiency <= 100),
  duration_hours DECIMAL(4,2) NOT NULL CHECK (duration_hours >= 0),
  latency_minutes INTEGER NOT NULL CHECK (latency_minutes >= 0),
  waso_minutes INTEGER NOT NULL CHECK (waso_minutes >= 0),
  raw_data JSONB,
  device_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sleep_records_user_date ON sleep_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_records_date ON sleep_records(date DESC);

COMMENT ON TABLE sleep_records IS 'Daily sleep tracking data from wearables';
COMMENT ON COLUMN sleep_records.score IS 'Overall sleep quality score (0-100)';
COMMENT ON COLUMN sleep_records.rem_score IS 'REM sleep score - 25% weight in overall score';
COMMENT ON COLUMN sleep_records.deep_score IS 'Deep sleep score - 20% weight';
COMMENT ON COLUMN sleep_records.efficiency IS 'Sleep efficiency percentage - 20% weight';
COMMENT ON COLUMN sleep_records.duration_hours IS 'Total sleep duration - 15% weight';
COMMENT ON COLUMN sleep_records.latency_minutes IS 'Time to fall asleep - 10% weight';
COMMENT ON COLUMN sleep_records.waso_minutes IS 'Wake After Sleep Onset - 10% weight';
COMMENT ON COLUMN sleep_records.raw_data IS 'Raw JSON data from wearable device';

-- =====================================================
-- 3. DEVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('GARMIN', 'WHOOP', 'CUDIS')),
  connected BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user device lookups
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

COMMENT ON TABLE devices IS 'Wearable devices connected to user accounts';
COMMENT ON COLUMN devices.access_token IS 'OAuth access token for device API (encrypted in production)';
COMMENT ON COLUMN devices.refresh_token IS 'OAuth refresh token (encrypted in production)';

-- =====================================================
-- 4. MARKETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  description TEXT NOT NULL,
  rules TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Personal', 'Global', 'Challenge')),
  ends_at TIMESTAMPTZ NOT NULL,
  pool_size DECIMAL(12,4) DEFAULT 0,
  liquidity DECIMAL(12,4) DEFAULT 0,
  yes_percent INTEGER DEFAULT 50 CHECK (yes_percent >= 0 AND yes_percent <= 100),
  no_percent INTEGER DEFAULT 50 CHECK (no_percent >= 0 AND no_percent <= 100),
  volume DECIMAL(12,4) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
  resolution_outcome TEXT CHECK (resolution_outcome IN ('YES', 'NO', NULL)),
  on_chain_address TEXT,
  creator_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category, status);
CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator_id);

COMMENT ON TABLE markets IS 'Prediction markets for sleep outcomes';
COMMENT ON COLUMN markets.on_chain_address IS 'Solana program derived address (PDA)';
COMMENT ON COLUMN markets.pool_size IS 'Total SOL in market pool';
COMMENT ON COLUMN markets.yes_percent IS 'Current YES position percentage';
COMMENT ON COLUMN markets.no_percent IS 'Current NO position percentage';

-- =====================================================
-- 5. USER BETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  amount DECIMAL(12,4) NOT NULL CHECK (amount > 0),
  position TEXT NOT NULL CHECK (position IN ('YES', 'NO')),
  entry_price INTEGER NOT NULL CHECK (entry_price >= 0 AND entry_price <= 100),
  potential_payout DECIMAL(12,4) NOT NULL,
  actual_payout DECIMAL(12,4),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'WON', 'LOST', 'CANCELLED')),
  transaction_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_user_bets_user ON user_bets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_bets_market ON user_bets(market_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_status ON user_bets(status);
CREATE INDEX IF NOT EXISTS idx_user_bets_tx ON user_bets(transaction_signature);

COMMENT ON TABLE user_bets IS 'User positions in prediction markets';
COMMENT ON COLUMN user_bets.transaction_signature IS 'Solana transaction signature';
COMMENT ON COLUMN user_bets.entry_price IS 'Market odds when bet was placed';

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;

-- USERS: Public read, users can update their own data
CREATE POLICY "Users are viewable by everyone" 
  ON users FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- SLEEP RECORDS: Users can only access their own records
CREATE POLICY "Users can view own sleep records" 
  ON sleep_records FOR SELECT 
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own sleep records" 
  ON sleep_records FOR INSERT 
  WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own sleep records"
  ON sleep_records FOR UPDATE
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- DEVICES: Users can manage their own devices
CREATE POLICY "Users can view own devices" 
  ON devices FOR SELECT 
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can manage own devices" 
  ON devices FOR ALL 
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- MARKETS: Public read, authenticated users can create
CREATE POLICY "Markets are viewable by everyone" 
  ON markets FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create markets"
  ON markets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- USER BETS: Users can view their own bets
CREATE POLICY "Users can view own bets" 
  ON user_bets FOR SELECT 
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own bets" 
  ON user_bets FOR INSERT 
  WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update users.updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Calculate user's current streak
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE := CURRENT_DATE;
BEGIN
  LOOP
    -- Check if user has record for this date
    IF NOT EXISTS (
      SELECT 1 FROM sleep_records 
      WHERE user_id = p_user_id AND date = v_check_date
    ) THEN
      EXIT;
    END IF;
    
    v_streak := v_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
    
    -- Safety limit: max 365 day streak
    IF v_streak >= 365 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_user_streak IS 'Calculate consecutive days with sleep records';

-- Function: Get user leaderboard rank
CREATE OR REPLACE FUNCTION update_user_ranks()
RETURNS void AS $$
BEGIN
  WITH ranked_users AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY total_rem_points DESC) as new_rank
    FROM users
  )
  UPDATE users u
  SET rank = ru.new_rank
  FROM ranked_users ru
  WHERE u.id = ru.id AND u.rank != ru.new_rank;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_ranks IS 'Update user rankings based on total REM points (run periodically)';

-- =====================================================
-- 8. VIEWS (for easier queries) - WITH RLS SECURITY
-- =====================================================

-- View: User stats summary (SECURITY INVOKER = respects RLS)
CREATE OR REPLACE VIEW user_stats 
WITH (security_invoker = true)
AS
SELECT 
  u.id,
  u.wallet_address,
  u.username,
  u.rank,
  u.total_rem_points,
  COUNT(sr.id) as total_sleep_records,
  ROUND(AVG(sr.score), 1) as avg_sleep_score,
  MAX(sr.date) as last_sleep_date,
  COUNT(DISTINCT ub.id) as total_bets,
  COALESCE(SUM(CASE WHEN ub.status = 'WON' THEN ub.actual_payout ELSE 0 END), 0) as total_winnings
FROM users u
LEFT JOIN sleep_records sr ON u.id = sr.user_id
LEFT JOIN user_bets ub ON u.id = ub.user_id
GROUP BY u.id, u.wallet_address, u.username, u.rank, u.total_rem_points;

COMMENT ON VIEW user_stats IS 'Aggregated user statistics (SECURITY INVOKER - respects RLS)';

-- View: Active markets with bet counts (SECURITY INVOKER = respects RLS)
CREATE OR REPLACE VIEW active_markets_summary 
WITH (security_invoker = true)
AS
SELECT 
  m.*,
  COUNT(DISTINCT ub.user_id) as unique_bettors,
  COUNT(ub.id) as total_bets,
  SUM(CASE WHEN ub.position = 'YES' THEN ub.amount ELSE 0 END) as yes_total,
  SUM(CASE WHEN ub.position = 'NO' THEN ub.amount ELSE 0 END) as no_total
FROM markets m
LEFT JOIN user_bets ub ON m.id = ub.market_id
WHERE m.status = 'active' AND m.ends_at > NOW()
GROUP BY m.id;

COMMENT ON VIEW active_markets_summary IS 'Active markets with betting statistics (SECURITY INVOKER - respects RLS)';

-- Enable security barrier on views (extra protection)
ALTER VIEW user_stats SET (security_barrier = true);
ALTER VIEW active_markets_summary SET (security_barrier = true);

-- Grant permissions
GRANT SELECT ON user_stats TO authenticated;
GRANT SELECT ON active_markets_summary TO authenticated, anon;

-- =====================================================
-- 9. SEED DATA (Optional - for testing)
-- =====================================================

-- Insert test user (only if not exists)
INSERT INTO users (wallet_address, username, bio, rank, total_rem_points)
VALUES ('8x72...3f29', 'SolSleeper', 'Hacking sleep cycles 🌙 | REM Chaser', 42, 3450)
ON CONFLICT (wallet_address) DO NOTHING;

-- Get test user ID
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM users WHERE wallet_address = '8x72...3f29';
  
  -- Skip if user not found
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'Test user not found, skipping seed data';
    RETURN;
  END IF;
  
  -- Insert 7 days of sleep data
  INSERT INTO sleep_records (user_id, date, score, rem_score, deep_score, efficiency, duration_hours, latency_minutes, waso_minutes)
  VALUES 
    (test_user_id, CURRENT_DATE - 6, 72, 65, 70, 85, 6.5, 15, 45),
    (test_user_id, CURRENT_DATE - 5, 68, 60, 65, 82, 6.2, 20, 50),
    (test_user_id, CURRENT_DATE - 4, 85, 88, 80, 92, 7.8, 10, 20),
    (test_user_id, CURRENT_DATE - 3, 78, 75, 72, 88, 7.0, 12, 30),
    (test_user_id, CURRENT_DATE - 2, 91, 94, 85, 95, 8.2, 8, 15),
    (test_user_id, CURRENT_DATE - 1, 88, 85, 82, 90, 7.9, 25, 25),
    (test_user_id, CURRENT_DATE, 94, 96, 88, 96, 8.5, 5, 10)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  -- Insert test device
  INSERT INTO devices (user_id, name, type, connected, battery_level)
  VALUES (test_user_id, 'Garmin Fenix 7', 'GARMIN', true, 78)
  ON CONFLICT DO NOTHING;
  
  -- Insert test markets
  INSERT INTO markets (question, description, rules, category, ends_at, pool_size, liquidity, yes_percent, no_percent, volume)
  VALUES 
    ('Will you get > 25% REM sleep tonight?', 
     'Based on your wearable data. REM sleep is crucial for memory consolidation and emotional regulation.',
     'Market resolves to YES if the primary connected device reports REM sleep percentage greater than 25.0% for the sleep session ending tomorrow morning.',
     'Personal',
     NOW() + INTERVAL '12 hours',
     145.2, 4500, 45, 55, 1200),
    ('Global Sleep Score > 80 average?',
     'Predicting the average sleep quality of the entire SolREM userbase for tonight.',
     'Resolves YES if the computed average Sleep Score of all active users (synced within 24h) exceeds 80.0.',
     'Global',
     NOW() + INTERVAL '6 hours',
     520.5, 12000, 62, 38, 5400),
    ('User @sleep_king > 8h duration?',
     'A challenge market on the top ranked user''s performance.',
     'Resolves YES if user @sleep_king records a total sleep duration > 8 hours exactly.',
     'Challenge',
     NOW() + INTERVAL '4 hours',
     85.1, 2000, 30, 70, 800)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Test data seeded successfully';
END $$;

-- =====================================================
-- 10. VERIFY MIGRATION
-- =====================================================

-- Count tables
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'sleep_records', 'devices', 'markets', 'user_bets');
  
  RAISE NOTICE 'Created % tables', table_count;
END $$;

-- Test query
SELECT 
  u.username,
  COUNT(sr.id) as sleep_records_count,
  COUNT(d.id) as devices_count
FROM users u
LEFT JOIN sleep_records sr ON u.id = sr.user_id
LEFT JOIN devices d ON u.id = d.user_id
GROUP BY u.id, u.username;

-- =====================================================
-- MIGRATION COMPLETE ✅
-- =====================================================

-- =====================================================
-- 11. BASIC APP COMPATIBILITY POLICIES (MVP)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'MVP users full access'
  ) THEN
    CREATE POLICY "MVP users full access" ON users FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sleep_records' AND policyname = 'MVP sleep_records full access'
  ) THEN
    CREATE POLICY "MVP sleep_records full access" ON sleep_records FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'devices' AND policyname = 'MVP devices full access'
  ) THEN
    CREATE POLICY "MVP devices full access" ON devices FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'markets' AND policyname = 'MVP markets full access'
  ) THEN
    CREATE POLICY "MVP markets full access" ON markets FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_bets' AND policyname = 'MVP user_bets full access'
  ) THEN
    CREATE POLICY "MVP user_bets full access" ON user_bets FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
