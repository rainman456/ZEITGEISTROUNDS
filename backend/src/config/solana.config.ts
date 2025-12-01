import { Connection, Keypair, PublicKey, clusterApiUrl, Commitment } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class SolanaConfig {
  private static instance: SolanaConfig;
  
  public connection: Connection;
  public programId: PublicKey;
  public payerKeypair: Keypair;
  public platformWallet: PublicKey;
  public network: string;
  public rpcUrl: string;

  private constructor() {
    try {
      // Initialize network
      this.network = process.env.SOLANA_NETWORK || 'devnet';
      
      // Initialize RPC URL with fallback
      this.rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
      
      // Get commitment level
      const commitment = (process.env.RPC_COMMITMENT as Commitment) || 'confirmed';
      
      // Get timeout (default 30 seconds)
      const timeout = parseInt(process.env.RPC_TIMEOUT || '30000');
      
      // Initialize connection with custom config
      this.connection = new Connection(this.rpcUrl, {
        commitment,
        confirmTransactionInitialTimeout: timeout,
        wsEndpoint: this.getWebSocketEndpoint(this.rpcUrl),
      });
      
      console.log(`🔗 Connected to: ${this.rpcUrl}`);
      console.log(`📊 Commitment level: ${commitment}`);
      
      // Load program ID
      const programIdStr = process.env.PROGRAM_ID;
      if (!programIdStr) {
        throw new Error('PROGRAM_ID not found in .env file');
      }
      this.programId = new PublicKey(programIdStr);
      
      // Load payer keypair
      const keypairPath = process.env.PAYER_KEYPAIR_PATH || './keypairs/payer.json';
      const absoluteKeypairPath = path.isAbsolute(keypairPath) 
        ? keypairPath 
        : path.join(process.cwd(), keypairPath);
      
      if (!fs.existsSync(absoluteKeypairPath)) {
        throw new Error(
          `Keypair file not found at ${absoluteKeypairPath}\n` +
          `Run: npm run keygen`
        );
      }
      
      const keypairData = JSON.parse(fs.readFileSync(absoluteKeypairPath, 'utf-8'));
      this.payerKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
      
      // Load platform wallet
      const platformWalletStr = process.env.PLATFORM_WALLET;
      if (!platformWalletStr) {
        console.warn('⚠️  PLATFORM_WALLET not set in .env, using payer as platform wallet');
        this.platformWallet = this.payerKeypair.publicKey;
      } else {
        this.platformWallet = new PublicKey(platformWalletStr);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize Solana configuration:', error);
      throw error;
    }
  }

  // Helper to derive WebSocket endpoint from HTTP RPC URL
  private getWebSocketEndpoint(rpcUrl: string): string | undefined {
    try {
      // OnFinality WebSocket endpoint
      if (rpcUrl.includes('white-winter-wildflower.solana-devnet.quiknode.pro')) {
        return rpcUrl.replace('https://', 'wss://');
      }
      
      // Standard Solana WebSocket
      if (rpcUrl.includes('api.devnet.solana.com')) {
        return 'wss://api.devnet.solana.com';
      }
      
      // Let Connection class handle default
      return undefined;
    } catch {
      return undefined;
    }
  }

  public static getInstance(): SolanaConfig {
    if (!SolanaConfig.instance) {
      SolanaConfig.instance = new SolanaConfig();
    }
    return SolanaConfig.instance;
  }

  // Helper method to get current slot
  public async getCurrentSlot(): Promise<number> {
    return await this.connection.getSlot();
  }

  // Helper method to get payer balance
  public async getPayerBalance(): Promise<number> {
    return await this.connection.getBalance(this.payerKeypair.publicKey);
  }

  // Helper method to test RPC performance
  public async testRPCPerformance(): Promise<{ latency: number; tps: number }> {
    const start = Date.now();
    await this.connection.getSlot();
    const latency = Date.now() - start;
    
    const perfSamples = await this.connection.getRecentPerformanceSamples(1);
    const tps = perfSamples[0]?.numTransactions / perfSamples[0]?.samplePeriodSecs || 0;
    
    return { latency, tps };
  }

  // Helper method to request airdrop (devnet only)
  public async requestAirdrop(lamports: number = 1_000_000_000): Promise<string> {
    if (this.network !== 'devnet') {
      throw new Error('Airdrops only available on devnet');
    }
    
    console.log(`🪂 Requesting airdrop of ${lamports / 1e9} SOL...`);
    const signature = await this.connection.requestAirdrop(
      this.payerKeypair.publicKey,
      lamports
    );
    
    await this.connection.confirmTransaction(signature, 'confirmed');
    console.log(`✅ Airdrop confirmed: ${signature}`);
    return signature;
  }

  // Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing Solana Client Service...\n');
    
    try {
      const config = SolanaConfig.getInstance();
      
      // Test 1: Configuration loaded
      console.log('✓ Test 1: Configuration loaded successfully');
      console.log(`  Network: ${config.network}`);
      console.log(`  RPC URL: ${config.rpcUrl}`);
      
      // Test 2: Connection test with latency measurement
      console.log('\nTest 2: Testing connection performance...');
      const start = Date.now();
      const slot = await config.getCurrentSlot();
      const latency = Date.now() - start;
      console.log(`✓ Current slot: ${slot} (latency: ${latency}ms)`);
      
      if (latency > 1000) {
        console.log('⚠️  High latency detected. Consider checking RPC endpoint.');
      } else if (latency < 200) {
        console.log('✨ Excellent RPC performance!');
      }
      
      // Test 3: RPC Performance Stats
      console.log('\nTest 3: Checking RPC performance...');
      try {
        const { latency: avgLatency, tps } = await config.testRPCPerformance();
        console.log(`✓ Average latency: ${avgLatency}ms`);
        console.log(`✓ Network TPS: ${Math.round(tps)}`);
      } catch (error) {
        console.log('⚠️  Could not fetch performance metrics (non-critical)');
      }
      
      // Test 4: Program ID validation
      console.log('\nTest 4: Validating program ID...');
      console.log(`✓ Program ID: ${config.programId.toBase58()}`);
      
      // Test 5: Payer keypair
      console.log('\nTest 5: Payer keypair loaded');
      console.log(`✓ Payer address: ${config.payerKeypair.publicKey.toBase58()}`);
      
      // Test 6: Check balance
      console.log('\nTest 6: Checking payer balance...');
      const balance = await config.getPayerBalance();
      const balanceInSol = balance / 1e9;
      console.log(`✓ Payer balance: ${balanceInSol.toFixed(4)} SOL (${balance} lamports)`);
      
      if (balance === 0) {
        console.log('\n⚠️  WARNING: Payer has 0 SOL!');
        console.log('   Run one of these commands:');
        console.log(`   1. solana airdrop 2 ${config.payerKeypair.publicKey.toBase58()} --url devnet`);
        console.log(`   2. npm run airdrop`);
        console.log('\n   Attempting automatic airdrop...');
        
        try {
          await config.requestAirdrop();
          const newBalance = await config.getPayerBalance();
          console.log(`✅ New balance: ${newBalance / 1e9} SOL`);
        } catch (airdropError) {
          console.log('❌ Automatic airdrop failed. Please airdrop manually.');
          console.log('   Note: OnFinality RPC may have airdrop limitations.');
        }
      } else if (balance < 0.1 * 1e9) {
        console.log(`\n⚠️  Low balance warning: ${balanceInSol} SOL`);
        console.log('   Consider requesting more SOL for testing');
      }
      
      // Test 7: Program account verification
      console.log('\nTest 7: Verifying program account...');
      const programInfo = await config.connection.getAccountInfo(config.programId);
      
      if (programInfo === null) {
        console.log('❌ Program account not found on-chain');
        console.log('   Make sure you deployed the program:');
        console.log('   1. anchor build');
        console.log('   2. anchor deploy');
        return false;
      }
      
      console.log('✓ Program account found');
      console.log(`  Executable: ${programInfo.executable}`);
      console.log(`  Owner: ${programInfo.owner.toBase58()}`);
      console.log(`  Data length: ${programInfo.data.length} bytes`);
      
      if (!programInfo.executable) {
        console.log('❌ WARNING: Program account is not executable!');
        return false;
      }
      
      // Test 8: Platform wallet
      console.log('\nTest 8: Platform wallet configuration');
      console.log(`✓ Platform wallet: ${config.platformWallet.toBase58()}`);
      
      if (config.platformWallet.equals(config.payerKeypair.publicKey)) {
        console.log('  ℹ️  Using payer as platform wallet (OK for testing)');
      }
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ All Solana Client tests passed!');
      console.log('='.repeat(60));
      
      return true;
      
    } catch (error) {
      console.error('\n❌ Solana Client test failed:', error);
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        
        // Provide helpful error messages
        if (error.message.includes('PROGRAM_ID')) {
          console.error('\n💡 Fix: Add PROGRAM_ID to your .env file');
        } else if (error.message.includes('Keypair file not found')) {
          console.error('\n💡 Fix: Run "npm run keygen" to generate a keypair');
        } else if (error.message.includes('Invalid public key')) {
          console.error('\n💡 Fix: Check that your PROGRAM_ID in .env is a valid base58 string');
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          console.error('\n💡 Fix: RPC rate limit reached. Wait a moment and try again.');
        }
      }
      
      return false;
    }
  }
}

// Export singleton getter for convenience
export const getSolanaConfig = () => SolanaConfig.getInstance();