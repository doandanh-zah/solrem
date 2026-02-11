/**
 * Solana Service - Wallet Adapter Integration
 * Uses @solana/wallet-adapter-react for proper Phantom/Solflare/Backpack support
 * 
 * NOTE: This file builds transaction structures but does NOT execute them.
 * Actual execution requires a connected wallet with the wallet adapter context.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// Program ID from Anchor deployment
export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || 'SoLrEmPrEdIcTiOnMaRkEtS1111111111111111111',
);

// Network configuration
export const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
export const RPC_ENDPOINT =
  NETWORK === 'mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';

export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

/**
 * Instruction discriminator for Anchor programs
 * 8-byte method identifier
 */
export const INSTRUCTION_DISCRIMINATORS = {
  create_market: [184, 14, 59, 50, 140, 226, 197, 176],
  place_bet: [59, 182, 63, 124, 87, 101, 35, 221],
  resolve_market: [78, 48, 140, 62, 173, 184, 127, 52],
  claim_winnings: [183, 213, 100, 140, 127, 96, 82, 15],
} as const;

/**
 * Get token mint address for the platform
 */
export const getTokenMint = (): PublicKey => {
  return new PublicKey(import.meta.env.VITE_TOKEN_MINT || 'SoLrEm1111111111111111111111111111111111');
};

/**
 * Create a transaction for placing a bet
 * 
 * @param walletPublicKey - Connected wallet's public key
 * @param marketId - Market identifier (u64)
 * @param amount - Bet amount in lamports
 * @param direction - 'YES' or 'NO'
 * @returns Unsigned Transaction ready to be signed
 */
export const createBetTransaction = async (
  walletPublicKey: string,
  marketId: string,
  amount: number,
  direction: 'YES' | 'NO',
): Promise<Transaction> => {
  const walletPubkey = new PublicKey(walletPublicKey);
  const marketIdNum = BigInt(marketId);
  const mint = getTokenMint();

  // Find market PDA
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(marketIdNum.toLeBytes())],
    PROGRAM_ID,
  );

  // Find bet PDA
  const [betPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('bet'), marketPda.toBuffer(), walletPubkey.toBuffer()],
    PROGRAM_ID,
  );

  // Find market's token account
  const [marketTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), mint.toBuffer(), walletPubkey.toBuffer()],
    PROGRAM_ID,
  );

  // Create associated token account for wallet if needed
  // In production, you'd check if it exists first

  const transaction = new Transaction();

  // Add the place_bet instruction
  // Note: Actual instruction data encoding depends on Anchor IDL
  // This is a placeholder structure
  const instruction = new Transaction().add({
    keys: [
      { pubkey: marketPda, isSigner: false, isWritable: true },
      { pubkey: betPda, isSigner: false, isWritable: true },
      { pubkey: walletPubkey, isSigner: true, isWritable: true },
      { pubkey: walletPubkey, isSigner: false, isWritable: true }, // token account
      { pubkey: marketTokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
  });

  // For now, use a simple SOL transfer as placeholder
  // Replace with actual Anchor instruction when IDL is available
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: walletPubkey,
    toPubkey: marketPda,
    lamports: amount,
  });

  transaction.add(transferInstruction);

  // Set transaction metadata
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPubkey;

  return transaction;
};

/**
 * Create a transaction for claiming winnings
 * 
 * @param walletPublicKey - Connected wallet's public key
 * @param marketId - Market identifier
 * @returns Unsigned Transaction ready to be signed
 */
export const createClaimTransaction = async (
  walletPublicKey: string,
  marketId: string,
): Promise<Transaction> => {
  const walletPubkey = new PublicKey(walletPublicKey);
  const marketIdNum = BigInt(marketId);
  const mint = getTokenMint();

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(marketIdNum.toLeBytes())],
    PROGRAM_ID,
  );

  const [betPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('bet'), marketPda.toBuffer(), walletPubkey.toBuffer()],
    PROGRAM_ID,
  );

  const transaction = new Transaction();

  // Add claim_winnings instruction placeholder
  // This would be the actual Anchor CPI call
  const instruction = {
    keys: [
      { pubkey: marketPda, isSigner: false, isWritable: true },
      { pubkey: betPda, isSigner: false, isWritable: true },
      { pubkey: walletPubkey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
  };

  transaction.add(instruction);

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPubkey;

  return transaction;
};

/**
 * Create a transaction for resolving a market (creator only)
 * 
 * @param walletPublicKey - Creator's wallet public key
 * @param marketId - Market identifier
 * @param outcome - Market outcome ('YES' or 'NO')
 * @returns Unsigned Transaction
 */
export const createResolveTransaction = async (
  walletPublicKey: string,
  marketId: string,
  outcome: 'YES' | 'NO',
): Promise<Transaction> => {
  const walletPubkey = new PublicKey(walletPublicKey);
  const marketIdNum = BigInt(marketId);

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(marketIdNum.toLeBytes())],
    PROGRAM_ID,
  );

  const transaction = new Transaction();

  const instruction = {
    keys: [
      { pubkey: marketPda, isSigner: false, isWritable: true },
      { pubkey: walletPubkey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
  };

  transaction.add(instruction);

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPubkey;

  return transaction;
};

/**
 * Get SOL balance for a public key
 */
export const getBalance = async (publicKey: string): Promise<number> => {
  try {
    const pubKey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
};

/**
 * Request airdrop (Devnet only)
 */
export const requestAirdrop = async (publicKey: string): Promise<boolean> => {
  if (NETWORK !== 'devnet') {
    console.error('Airdrops only available on devnet');
    return false;
  }

  try {
    const pubKey = new PublicKey(publicKey);
    const signature = await connection.requestAirdrop(
      pubKey,
      2 * LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(signature);
    console.log('Airdrop successful:', signature);
    return true;
  } catch (error) {
    console.error('Airdrop error:', error);
    return false;
  }
};

/**
 * Fetch market account data from the program
 * Requires: Valid RPC endpoint + program ID
 */
export const getMarketData = async (marketId: string): Promise<any | null> => {
  try {
    const marketIdNum = BigInt(marketId);
    
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), Buffer.from(marketIdNum.toLeBytes())],
      PROGRAM_ID,
    );

    const accountInfo = await connection.getParsedAccountInfo(marketPda);
    
    if (!accountInfo.value) {
      return null;
    }

    // Parse the account data based on Anchor struct layout
    // This is a simplified version - actual parsing depends on IDL
    const data = accountInfo.value.data as Buffer;
    
    return {
      publicKey: marketPda.toString(),
      marketId: marketIdNum,
      // Add other fields as needed
    };
  } catch (error) {
    console.error('Error fetching market data:', error);
    return null;
  }
};

/**
 * Get all markets (requires full RPC + account iteration)
 * NOTE: This is computationally expensive and may timeout
 */
export const getAllMarkets = async (): Promise<any[]> => {
  try {
    // Method 1: Using getProgramAccounts (may not work on all RPCs)
    const accounts = await connection.getProgramAccounts(PROGRAM_ID);
    
    return accounts.map(acc => ({
      pubkey: acc.pubkey.toString(),
      // Parse account data...
    }));
  } catch (error) {
    console.error('Error fetching all markets:', error);
    return [];
  }
};

export default {
  PROGRAM_ID,
  NETWORK,
  RPC_ENDPOINT,
  connection,
  createBetTransaction,
  createClaimTransaction,
  createResolveTransaction,
  getBalance,
  requestAirdrop,
  getMarketData,
  getAllMarkets,
};
