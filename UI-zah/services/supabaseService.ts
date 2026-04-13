/**
 * Supabase Service - Replace Mock Data with Real Database
 */

import { supabase, Database, isSupabaseConfigured } from './supabaseClient';
import type { SleepData, Market, Device, UserProfile } from '../types';

type Tables = Database['public']['Tables'];
type SleepRecord = Tables['sleep_records']['Row'];
type MarketRow = Tables['markets']['Row'];
type DeviceRow = Tables['devices']['Row'];
type UserRow = Tables['users']['Row'];

/**
 * USER OPERATIONS
 */

export const getUserByWallet = async (
  walletAddress: string,
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      username: data.username,
      bio: data.bio,
      avatarUrl: data.avatar_url || '',
      rank: data.rank,
      solBalance: 0, // Will be fetched from wallet
      remPoints: data.total_rem_points,
      streak: 0, // Calculate from sleep_records
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const createUser = async (
  walletAddress: string,
  username: string = 'Anonymous',
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress,
        username,
        bio: '',
        rank: 999,
        total_rem_points: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      username: data.username,
      bio: data.bio,
      avatarUrl: data.avatar_url || '',
      rank: data.rank,
      solBalance: 0,
      remPoints: data.total_rem_points,
      streak: 0,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const updateUserProfile = async (
  walletAddress: string,
  updates: { username?: string; bio?: string; avatar_url?: string },
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('wallet_address', walletAddress);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
};

/**
 * SLEEP DATA OPERATIONS
 */

export const getSleepHistory = async (
  walletAddress: string,
  days: number = 7,
): Promise<SleepData[]> => {
  try {
    // First get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) return [];

    // Get sleep records
    const { data, error } = await supabase
      .from('sleep_records')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(days);

    if (error) throw error;
    if (!data) return [];

    return data.map(record => ({
      date: new Date(record.date).toLocaleDateString('en-US', {
        weekday: 'short',
      }),
      score: record.score,
      remScore: record.rem_score,
      deepScore: record.deep_score,
      efficiency: record.efficiency,
      durationHours: Number(record.duration_hours),
      latencyMinutes: record.latency_minutes,
      wasoMinutes: record.waso_minutes,
    }));
  } catch (error) {
    console.error('Error fetching sleep history:', error);
    return [];
  }
};

export const addSleepRecord = async (
  walletAddress: string,
  sleepData: Omit<SleepData, 'date'> & { date: string },
): Promise<boolean> => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) return false;

    const { error } = await supabase.from('sleep_records').insert({
      user_id: user.id,
      date: sleepData.date,
      score: sleepData.score,
      rem_score: sleepData.remScore,
      deep_score: sleepData.deepScore,
      efficiency: sleepData.efficiency,
      duration_hours: sleepData.durationHours,
      latency_minutes: sleepData.latencyMinutes,
      waso_minutes: sleepData.wasoMinutes,
      raw_data: null,
      device_id: null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding sleep record:', error);
    return false;
  }
};

/**
 * DEVICE OPERATIONS
 */

export const getUserDevices = async (
  walletAddress: string,
): Promise<Device[]> => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) return [];

    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    if (!data) return [];

    return data.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type as 'GARMIN' | 'WHOOP' | 'CUDIS',
      connected: device.connected,
      lastSync: device.last_sync ? new Date(device.last_sync) : null,
      batteryLevel: device.battery_level || undefined,
    }));
  } catch (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
};

export const toggleDeviceConnection = async (
  deviceId: string,
  connected: boolean,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('devices')
      .update({
        connected,
        last_sync: connected ? new Date().toISOString() : null,
      })
      .eq('id', deviceId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error toggling device:', error);
    return false;
  }
};

/**
 * MARKET OPERATIONS
 */

export const getActiveMarkets = async (): Promise<Market[]> => {
  try {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(market => ({
      id: market.id,
      question: market.question,
      description: market.description,
      rules: market.rules,
      endsAt: new Date(market.ends_at),
      poolSize: Number(market.pool_size),
      liquidity: Number(market.liquidity),
      yesPercent: market.yes_percent,
      noPercent: market.no_percent,
      volume: Number(market.volume),
      category: market.category as 'Personal' | 'Global' | 'Challenge',
    }));
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
};

export const getUserBets = async (walletAddress: string) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) return [];

    const { data, error } = await supabase
      .from('user_bets')
      .select('*, markets(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user bets:', error);
    return [];
  }
};

export const placeBet = async (
  walletAddress: string,
  marketId: string,
  amount: number,
  position: 'YES' | 'NO',
  entryPrice: number,
  potentialPayout: number,
  transactionSignature?: string,
): Promise<boolean> => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) return false;

    const { error } = await supabase.from('user_bets').insert({
      user_id: user.id,
      market_id: marketId,
      amount,
      position,
      entry_price: entryPrice,
      potential_payout: potentialPayout,
      status: 'OPEN',
      transaction_signature: transactionSignature || null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error placing bet:', error);
    return false;
  }
};

/**
 * LEADERBOARD
 */

export const getLeaderboard = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('username, rank, total_rem_points, wallet_address')
      .order('total_rem_points', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};

/**
 * HEALTH CHECK
 */

export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    return false;
  }

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
};
