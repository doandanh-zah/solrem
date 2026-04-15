import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { 
  Home, 
  BarChart2, 
  Trophy, 
  Watch, 
  User, 
  Wallet, 
  Activity, 
  Moon, 
  Zap, 
  Clock, 
  TrendingUp,
  PlusCircle,
  CheckCircle2,
  Check,
  X,
  Share2,
  Brain,
  Timer,
  AlertCircle,
  Battery,
  ChevronRight,
  Medal,
  Award,
  Bluetooth,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  PlayCircle,
  Headphones,
  ExternalLink,
  Edit2,
  Save,
  LogOut,
  Fingerprint,
  Upload,
  Info,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import { Tab, Market, UserBet, SleepData, Device, UserProfile } from './types';
import { RESOURCES } from './resources';
import SleepChart from './components/SleepChart';
import ScoreRing from './components/ScoreRing';
import WalletModal from './components/WalletModal';
import { generateSleepInsights } from './services/geminiService';
import * as dataLoader from './services/dataLoader';
import * as walletService from './services/walletService';
import { authenticateWithWallet, isSupabaseConfigured, signOutFromSupabase } from './services/supabaseClient';

// --- Loading Component (Enhanced) ---
const LoadingState: React.FC<{ text?: string }> = ({ text = "LOADING..." }) => (
  <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
    {/* Dual spinner with glow effect */}
    <div className="relative w-16 h-16 mb-6">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-surfaceHighlight opacity-20"></div>
      {/* Spinning ring 1 */}
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sport animate-spin shadow-[0_0_15px_rgba(204,255,0,0.3)]"></div>
      {/* Spinning ring 2 (counter-rotation) */}
      <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-accent animate-[spin_1s_linear_infinite_reverse] shadow-[0_0_10px_rgba(34,211,238,0.3)]"></div>
      {/* Center pulse dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-sport rounded-full animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.8)]"></div>
      </div>
    </div>
    <span className="text-sm font-mono font-bold text-sport tracking-[0.2em] animate-pulse">{text}</span>
    <div className="flex gap-1 mt-3">
      <div className="w-1.5 h-1.5 bg-sport rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
      <div className="w-1.5 h-1.5 bg-sport rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-1.5 h-1.5 bg-sport rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
  </div>
);

// --- Success Component (Enhanced) ---
const SuccessState: React.FC<{ text?: string; subtext?: string; onDismiss: () => void }> = ({ text = "SUCCESS", subtext, onDismiss }) => (
  <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
    {/* Animated Success Icon with Checkmark */}
    <div className="relative mb-6">
      {/* Outer ring animation */}
      <div className="absolute inset-0 w-20 h-20 bg-sport/20 rounded-full animate-ping"></div>
      <div className="absolute inset-0 w-20 h-20 bg-sport/10 rounded-full animate-pulse"></div>
      {/* Main icon */}
      <div className="relative w-20 h-20 bg-sport rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(204,255,0,0.6)] animate-[slideUp_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)]">
        <Check className="w-10 h-10 text-black stroke-[3] animate-[scale_0.3s_ease-out_0.2s_both]" 
               style={{ animation: 'checkmark 0.5s ease-out 0.2s forwards' }} />
      </div>
    </div>
    <h3 className="text-2xl font-display font-bold uppercase text-white mb-2 animate-slide-up">{text}</h3>
    {subtext && <p className="text-xs text-gray-400 font-mono mb-6 text-center max-w-xs animate-fade-in">{subtext}</p>}
    <button 
      onClick={onDismiss}
      className="bg-sport text-black border border-sport px-8 py-3 rounded-sm text-sm font-bold uppercase hover:bg-sport/90 hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all active:scale-95"
    >
      Continue
    </button>
    
    {/* Keyframe animations */}
    <style>{`
      @keyframes checkmark {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  </div>
);

// --- Error State Component ---
const ErrorState: React.FC<{ text?: string; subtext?: string; onDismiss: () => void }> = ({ text = "FAILED", subtext, onDismiss }) => (
  <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
    {/* Animated Error Icon with X */}
    <div className="relative mb-6">
      {/* Outer ring animation - red/orange theme */}
      <div className="absolute inset-0 w-20 h-20 bg-red-500/20 rounded-full animate-ping"></div>
      <div className="absolute inset-0 w-20 h-20 bg-red-500/10 rounded-full animate-pulse"></div>
      {/* Main icon */}
      <div className="relative w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-[slideUp_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)]">
        <X className="w-10 h-10 text-white stroke-[3]" 
           style={{ animation: 'shake 0.5s ease-out 0.2s forwards' }} />
      </div>
    </div>
    <h3 className="text-2xl font-display font-bold uppercase text-red-400 mb-2 animate-slide-up">{text}</h3>
    {subtext && <p className="text-xs text-gray-400 font-mono mb-6 text-center max-w-xs animate-fade-in">{subtext}</p>}
    <button 
      onClick={onDismiss}
      className="bg-red-500/20 text-red-400 border border-red-500/40 px-8 py-3 rounded-sm text-sm font-bold uppercase hover:bg-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all active:scale-95"
    >
      Try Again
    </button>
    
    {/* Keyframe animations */}
    <style>{`
      @keyframes shake {
        0%, 100% { transform: translateX(0) scale(1); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) scale(1.05); }
        20%, 40%, 60%, 80% { transform: translateX(5px) scale(1.05); }
      }
    `}</style>
  </div>
);

// --- 404 / Empty State Component ---
const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }> = ({ 
  icon = <AlertTriangle className="w-10 h-10 text-gray-600" />, 
  title, 
  subtitle,
  action 
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-gray-800 rounded-sm bg-surface/50">
    <div className="mb-4 p-4 bg-surfaceHighlight rounded-full">
      {icon}
    </div>
    <h3 className="text-lg font-display font-bold uppercase text-gray-300 mb-2">{title}</h3>
    <p className="text-xs text-gray-500 font-mono mb-6 max-w-xs">{subtitle}</p>
    {action}
  </div>
);

// --- Background Effect Component ---
const AmbientBackground: React.FC = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    {/* CSS for animations specifically for this component */}
    <style>{`
      @keyframes pulse-opacity {
        0%, 100% { opacity: 0.03; }
        50% { opacity: 0.06; }
      }
    `}</style>

    {/* Static Tech Grid */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
    
    {/* Subtle Glow Orbs (No Scanline) */}
    <div className="absolute top-20 right-[-100px] w-96 h-96 bg-purple-900/10 rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite]"></div>
    <div className="absolute bottom-20 left-[-100px] w-80 h-80 bg-sport/5 rounded-full blur-[80px] animate-[pulse_10s_ease-in-out_infinite]"></div>
  </div>
);

// --- Landing Page Component ---
const LandingPage: React.FC<{ onOpenConnect: () => void; onGuest: () => void }> = ({ onOpenConnect, onGuest }) => (
  <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-6 animate-slide-up overflow-hidden">
    {/* Rich Background Visuals */}
    <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(204,255,0,0.15)_0%,transparent_70%)] blur-[60px] pointer-events-none"></div>
    <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)] blur-[60px] pointer-events-none"></div>
    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>
    <div className="absolute top-0 right-0 w-[1px] h-screen bg-gradient-to-b from-transparent via-white/10 to-transparent rotate-12 transform translate-x-20 pointer-events-none"></div>

    <div className="flex flex-col items-center text-center w-full max-w-sm relative z-10 mb-12">
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-sport/20 blur-xl rounded-full animate-pulse-fast"></div>
        <div className="relative p-6 border border-sport/30 bg-black/40 backdrop-blur-sm rounded-full shadow-[0_0_30px_rgba(204,255,0,0.1)]">
          <Activity className="w-16 h-16 text-sport" />
        </div>
      </div>
      
      <h1 className="text-6xl font-display font-bold uppercase tracking-tighter text-white mb-12 leading-none">
        Sol<span className="text-sport glow-text">REM</span>
      </h1>

      <div className="w-full">
        <button
          onClick={onOpenConnect}
          className="w-full min-h-12 group relative bg-sport text-black font-display font-bold text-xl py-5 rounded-sm uppercase tracking-wide hover:bg-sport/90 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(204,255,0,0.25)] focus-visible:ring-2 focus-visible:ring-sport focus-visible:ring-offset-2 focus-visible:ring-offset-black flex items-center justify-center gap-3 overflow-hidden"
          aria-label="Connect wallet"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
          <Wallet className="w-6 h-6 relative z-10" />
          <span className="relative z-10">Connect Wallet</span>
        </button>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  // Real Solana Wallet Integration
  const { publicKey, disconnect, signTransaction, connect: walletAdapterConnect, select, connected, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const walletAddress = publicKey?.toBase58() || '';
  const walletConnected = !!publicKey;
  
  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
    if (checkMobile) {
      console.warn('⚠️ Mobile device detected - Solana wallets work best on desktop browsers');
    }
  }, []);
  
  // UI State
  const [isOnboarding, setIsOnboarding] = useState(true); // Start with onboarding
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showBetModal, setShowBetModal] = useState<Market | null>(null);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [solBalance, setSolBalance] = useState(0);

  // Markets State
  const [marketSubTab, setMarketSubTab] = useState<'EXPLORE' | 'PORTFOLIO'>('EXPLORE');

  const [betAmount, setBetAmount] = useState(0.5);
  const [betPosition, setBetPosition] = useState<'YES' | 'NO'>('YES');
  const [activeBets, setActiveBets] = useState<UserBet[]>([]);
  const [dailyInsight, setDailyInsight] = useState<string>("Analyzing biometric data...");
  
  // Data State (loaded from Supabase or mock)
  const [sleepHistory, setSleepHistory] = useState<SleepData[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string; total_rem_points: number; wallet_address: string }>>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfile | null>(null);

  // Simulation states
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); // For success animation
  const [isError, setIsError] = useState(false); // For error animation
  const [isScanning, setIsScanning] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setDataLoading(true);
      
      // Check connection
      const health = await dataLoader.checkConnection();
      console.log('🔌 Connection status:', health);
      
      // Load global data when API configured
      if (isSupabaseConfigured) {
        const [marketsData, leaderboardData] = await Promise.all([
          dataLoader.getActiveMarkets(),
          dataLoader.getLeaderboard(),
        ]);
        setMarkets(marketsData || []);
        setLeaderboard((leaderboardData as any) || []);
      } else {
        setMarkets([]);
        setLeaderboard([]);
      }
      
      setDataLoading(false);
    };
    
    loadInitialData();
  }, []);

  // Listen for direct wallet connection events (window.phantom/solflare)
  useEffect(() => {
    const handleAccountChange = (publicKey: any) => {
      if (publicKey) {
        console.log('🔄 Wallet account changed:', publicKey.toString());
      } else {
        console.log('👋 Wallet disconnected');
        setIsOnboarding(true);
      }
    };

    // Listen to Phantom events
    const windowPhantom = (window as any).phantom?.solana;
    if (windowPhantom) {
      windowPhantom.on('accountChanged', handleAccountChange);
      windowPhantom.on('disconnect', () => {
        console.log('👋 Phantom disconnected');
        setIsOnboarding(true);
      });
    }

    // Listen to Solflare events
    const windowSolflare = (window as any).solflare;
    if (windowSolflare) {
      windowSolflare.on('accountChanged', handleAccountChange);
      windowSolflare.on('disconnect', () => {
        console.log('👋 Solflare disconnected');
        setIsOnboarding(true);
      });
    }

    return () => {
      // Cleanup only listeners added by this component
      if (windowPhantom?.off) {
        windowPhantom.off('accountChanged', handleAccountChange);
      }
      if (windowSolflare?.off) {
        windowSolflare.off('accountChanged', handleAccountChange);
      }
    };
  }, []);

  // Load user-specific data when wallet connects
  useEffect(() => {
    if (walletConnected && walletAddress) {
      console.log('✅ Wallet connected:', walletAddress);

      const loadUserData = async () => {
        setDataLoading(true);

        try {
          if (isSupabaseConfigured) {
            console.log('🔐 Authenticating with Supabase...');
            const authenticated = await authenticateWithWallet(walletAddress);
            if (!authenticated) {
              console.error('❌ Failed to authenticate with Supabase');
              await disconnect();
              setIsOnboarding(true);
              setDataLoading(false);
              alert('Wallet connected but app auth failed. Please try again.');
              return;
            }
          } else {
            console.warn('⚠️ Supabase env not configured. Running wallet-only mode.');
          }

          console.log('📊 Loading user profile...');
          const profile = await dataLoader.getUserProfile(walletAddress);
          const fallbackProfile = {
            username: walletService.shortenAddress(walletAddress, 6),
            bio: 'Wallet connected',
            avatarUrl: '',
            rank: 0,
            solBalance: 0,
            remPoints: 0,
            streak: 0,
          };
          setUserProfile(profile || fallbackProfile);
          setTempProfile(profile || fallbackProfile);

          console.log('😴 Loading sleep history...');
          const sleep = await dataLoader.getSleepHistory(walletAddress);
          setSleepHistory(sleep || []);

          console.log('⌚ Loading devices...');
          const devices = await dataLoader.getUserDevices(walletAddress);
          setConnectedDevices(devices || []);

          console.log('🎲 Loading user bets...');
          const bets = await dataLoader.getUserBets(walletAddress);
          setActiveBets((bets as any) || []);

          const leaderboardData = await dataLoader.getLeaderboard();
          setLeaderboard((leaderboardData as any) || []);

          if (sleep && sleep.length > 0) {
            const today = sleep[sleep.length - 1];
            const insight = await generateSleepInsights(today);
            setDailyInsight(insight);
          } else {
            setDailyInsight('No sleep data yet. Connect a wearable to start tracking.');
          }

          setIsOnboarding(false);
          console.log('✅ All user data loaded!');
        } catch (error) {
          console.error('❌ Error loading user data:', error);
        } finally {
          setDataLoading(false);
        }
      };

      loadUserData();
    } else if (!walletConnected && !isOnboarding) {
      console.log('👋 Wallet disconnected, back to onboarding');
      setIsOnboarding(true);
    }
  }, [walletConnected, walletAddress]);

  const todaySleep = sleepHistory.length > 0 ? sleepHistory[sleepHistory.length - 1] : {
    date: 'Today',
    score: 0,
    remScore: 0,
    deepScore: 0,
    efficiency: 0,
    durationHours: 0,
    latencyMinutes: 0,
    wasoMinutes: 0,
  };

  const handleEnterGuest = () => {
    // Guest mode disabled - production requires real wallet
    alert('⚠️ Guest mode is disabled. Please connect a Solana wallet to continue.');
    setShowWalletModal(true);
  };

  const handleConnectWallet = async (walletType: 'Phantom' | 'Solflare') => {
    if (isLoading) return;
    console.log('🔌 Connecting wallet:', walletType);
    setIsLoading(true);

    const isSelectionRaceError = (err: any) => {
      const raw = `${String(err?.name || '')} ${String(err?.message || '')}`.toLowerCase();
      return raw.includes('walletnotselected') || raw.includes('wallet not selected');
    };

    try {
      // When switching wallets, disconnect current adapter first to avoid stale session race.
      if (connected) {
        try {
          await disconnect();
          await new Promise((r) => setTimeout(r, 120));
        } catch (disconnectErr) {
          console.warn('⚠️ Pre-switch disconnect warning:', disconnectErr);
        }
      }

      // Adapter selection can be async in wallet-standard, so retry connect a few times.
      let connectedOk = false;
      let lastError: any = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          select(walletType as any);
          const selectedName = wallet?.adapter?.name || 'none';
          console.log(`🧭 Wallet selected (attempt ${attempt + 1}):`, selectedName, '→', walletType);
          await new Promise((r) => setTimeout(r, 120 + attempt * 100));
          await walletAdapterConnect();
          connectedOk = true;
          break;
        } catch (err) {
          lastError = err;
          if (isSelectionRaceError(err) && attempt < 2) {
            console.warn(`⏳ Wallet selection not ready (attempt ${attempt + 1}), retrying...`);
            continue;
          }
          throw err;
        }
      }

      if (!connectedOk && lastError) throw lastError;

      console.log(`✅ Connected to ${walletType}`);
      setShowWalletModal(false);
    } catch (error: any) {
      console.error(`❌ ${walletType} connection failed:`, error);
      const message = String(error?.message || '').toLowerCase();
      const name = String(error?.name || '').toLowerCase();

      if (error?.code === 4001 || message.includes('rejected')) {
        alert('❌ Connection rejected. Please try again.');
      } else if (isSelectionRaceError(error) || name.includes('walletnotselected')) {
        alert('⚠️ Wallet adapter was still syncing. Please click connect again.');
      } else if (message.includes('walletnotready') || message.includes('not found') || message.includes('not installed')) {
        const installUrl = walletType === 'Phantom' ? 'https://phantom.app/download' : 'https://solflare.com/download';
        const install = confirm(`⚠️ ${walletType} not detected in this browser context. Open install page?`);
        if (install) window.open(installUrl, '_blank');
      } else {
        alert(`❌ Failed to connect to ${walletType}. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Sign out from Supabase
      await signOutFromSupabase();
      
      // Disconnect wallet
      await disconnect();
      setShowWalletDetails(false);
      setIsOnboarding(true);
      setActiveTab(Tab.HOME);
      // Clear user data
      setSleepHistory([]);
      setUserProfile(null);
      setConnectedDevices([]);
      setActiveBets([]);
      setSolBalance(0);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  // Fetch SOL balance when wallet connects
  useEffect(() => {
    if (publicKey) {
      walletService.getBalance(publicKey).then(balance => {
        setSolBalance(balance);
        console.log(`💰 SOL Balance: ${balance}`);
      });
    }
  }, [publicKey]);

  const handlePlaceBet = async () => {
    if (!showBetModal || !walletAddress || !publicKey || !signTransaction) return;
    setIsLoading(true);

    const entryPrice = betPosition === 'YES' ? showBetModal.yesPercent : showBetModal.noPercent;
    const potentialPayout = betAmount * (100 / Math.max(entryPrice, 1));

    try {
      // Force real wallet popup with a tiny on-chain transaction (devnet)
      const vaultAddress = import.meta.env.VITE_BET_VAULT || walletAddress;
      const tx = walletService.createTransferTransaction(
        publicKey,
        new PublicKey(vaultAddress),
        0.000001,
      );
      const txSig = await walletService.sendTransaction(tx, signTransaction, publicKey);

      const success = await dataLoader.placeBet(
        walletAddress,
        showBetModal.id,
        betAmount,
        betPosition,
        entryPrice,
        potentialPayout,
        txSig,
      );

      if (success) {
        const newBet: UserBet = {
          marketId: showBetModal.id,
          amount: betAmount,
          position: betPosition,
          entryPrice,
          potentialPayout,
          status: 'OPEN',
        };
        setActiveBets((prev) => [...prev, newBet]);
        setIsLoading(false);
        setTimeout(() => setIsSuccess(true), 100);
      } else {
        setIsLoading(false);
        setTimeout(() => setIsError(true), 100);
      }
    } catch (error) {
      console.error('❌ Bet placement error:', error);
      setIsLoading(false);
      setTimeout(() => setIsError(true), 100);
    }
  };

  const handleCloseBetModal = () => {
    setShowBetModal(null);
    setIsSuccess(false);
    setIsError(false);
    setBetAmount(0.5);
    setBetPosition('YES');
  };

  const toggleDevice = async (id: string) => {
    const device = connectedDevices.find(d => d.id === id);
    if (!device) return;
    
    const newConnected = !device.connected;
    await dataLoader.toggleDevice(id, newConnected);
    
    setConnectedDevices(prev => prev.map(d => 
      d.id === id ? { ...d, connected: newConnected, lastSync: newConnected ? new Date() : d.lastSync } : d
    ));
  };

  const handleScanDevices = () => {
    setIsScanning(true);
    setTimeout(() => {
        setIsScanning(false);
    }, 3000);
  };

  const handleSaveProfile = async () => {
    if (!tempProfile || !walletAddress) return;
    
    await dataLoader.updateProfile(walletAddress, {
      username: tempProfile.username,
      bio: tempProfile.bio,
      avatar_url: tempProfile.avatarUrl || undefined,
    });
    
    setUserProfile(tempProfile);
    setIsEditingProfile(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const key = import.meta.env.VITE_IMGBB_API_KEY || '5c5191a763d20c7fad2bfb62035d5210';
      const formData = new FormData();
      formData.append('image', file);

      const resp = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
        method: 'POST',
        body: formData,
      });

      const json = await resp.json();
      const uploadedUrl = json?.data?.url as string | undefined;
      if (!resp.ok || !uploadedUrl) {
        throw new Error(json?.error?.message || 'IMGBB upload failed');
      }

      setTempProfile((prev) => (prev ? { ...prev, avatarUrl: uploadedUrl } : prev));
    } catch (error) {
      console.error('❌ Avatar upload failed:', error);
      alert('Avatar upload failed. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // --- Views ---

  const renderDashboard = () => {
    if (dataLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <LoadingState text="LOADING DASHBOARD..." />
        </div>
      );
    }
    
    return (
    <div className="space-y-6 pb-28 animate-slide-up pt-4">
      {/* Header */}
      <div className="flex justify-between items-center px-2 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sport rounded flex items-center justify-center shadow-[0_0_10px_rgba(204,255,0,0.3)]">
            <Activity className="text-black w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight uppercase">SolREM</h1>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-sport animate-pulse"></span>
               <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">System Online</span>
               <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                 LIVE
               </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => walletConnected ? setShowWalletDetails(true) : setShowWalletModal(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${walletConnected ? 'border-sport/30 bg-sport/10 text-sport hover:bg-sport/20' : 'border-border bg-surface text-gray-400 hover:text-white'}`}
        >
          <Wallet className="w-4 h-4" />
          <span className="text-xs font-mono font-bold">
            {walletConnected ? walletService.shortenAddress(walletAddress, 4) : 'Connect'}
          </span>
        </button>
      </div>

      {/* Main Score */}
      <ScoreRing score={todaySleep.score} />

      {/* 6-Metric Breakdown Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* REM - 25% */}
        <MetricCard 
          label="REM Sleep" 
          value={`${todaySleep.remScore}%`} 
          subLabel="25% Weight"
          icon={<Brain className="w-4 h-4" />} 
          color="text-accent" 
          borderColor="border-accent/30"
        />
        {/* Deep - 20% */}
        <MetricCard 
          label="Deep Sleep" 
          value={`${todaySleep.deepScore}%`} 
          subLabel="20% Weight"
          icon={<Moon className="w-4 h-4" />} 
          color="text-secondary" 
          borderColor="border-secondary/30"
        />
        {/* Efficiency - 20% */}
        <MetricCard 
          label="Efficiency" 
          value={`${todaySleep.efficiency}%`} 
          subLabel="20% Weight"
          icon={<Zap className="w-4 h-4" />} 
          color="text-green-400" 
          borderColor="border-green-400/30"
        />
        {/* Duration - 15% */}
        <MetricCard 
          label="Duration" 
          value={`${todaySleep.durationHours}h`} 
          subLabel="15% Weight"
          icon={<Clock className="w-4 h-4" />} 
          color="text-purple-400" 
          borderColor="border-purple-400/30"
        />
        {/* Latency - 10% */}
        <MetricCard 
          label="Latency" 
          value={`${todaySleep.latencyMinutes}m`} 
          subLabel="10% Weight"
          icon={<Timer className="w-4 h-4" />} 
          color="text-orange-400" 
          borderColor="border-orange-400/30"
        />
        {/* WASO - 10% */}
        <MetricCard 
          label="WASO" 
          value={`${todaySleep.wasoMinutes}m`} 
          subLabel="10% Weight"
          icon={<AlertCircle className="w-4 h-4" />} 
          color="text-pink-400" 
          borderColor="border-pink-400/30"
        />
      </div>

      {/* Insight Panel */}
      <div className="glass-card p-4 rounded-sm border-l-4 border-l-sport">
        <div className="flex items-center gap-2 mb-2">
           <Zap className="w-4 h-4 text-sport" />
           <span className="text-xs font-bold uppercase tracking-widest text-sport">AI Analysis</span>
        </div>
        <p className="text-gray-300 text-sm font-sans leading-relaxed">
          {dailyInsight}
        </p>
      </div>

      {/* Chart */}
      <div className="glass-card p-4 rounded-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-mono text-sm font-bold uppercase text-gray-400">7-Day Trend</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">AVG</span>
            <span className="text-sm font-mono font-bold text-white">82.4</span>
          </div>
        </div>
        <SleepChart data={sleepHistory} />
      </div>
    </div>
    );
  };

  const renderMarkets = () => (
    <div className="space-y-4 pb-28 animate-slide-up pt-14">
      {/* Markets Header */}
      <div className="px-2 mb-4">
        <div className="flex justify-between items-center mb-4">
           <h1 className="text-2xl font-display font-bold uppercase tracking-tight">Prediction Markets</h1>
           {/* Sub-tabs */}
           <div className="flex bg-surfaceHighlight rounded p-1 border border-border">
              <button 
                onClick={() => setMarketSubTab('EXPLORE')}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${marketSubTab === 'EXPLORE' ? 'bg-surface text-sport shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Explore
              </button>
              <button 
                onClick={() => setMarketSubTab('PORTFOLIO')}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${marketSubTab === 'PORTFOLIO' ? 'bg-surface text-sport shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Portfolio
              </button>
           </div>
        </div>
      </div>

      {marketSubTab === 'EXPLORE' ? (
        <>
          {/* Explore - Featured */}
          <div className="flex items-center justify-between mt-2 px-2 mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Markets</span>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-mono text-red-500 font-bold">LIVE</span>
            </div>
          </div>

          <div className="space-y-3">
              {markets.length > 0 ? markets.map(market => (
              <div 
                  key={market.id} 
                  onClick={() => { setShowBetModal(market); setBetPosition('YES'); }}
                  className="glass-card p-0 rounded-sm overflow-hidden active:border-sport transition-all hover:bg-surfaceHighlight group cursor-pointer relative"
              >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sport to-transparent opacity-50"></div>
                  <div className="p-4">
                    {/* Top Row: Category & Timer */}
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] font-mono text-black bg-secondary px-2 py-0.5 rounded uppercase font-bold tracking-wider">{market.category}</span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                           <Clock className="w-3 h-3" /> Ends in {Math.floor((market.endsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60))}h
                        </span>
                    </div>

                    {/* Question */}
                    <h3 className="font-display font-bold text-lg mb-2 leading-snug group-hover:text-sport transition-colors">{market.question}</h3>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">{market.description}</p>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500 mb-4 border-t border-dashed border-gray-800 pt-2">
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-sport" /> ${market.volume.toLocaleString()} Vol
                        </div>
                        <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-accent" /> {market.poolSize} SOL Pool
                        </div>
                    </div>

                    {/* Trade Interface (Visual) */}
                    <div className="flex gap-2">
                        {/* Yes Button Visual */}
                        <div className="flex-1 bg-green-900/10 border border-green-500/30 rounded p-2 flex justify-between items-center group-hover:border-green-500/60 transition-colors">
                            <span className="text-xs font-bold text-green-500">YES</span>
                            <span className="text-sm font-mono font-bold text-green-400">{market.yesPercent}%</span>
                        </div>
                        {/* No Button Visual */}
                        <div className="flex-1 bg-red-900/10 border border-red-500/30 rounded p-2 flex justify-between items-center group-hover:border-red-500/60 transition-colors">
                            <span className="text-xs font-bold text-red-500">NO</span>
                            <span className="text-sm font-mono font-bold text-red-400">{market.noPercent}%</span>
                        </div>
                    </div>
                  </div>
              </div>
              )) : <EmptyState title="No Markets" subtitle="Check back later for new sleep challenges." />}
          </div>
        </>
      ) : (
        /* Portfolio Tab */
        <div className="space-y-4">
           <div className="glass-card p-4 rounded-sm flex items-center justify-between">
              <div>
                 <p className="text-[10px] text-gray-500 font-mono uppercase">Total Invested</p>
                 <p className="text-xl font-mono font-bold text-white">{activeBets.reduce((acc, bet) => acc + bet.amount, 0).toFixed(2)} SOL</p>
              </div>
              <div>
                 <p className="text-[10px] text-gray-500 font-mono uppercase text-right">Potential Return</p>
                 <p className="text-xl font-mono font-bold text-sport text-right">{activeBets.reduce((acc, bet) => acc + bet.potentialPayout, 0).toFixed(2)} SOL</p>
              </div>
           </div>

           <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">My Positions</span>
           </div>

           {activeBets.length > 0 ? (
             activeBets.map((bet, idx) => {
               // Find market info for context
               const market = markets.find(m => m.id === bet.marketId);
               const currentOdds = bet.position === 'YES' ? market?.yesPercent : market?.noPercent;
               const isWinning = currentOdds && bet.entryPrice && currentOdds >= bet.entryPrice;

               return (
                <div key={idx} className="glass-card p-4 rounded-sm border-l-2 border-l-sport">
                   <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${bet.position === 'YES' ? 'border-green-500/50 text-green-500 bg-green-500/10' : 'border-red-500/50 text-red-500 bg-red-500/10'}`}>
                        BOUGHT {bet.position}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                         {market?.category.toUpperCase()}
                      </span>
                   </div>
                   <h4 className="text-sm font-bold text-gray-200 mb-3 leading-tight">{market?.question}</h4>
                   
                   <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-gray-400 border-t border-gray-800 pt-2">
                      <div>
                         <span className="block text-gray-600">Invested</span>
                         <span className="text-white">{bet.amount} SOL</span>
                      </div>
                      <div>
                         <span className="block text-gray-600">Payout</span>
                         <span className="text-sport">{bet.potentialPayout.toFixed(2)} SOL</span>
                      </div>
                      <div className="text-right">
                         <span className="block text-gray-600">P&L</span>
                         <span className={`${isWinning ? 'text-green-500' : 'text-red-500'}`}>
                            {isWinning ? '+' : ''}{((currentOdds! - bet.entryPrice) / bet.entryPrice * 100).toFixed(1)}%
                         </span>
                      </div>
                   </div>
                </div>
               );
             })
           ) : (
             <EmptyState 
               title="No Active Bets" 
               subtitle="Visit the Explore tab to find markets." 
               action={<button onClick={() => setMarketSubTab('EXPLORE')} className="text-sport text-xs font-bold uppercase underline">Go Explore</button>} 
              />
           )}
        </div>
      )}
    </div>
  );

  const renderLeaderboard = () => (
    <div className="space-y-6 pb-28 animate-slide-up pt-14">
      <h1 className="text-2xl font-display font-bold uppercase tracking-tight px-2">Leaderboard</h1>
      
      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-3 py-6">
        {/* 2nd Place */}
        <div className="flex flex-col items-center gap-2">
          <Medal className="w-8 h-8 text-gray-400" />
          <div className="w-20 h-24 glass-card border-gray-500/30 flex items-end justify-center pb-2 relative">
             <span className="absolute top-2 text-xs font-mono text-gray-500">2ND</span>
             <div className="w-8 h-8 rounded-full bg-gray-500/20 mb-2"></div>
          </div>
        </div>
        {/* 1st Place */}
        <div className="flex flex-col items-center gap-2">
          <Trophy className="w-10 h-10 text-sport drop-shadow-[0_0_10px_rgba(204,255,0,0.5)]" />
          <div className="w-24 h-32 glass-card bg-sport/5 border-sport/50 flex items-end justify-center pb-2 relative shadow-[0_0_30px_rgba(204,255,0,0.1)]">
             <span className="absolute top-2 text-xs font-mono text-sport font-bold">1ST</span>
             <div className="w-10 h-10 rounded-full bg-sport/20 mb-2"></div>
          </div>
        </div>
        {/* 3rd Place */}
        <div className="flex flex-col items-center gap-2">
          <Medal className="w-8 h-8 text-orange-700" />
          <div className="w-20 h-20 glass-card border-orange-700/30 flex items-end justify-center pb-2 relative">
             <span className="absolute top-2 text-xs font-mono text-orange-700">3RD</span>
             <div className="w-8 h-8 rounded-full bg-orange-700/20 mb-2"></div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-sm overflow-hidden">
        {(leaderboard.length > 0 ? leaderboard : [{ username: 'NO_DATA', total_rem_points: 0, wallet_address: 'n/a' }]).map((item, idx) => {
          const rank = idx + 1;
          const isCurrentUser = !!walletAddress && item.wallet_address === walletAddress;
          return (
            <div key={`${item.wallet_address}-${idx}`} className={`p-4 flex items-center justify-between border-b border-border last:border-0 ${isCurrentUser ? 'bg-sport/5 border-l-2 border-l-sport' : ''}`}>
              <div className="flex items-center gap-4">
                <span className={`font-mono w-6 text-sm ${rank <= 3 ? 'text-sport' : 'text-gray-500'}`}>{rank}</span>
                <div className="flex flex-col">
                  <span className={`font-bold text-sm ${isCurrentUser ? 'text-white' : 'text-gray-300'}`}>
                    {String(item.username || 'UNKNOWN').toUpperCase()}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">WALLET {walletService.shortenAddress(item.wallet_address || 'n/a', 4)}</span>
                </div>
              </div>
              <span className="font-mono font-bold text-accent">{Number(item.total_rem_points || 0)} PTS</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDevice = () => (
    <div className="space-y-6 pb-28 animate-slide-up pt-14">
      <div className="flex justify-between items-center px-2">
        <h1 className="text-2xl font-display font-bold uppercase tracking-tight">Data Sources</h1>
        {isScanning ? (
             <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface border border-border">
                <RefreshCw className="w-4 h-4 text-sport animate-spin" />
                <span className="text-xs font-mono text-gray-300">SCANNING...</span>
             </div>
        ) : (
            <button 
                onClick={handleScanDevices}
                className="bg-surface text-white border border-border px-4 py-2 rounded-sm text-xs font-bold uppercase flex items-center gap-2 hover:bg-white/5 transition-colors"
            >
                <Bluetooth className="w-4 h-4 text-sport" /> Scan Devices
            </button>
        )}
      </div>
      
      {connectedDevices.length > 0 ? (
        <div className="grid gap-3">
            {connectedDevices.map(device => (
            <div key={device.id} className={`glass-card p-4 rounded-sm flex items-center justify-between ${device.connected ? 'border-l-4 border-l-sport' : 'opacity-70'}`}>
                <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded flex items-center justify-center ${device.connected ? 'bg-sport/10 text-sport' : 'bg-surfaceHighlight text-gray-500'}`}>
                    {device.type === 'WHOOP' ? <Activity className="w-5 h-5" /> : <Watch className="w-5 h-5" />}
                </div>
                <div>
                    <h3 className="font-bold text-sm uppercase tracking-wide">{device.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                    {device.connected ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-sport animate-pulse"></span>
                            <span className="text-[10px] text-sport font-mono">LIVE SYNC</span>
                        </>
                    ) : (
                        <span className="text-[10px] text-gray-500 font-mono">OFFLINE</span>
                    )}
                    </div>
                </div>
                </div>
                <div className="flex items-center gap-4">
                {device.connected && device.batteryLevel && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
                        <Battery className="w-3 h-3" /> {device.batteryLevel}%
                    </div>
                )}
                <button 
                    onClick={() => toggleDevice(device.id)}
                    className={`p-2 rounded hover:bg-white/10 ${device.connected ? 'text-red-400' : 'text-sport'}`}
                >
                    {device.connected ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                </button>
                </div>
            </div>
            ))}
        </div>
      ) : (
          <EmptyState 
            title="No Devices Found" 
            subtitle="Ensure your wearable is in pairing mode and bluetooth is active." 
            action={
                <button onClick={handleScanDevices} className="text-sport text-xs font-bold uppercase underline decoration-dashed underline-offset-4">Try Again</button>
            }
          />
      )}
      
      <div className="glass-card p-4 rounded-sm border-dashed border-gray-700">
         <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase text-gray-400">Sync Interval</h3>
            <span className="text-xs font-mono text-sport">AUTO (15M)</span>
         </div>
      </div>
    </div>
  );

  const renderResources = () => (
    <div className="space-y-6 pb-28 animate-slide-up pt-14">
      <div className="px-2">
        <h1 className="text-2xl font-display font-bold uppercase tracking-tight mb-1">Resources</h1>
        <p className="text-xs text-gray-500 font-mono">RESEARCH, PODCASTS & GUIDES</p>
      </div>

      <div className="space-y-4">
        {RESOURCES.map(resource => (
          <div key={resource.id} className="glass-card rounded-sm overflow-hidden group">
             <div className={`h-24 bg-gradient-to-r ${resource.thumbnailColor} relative`}>
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                   <div className="bg-black/60 backdrop-blur-sm p-1.5 rounded-full">
                      {resource.type === 'ARTICLE' && <BookOpen className="w-4 h-4 text-white" />}
                      {resource.type === 'VIDEO' && <PlayCircle className="w-4 h-4 text-white" />}
                      {resource.type === 'PODCAST' && <Headphones className="w-4 h-4 text-white" />}
                   </div>
                   <span className="text-[10px] font-bold uppercase text-white tracking-wide bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">{resource.type}</span>
                </div>
             </div>
             <div className="p-4">
                <h3 className="text-lg font-bold leading-tight mb-2 text-gray-100">{resource.title}</h3>
                <p className="text-xs text-gray-400 mb-4 line-clamp-2">{resource.description}</p>
                <div className="flex justify-between items-center">
                   <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{resource.author}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{resource.duration}</span>
                   </div>
                   <a 
                      href={resource.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-surfaceHighlight border border-border rounded-sm text-xs font-bold uppercase hover:bg-sport hover:text-black hover:border-sport transition-all"
                   >
                      {resource.type === 'ARTICLE' ? 'Read' : resource.type === 'VIDEO' ? 'Watch' : 'Listen'}
                      <ExternalLink className="w-3 h-3" />
                   </a>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!userProfile) {
      return (
        <div className="flex items-center justify-center h-screen">
          <LoadingState text="LOADING PROFILE..." />
        </div>
      );
    }
    
    // Determine which avatar URL to display: editing preview or saved profile
    const displayAvatar = isEditingProfile && tempProfile ? tempProfile.avatarUrl : userProfile.avatarUrl;

    return (
      <div className="space-y-6 pb-28 animate-slide-up pt-14">
        <div className="text-center pt-8 pb-4 relative">
          {/* Avatar */}
          <div className="w-24 h-24 mx-auto rounded-full border-2 border-sport p-1 mb-4 relative group">
            <div className="w-full h-full rounded-full bg-surfaceHighlight flex items-center justify-center overflow-hidden">
               {displayAvatar ? (
                 <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <User className="w-10 h-10 text-gray-400" />
               )}
            </div>
            
            {isEditingProfile ? (
              <label className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full cursor-pointer hover:bg-black/40 transition-colors">
                 <Upload className="w-6 h-6 text-white opacity-80" />
                 <input 
                   type="file" 
                   accept="image/*" 
                   onChange={handleImageUpload} 
                   className="hidden" 
                 />
              </label>
            ) : (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-sport rounded-full flex items-center justify-center border-4 border-dark z-10">
                 <Award className="w-4 h-4 text-black" />
              </div>
            )}
          </div>
  
          {isEditingProfile && tempProfile ? (
            <div className="px-6 space-y-4 animate-fade-in">
               <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Profile Photo</label>
                  <label className="flex items-center justify-center w-full p-3 border border-dashed border-border rounded-sm cursor-pointer hover:border-sport hover:bg-surfaceHighlight transition-colors group">
                      <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-gray-400 group-hover:text-sport" />
                          <span className="text-xs font-mono text-gray-400 group-hover:text-white">{isUploadingAvatar ? 'Uploading...' : 'Tap to upload image'}</span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                  </label>
               </div>
               <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Username</label>
                  <input 
                    type="text" 
                    value={tempProfile.username} 
                    onChange={(e) => setTempProfile({...tempProfile, username: e.target.value})}
                    className="w-full bg-surface border border-border p-2 rounded-sm text-sm font-bold focus:border-sport focus:outline-none"
                  />
               </div>
               <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Bio</label>
                  <textarea 
                    value={tempProfile.bio} 
                    onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})}
                    className="w-full bg-surface border border-border p-2 rounded-sm text-xs font-sans focus:border-sport focus:outline-none h-20"
                  />
               </div>
               <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-2 border border-border rounded-sm text-xs font-bold uppercase text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="flex-1 py-2 bg-sport text-black rounded-sm text-xs font-bold uppercase hover:bg-sport/90 flex items-center justify-center gap-2"
                  >
                    <Save className="w-3 h-3" /> Save Changes
                  </button>
               </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-display font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                {userProfile.username}
                <button onClick={() => { setTempProfile(userProfile); setIsEditingProfile(true); }} className="text-gray-600 hover:text-white">
                  <Edit2 className="w-3 h-3" />
                </button>
              </h1>
              <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto italic">"{userProfile.bio}"</p>
              <p className="text-sport font-mono text-[10px] mt-3 uppercase tracking-wider">RANK #{userProfile.rank} // ELITE TIER</p>
            </>
          )}
        </div>
  
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 rounded-sm text-center border-t-2 border-t-secondary">
            <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">Wallet Balance</p>
            <p className="text-2xl font-mono font-bold text-white flex justify-center items-center gap-1">
               <Wallet className="w-4 h-4 text-gray-500" />
               {solBalance.toFixed(2)}
            </p>
            <p className="text-[8px] text-gray-600 font-mono mt-1">SOL</p>
          </div>
          <div className="glass-card p-4 rounded-sm text-center border-t-2 border-t-accent">
            <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">Lifetime REM Points</p>
            <p className="text-2xl font-mono font-bold text-accent">{userProfile.remPoints}</p>
          </div>
        </div>
  
        <div className="glass-card rounded-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-surfaceHighlight">
             <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Recent Transactions</span>
          </div>
          {activeBets.length > 0 ? (
            activeBets.map((bet, idx) => (
              <div key={idx} className="p-4 border-b border-border flex justify-between items-center hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-sm ${bet.position === 'YES' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                     <div className="text-xs font-bold text-white uppercase">Prediction Market</div>
                     <div className="text-[10px] text-gray-500 font-mono">ID: {bet.marketId}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-white">{bet.amount} SOL</div>
                  <div className="text-[10px] text-accent font-mono">POTENTIAL: {bet.potentialPayout.toFixed(2)}</div>
                </div>
              </div>
            ))
          ) : (
              <div className="py-8">
                  <EmptyState title="No History" subtitle="Your transaction history will appear here." icon={<Clock className="w-8 h-8 text-gray-600"/>} />
              </div>
          )}
        </div>
      </div>
    );
  };

  if (isOnboarding) {
      return (
        <>
          <LandingPage onOpenConnect={() => setShowWalletModal(true)} onGuest={handleEnterGuest} />
          <WalletModal
            isOpen={showWalletModal}
            isLoading={isLoading}
            isMobile={isMobile}
            onClose={() => setShowWalletModal(false)}
            onSelectWallet={handleConnectWallet}
            LoadingComponent={<LoadingState text="CONNECTING..." />}
          />
        </>
      );
  }

  return (
    <div className="min-h-screen font-sans bg-dark text-gray-200 selection:bg-sport/30 overflow-hidden relative">
      
      {/* Background Effects for Internal Pages */}
      <AmbientBackground />

      {/* Main Content Area - Reduced max-width for better spacing */}
      <main className="relative z-10 max-w-sm mx-auto h-screen overflow-y-auto overflow-x-hidden px-1">
        {activeTab === Tab.HOME && renderDashboard()}
        {activeTab === Tab.MARKETS && renderMarkets()}
        {activeTab === Tab.LEADERBOARD && renderLeaderboard()}
        {activeTab === Tab.DEVICE && renderDevice()}
        {activeTab === Tab.RESOURCES && renderResources()}
        {activeTab === Tab.PROFILE && renderProfile()}
      </main>

      {/* Sporty Bottom Nav - Larger size */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-8 pt-6 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="glass-panel px-6 py-4 rounded-full flex gap-8 shadow-2xl border border-border backdrop-blur-xl">
          <NavButton icon={<Home />} label="DASH" active={activeTab === Tab.HOME} onClick={() => setActiveTab(Tab.HOME)} />
          <NavButton icon={<BarChart2 />} label="MKTS" active={activeTab === Tab.MARKETS} onClick={() => setActiveTab(Tab.MARKETS)} />
          <NavButton icon={<Trophy />} label="LEAD" active={activeTab === Tab.LEADERBOARD} onClick={() => setActiveTab(Tab.LEADERBOARD)} />
          <NavButton icon={<Watch />} label="SYNC" active={activeTab === Tab.DEVICE} onClick={() => setActiveTab(Tab.DEVICE)} />
          <NavButton icon={<BookOpen />} label="LEARN" active={activeTab === Tab.RESOURCES} onClick={() => setActiveTab(Tab.RESOURCES)} />
          <NavButton icon={<User />} label="PRO" active={activeTab === Tab.PROFILE} onClick={() => setActiveTab(Tab.PROFILE)} />
        </div>
      </div>

      {/* Wallet Modal (In-App) - Reusable Component */}
      <WalletModal
        isOpen={showWalletModal}
        isLoading={isLoading}
        isMobile={isMobile}
        onClose={() => setShowWalletModal(false)}
        onSelectWallet={handleConnectWallet}
        LoadingComponent={<LoadingState text="CONNECTING..." />}
      />

      {/* Wallet Details / Disconnect Modal - Centered */}
      {showWalletDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="glass-card w-full max-w-sm rounded-sm p-6 border border-border shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-display font-bold uppercase">Wallet</h2>
                    <button onClick={() => setShowWalletDetails(false)}><X className="text-gray-400 hover:text-white" /></button>
                 </div>
                 <div className="bg-surfaceHighlight p-4 rounded-sm mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600"></div>
                      <div className="flex-1">
                          <div className="text-xs text-gray-400 font-mono">Connected Address</div>
                          <div className="text-sm font-bold font-mono text-white">
                            {walletService.shortenAddress(walletAddress, 6)}
                          </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-700 pt-3">
                      <div className="text-xs text-gray-400 mb-1">Balance</div>
                      <div className="text-lg font-bold text-sport">{solBalance.toFixed(4)} SOL</div>
                    </div>
                 </div>
                 <button 
                    onClick={handleDisconnect}
                    className="w-full border border-red-500/30 text-red-500 hover:bg-red-500/10 p-4 rounded-sm flex items-center justify-center gap-2 font-bold uppercase text-sm transition-colors"
                 >
                    <LogOut className="w-4 h-4" /> Disconnect
                 </button>
             </div>
        </div>
      )}

      {/* Betting Modal (Redesigned) - Centered */}
      {showBetModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            {isLoading ? (
                <div className="glass-panel w-full max-w-md rounded-xl p-8 border border-sport/20 shadow-2xl animate-slide-up bg-[#09090b]">
                   <LoadingState text="CONFIRMING ORDER..." />
                </div>
            ) : isSuccess ? (
                <div className="glass-panel w-full max-w-md rounded-xl p-8 border border-green-500/30 shadow-2xl animate-slide-up bg-[#09090b]">
                   <SuccessState 
                     text="Order Filled" 
                     subtext={`You successfully purchased ${betPosition} shares in market ${showBetModal.id}.`}
                     onDismiss={handleCloseBetModal}
                   />
                </div>
            ) : isError ? (
                <div className="glass-panel w-full max-w-md rounded-xl p-8 border border-red-500/30 shadow-2xl animate-slide-up bg-[#09090b]">
                   <ErrorState 
                     text="Order Failed" 
                     subtext="Unable to place bet. Please check your connection or try again later."
                     onDismiss={handleCloseBetModal}
                   />
                </div>
            ) : (
                <div className="glass-panel w-full max-w-md rounded-xl border border-border shadow-2xl animate-slide-up bg-[#09090b] flex flex-col max-h-[85vh]">
                    {/* Header */}
                    <div className="flex justify-between items-start p-6 border-b border-border">
                        <div>
                            <span className="text-[10px] text-gray-500 font-mono border border-gray-700 px-2 py-0.5 rounded uppercase">{showBetModal.category}</span>
                            <h2 className="text-lg font-display font-bold leading-tight mt-2">{showBetModal.question}</h2>
                        </div>
                        <button onClick={handleCloseBetModal}><X className="text-gray-400 hover:text-white" /></button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto p-6 space-y-6">
                        {/* Outcome Toggle */}
                        <div className="flex bg-surfaceHighlight p-1 rounded-md">
                            <button 
                                onClick={() => setBetPosition('YES')}
                                className={`flex-1 py-2 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-2 ${betPosition === 'YES' ? 'bg-green-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                BUY YES <span className="font-mono text-[10px] opacity-80">{showBetModal.yesPercent}%</span>
                            </button>
                            <button 
                                onClick={() => setBetPosition('NO')}
                                className={`flex-1 py-2 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-2 ${betPosition === 'NO' ? 'bg-red-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                BUY NO <span className="font-mono text-[10px] opacity-80">{showBetModal.noPercent}%</span>
                            </button>
                        </div>

                        {/* Order Input */}
                        <div className="bg-surface p-4 rounded-sm border border-border">
                            <div className="flex justify-between text-xs text-gray-400 mb-2 font-mono uppercase">
                                <span>Amount (SOL)</span>
                                <span>Balance: 12.45 SOL</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-gray-500" />
                                <input 
                                    type="number" 
                                    value={betAmount} 
                                    onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                                    className="bg-transparent text-2xl font-mono font-bold text-white focus:outline-none w-full"
                                    step="0.1"
                                    min="0.1"
                                />
                            </div>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="10" 
                                step="0.1" 
                                value={betAmount} 
                                onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sport mt-4"
                            />
                        </div>

                        {/* Order Summary */}
                        <div className="space-y-2 text-xs font-mono">
                            <div className="flex justify-between text-gray-400">
                                <span>Est. Shares</span>
                                <span className="text-white">{(betAmount / ((betPosition === 'YES' ? showBetModal.yesPercent : showBetModal.noPercent) / 100)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Potential Payout</span>
                                <span className="text-sport">{(betAmount * (100 / (betPosition === 'YES' ? showBetModal.yesPercent : showBetModal.noPercent))).toFixed(2)} SOL</span>
                            </div>
                             <div className="flex justify-between text-gray-400">
                                <span>Return on Investment</span>
                                <span className="text-green-500">+{((100 / (betPosition === 'YES' ? showBetModal.yesPercent : showBetModal.noPercent) - 1) * 100).toFixed(0)}%</span>
                            </div>
                        </div>

                        {/* Rules/Info Accordion */}
                        <div className="border-t border-border pt-4">
                            <div className="flex items-start gap-2 text-xs text-gray-500">
                                <Info className="w-4 h-4 min-w-[16px]" />
                                <p>{showBetModal.rules}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="p-6 border-t border-border bg-surface/50">
                        <button 
                            onClick={handlePlaceBet}
                            className={`w-full py-4 rounded-sm font-bold uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${betPosition === 'YES' ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-black hover:bg-red-400'}`}
                        >
                            Place Order {betAmount} SOL
                        </button>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

// Subcomponents

const MetricCard: React.FC<{ 
  label: string; 
  value: string; 
  subLabel: string;
  icon: React.ReactNode; 
  color: string;
  borderColor: string;
}> = ({ label, value, subLabel, icon, color, borderColor }) => (
  <div className={`glass-card p-3 rounded-sm flex flex-col justify-between h-24 border-l-2 ${borderColor}`}>
    <div className="flex justify-between items-start">
       <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">{label}</span>
       <div className={color}>{icon}</div>
    </div>
    <div>
       <span className={`text-xl font-mono font-bold tracking-tight block ${color}`}>{value}</span>
       <span className="text-[9px] text-gray-600 font-mono uppercase">{subLabel}</span>
    </div>
  </div>
);

const NavButton: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 transition-all duration-200 group relative ${active ? 'text-sport' : 'text-gray-600 hover:text-gray-400'}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { size: 24, strokeWidth: active ? 2.5 : 2 })}
    <span className={`text-[9px] font-bold font-mono tracking-widest ${active ? 'opacity-100' : 'opacity-0'} absolute -bottom-5 whitespace-nowrap transition-opacity`}>
      {label}
    </span>
    {active && <div className="absolute -top-4 w-1.5 h-1.5 rounded-full bg-sport shadow-[0_0_8px_#ccff00]"></div>}
  </button>
);

export default App;