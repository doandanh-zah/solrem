/**
 * Data Loader - Production Mode (Real APIs Only)
 * All data fetched from Supabase and Solana blockchain
 */

import type { SleepData, Market, Device, UserProfile } from '../types';
import { RESOURCES } from '../resources';
import * as supabaseService from './supabaseService';
import { isSupabaseConfigured } from './supabaseClient';

/**
 * Get Sleep History
 */
export const getSleepHistory = async (
  walletAddress?: string,
): Promise<SleepData[]> => {
  if (!walletAddress) {
    return [];
  }

  if (!isSupabaseConfigured) return [];

  console.log('🔌 Fetching sleep data from Supabase');
  const data = await supabaseService.getSleepHistory(walletAddress, 7);
  return data;
};

/**
 * Get Active Markets
 */
export const getActiveMarkets = async (): Promise<Market[]> => {
  if (!isSupabaseConfigured) return [];

  console.log('🔌 Fetching markets from Supabase');
  const data = await supabaseService.getActiveMarkets();
  return data;
};

/**
 * Get User Devices
 */
export const getUserDevices = async (
  walletAddress?: string,
): Promise<Device[]> => {
  if (!walletAddress) {
    return [];
  }

  if (!isSupabaseConfigured) return [];

  console.log('🔌 Fetching devices from Supabase');
  const data = await supabaseService.getUserDevices(walletAddress);
  return data;
};

/**
 * Get User Profile
 */
export const getUserProfile = async (
  walletAddress?: string,
): Promise<UserProfile | null> => {
  if (!walletAddress) {
    return null;
  }

  if (!isSupabaseConfigured) return null;

  console.log('🔌 Fetching user profile from Supabase');
  const data = await supabaseService.getUserByWallet(walletAddress);

  // Create new user if doesn't exist
  if (!data) {
    console.log('🆕 Creating new user profile');
    const newUser = await supabaseService.createUser(walletAddress);
    return newUser;
  }

  return data;
};

/**
 * Get Resources
 */
export const getResources = () => {
  return RESOURCES;
};

/**
 * Toggle Device Connection
 */
export const toggleDevice = async (
  deviceId: string,
  connected: boolean,
): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  console.log(`🔌 Toggling device ${deviceId} to ${connected}`);
  return await supabaseService.toggleDeviceConnection(deviceId, connected);
};

/**
 * Update User Profile
 */
export const updateProfile = async (
  walletAddress: string,
  updates: { username?: string; bio?: string; avatar_url?: string },
): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  console.log('🔌 Updating user profile');
  return await supabaseService.updateUserProfile(walletAddress, updates);
};

/**
 * Place Bet
 */
export const placeBet = async (
  walletAddress: string,
  marketId: string,
  amount: number,
  position: 'YES' | 'NO',
  entryPrice: number,
  potentialPayout: number,
  transactionSignature?: string,
): Promise<boolean> => {
  if (!transactionSignature) {
    console.error('❌ Transaction signature required');
    return false;
  }

  if (!isSupabaseConfigured) return false;

  console.log('🔌 Placing bet via Supabase with tx:', transactionSignature);
  const result = await supabaseService.placeBet(
    walletAddress,
    marketId,
    amount,
    position,
    entryPrice,
    potentialPayout,
    transactionSignature,
  );

  console.log('🔌 Supabase bet result:', result ? '✅ Success' : '❌ Failed');
  return result;
};

/**
 * Get User Bets
 */
export const getUserBets = async (walletAddress?: string) => {
  if (!walletAddress) {
    return [];
  }

  if (!isSupabaseConfigured) return [];

  console.log('🔌 Fetching user bets from Supabase');
  return await supabaseService.getUserBets(walletAddress);
};

/**
 * Get Leaderboard
 */
export const getLeaderboard = async () => {
  if (!isSupabaseConfigured) return [];

  console.log('🔌 Fetching leaderboard from Supabase');
  return await supabaseService.getLeaderboard(10);
};

/**
 * Health Check
 */
export const checkConnection = async (): Promise<{
  supabase: boolean;
  mode: 'live';
}> => {
  const isConnected = isSupabaseConfigured
    ? await supabaseService.checkSupabaseConnection()
    : false;
  return { supabase: isConnected, mode: 'live' };
};

export default {
  getSleepHistory,
  getActiveMarkets,
  getUserDevices,
  getUserProfile,
  getResources,
  toggleDevice,
  updateProfile,
  placeBet,
  getUserBets,
  getLeaderboard,
  checkConnection,
};
