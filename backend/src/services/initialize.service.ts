import { PublicKey, SystemProgram } from '@solana/web3.js';
import { ProgramService } from '../blockchain/program';
import { PDAService } from '../blockchain/pdas';
import { SolanaConfig } from '../config/solana.config';

export class InitializeService {
  private programService: ProgramService;
  private pdaService: PDAService;
  private config: SolanaConfig;

  constructor() {
    this.programService = ProgramService.getInstance();
    this.pdaService = new PDAService();
    this.config = SolanaConfig.getInstance();
  }

  // Initialize the program (one-time setup)
  public async initialize(): Promise<string> {
    try {
      console.log('🚀 Initializing program...');
      
      const [globalStatePda] = this.pdaService.getGlobalStatePDA();
      
      // Check if already initialized
      const existingState = await this.programService.getGlobalState();
      if (existingState) {
        throw new Error('Program already initialized');
      }

      // Build and send transaction
      const tx = await this.programService.program.methods
        .initialize(this.config.platformWallet)
        .accounts({
          globalState: globalStatePda,
          admin: this.config.payerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Program initialized successfully!');
      console.log(`📝 Transaction signature: ${tx}`);
      console.log(`🔗 View on explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      
      return tx;
      
    } catch (error) {
      console.error('❌ Failed to initialize program:', error);
      throw error;
    }
  }

  // Get current global state
  public async getGlobalState(): Promise<any> {
    return await this.programService.getGlobalState();
  }

  // Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing Initialize Service...\n');
    
    try {
      const initService = new InitializeService();
      const config = SolanaConfig.getInstance();
      
      // Test 1: Check current state
      console.log('Test 1: Checking if program is initialized...');
      let globalState = await initService.getGlobalState();
      
      if (globalState) {
        console.log('✓ Program already initialized');
        console.log(`  Admin: ${globalState.data.admin.toBase58()}`);
        console.log(`  Platform Wallet: ${globalState.data.platformWallet.toBase58()}`);
        console.log(`  Platform Fee: ${globalState.data.platformFeeBps / 100}%`);
        console.log(`  Total Rounds: ${globalState.data.totalRounds.toString()}`);
        console.log(`  Total Volume: ${globalState.data.totalVolume.toString() / 1e9} SOL`);
        console.log(`  Paused: ${globalState.data.paused}`);
      } else {
        console.log('⚠️  Program not initialized. Initializing now...');
        
        // Check balance before initializing
        const balance = await config.connection.getBalance(config.payerKeypair.publicKey);
        if (balance < 0.1 * 1e9) {
          console.log('❌ Insufficient balance. Need at least 0.1 SOL');
          console.log(`   Run: solana airdrop 2 ${config.payerKeypair.publicKey.toBase58()} --url devnet`);
          return false;
        }
        
        // Initialize
        const signature = await initService.initialize();
        
        // Wait for confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch state again
        globalState = await initService.getGlobalState();
        
        if (globalState) {
          console.log('✓ Program successfully initialized!');
          console.log(`  Admin: ${globalState.data.admin.toBase58()}`);
          console.log(`  Platform Wallet: ${globalState.data.platformWallet.toBase58()}`);
        } else {
          throw new Error('Failed to fetch state after initialization');
        }
      }
      
      // Test 2: Verify admin matches payer
      console.log('\nTest 2: Verifying admin privileges...');
      const isAdmin = globalState.data.admin.equals(config.payerKeypair.publicKey);
      console.log(`✓ Admin verification: ${isAdmin ? 'PASSED' : 'FAILED'}`);
      
      if (!isAdmin) {
        console.log('⚠️  Warning: Payer is not the admin');
      }
      
      // Test 3: Verify platform fee is correct (2% = 200 bps)
      console.log('\nTest 3: Verifying platform fee...');
      const expectedFeeBps = 200; // From constants.rs
      const feeMatches = globalState.data.platformFeeBps === expectedFeeBps;
      console.log(`✓ Platform fee check: ${feeMatches ? 'PASSED' : 'FAILED'}`);
      console.log(`  Expected: ${expectedFeeBps} bps, Got: ${globalState.data.platformFeeBps} bps`);
      
      console.log('\n✅ All Initialize Service tests passed!\n');
      return true;
      
    } catch (error) {
      console.error('❌ Initialize Service test failed:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      return false;
    }
  }
}