const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });

const app = express();
const PORT = Number(process.env.PORT || 4000);

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://invalid.supabase.local',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'invalid-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) || '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    if (missingEnv.length > 0) {
      return res.status(500).json({
        status: 'error',
        message: 'Missing required env vars',
        missingEnv,
      });
    }

    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Supabase query failed',
        detail: error.message,
      });
    }

    return res.json({
      status: 'ok',
      service: 'solrem-backend',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error?.message || 'Unknown healthcheck error',
    });
  }
});

app.get('/api/public/markets', async (_req, res) => {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data: data || [] });
});

app.get('/api/public/leaderboard', async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 10), 100);
  const { data, error } = await supabase
    .from('users')
    .select('username, rank, total_rem_points, wallet_address')
    .order('total_rem_points', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data: data || [] });
});

app.post('/api/users/bootstrap', async (req, res) => {
  const walletAddress = String(req.body?.walletAddress || '').trim();
  if (!walletAddress) {
    return res.status(400).json({ error: 'walletAddress is required' });
  }

  const username = String(req.body?.username || `User-${walletAddress.slice(0, 6)}`);

  const { data: user, error: userError } = await supabase
    .from('users')
    .upsert(
      {
        wallet_address: walletAddress,
        username,
        bio: '',
      },
      { onConflict: 'wallet_address' },
    )
    .select('*')
    .single();

  if (userError) return res.status(500).json({ error: userError.message });

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('user_id', user.id)
    .limit(1);

  if (!devices || devices.length === 0) {
    await supabase.from('devices').insert([
      { user_id: user.id, name: 'Garmin', type: 'GARMIN', connected: false },
      { user_id: user.id, name: 'Whoop', type: 'WHOOP', connected: false },
      { user_id: user.id, name: 'CUDIS', type: 'CUDIS', connected: false },
    ]);
  }

  return res.json({ data: user });
});

app.post('/api/admin/seed-markets', async (req, res) => {
  const setupToken = process.env.SETUP_TOKEN;
  if (setupToken && req.headers['x-setup-token'] !== setupToken) {
    return res.status(401).json({ error: 'Invalid setup token' });
  }

  const now = Date.now();
  const seedMarkets = [
    {
      question: 'Will I sleep 7+ hours tonight?',
      description: 'Personal market based on your wearable sleep duration.',
      rules: 'Resolved YES if total sleep duration is >= 7.0 hours.',
      category: 'Personal',
      ends_at: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
      pool_size: 0,
      liquidity: 0,
      yes_percent: 55,
      no_percent: 45,
      volume: 0,
      status: 'active',
    },
    {
      question: 'Will SOL close above $250 this week?',
      description: 'Global market resolved using public exchange close price.',
      rules: 'Resolved YES if weekly close > $250.',
      category: 'Global',
      ends_at: new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString(),
      pool_size: 0,
      liquidity: 0,
      yes_percent: 50,
      no_percent: 50,
      volume: 0,
      status: 'active',
    },
  ];

  const { data, error } = await supabase.from('markets').insert(seedMarkets).select('id, question');
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ ok: true, inserted: data?.length || 0, data });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SolREM backend running on port ${PORT}`);
});
