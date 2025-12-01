import { Program, AnchorProvider, Idl, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { SolanaConfig } from '../config/solana.config';

// Custom wallet implementation for Anchor
class NodeWallet implements Wallet {
  constructor(readonly payer: Keypair) {}

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.payer);
    } else {
      // For VersionedTransaction, we need to handle differently
      tx.sign([this.payer]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return txs.map((tx) => {
      if (tx instanceof Transaction) {
        tx.partialSign(this.payer);
      } else {
        tx.sign([this.payer]);
      }
      return tx;
    });
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}

export class ProgramService {
  private static instance: ProgramService;
  
  public program: Program;
  private provider: AnchorProvider;
  private wallet: NodeWallet;

  private constructor() {
    const config = SolanaConfig.getInstance();
    
    // Load IDL
    const idlPath = path.join(__dirname, '../../idl/zeitgeist.json');
    if (!fs.existsSync(idlPath)) {
      throw new Error(
        `IDL file not found at ${idlPath}\n` +
        `Run these commands:\n` +
        `  1. cd .. (go to root directory)\n` +
        `  2. anchor build\n` +
        `  3. cp target/idl/zeitgeist.json backend/idl/`
      );
    }
    
    const idlJson = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
    
    // Create wallet
    this.wallet = new NodeWallet(config.payerKeypair);
    
    // Create provider
    this.provider = new AnchorProvider(
      config.connection,
      this.wallet,
      { 
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      }
    );
    
    // Create program interface (correct parameter order: IDL, Provider)
    this.program = new Program(idlJson as Idl, this.provider);
    
    console.log(`📦 Program loaded: ${this.program.programId.toBase58()}`);
  }

  public static getInstance(): ProgramService {
    if (!ProgramService.instance) {
      ProgramService.instance = new ProgramService();
    }
    return ProgramService.instance;
  }

  // Helper: Get program accounts with type safety
  public async getGlobalState(): Promise<{ address: PublicKey; data: any } | null> {
    const config = SolanaConfig.getInstance();
    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      this.program.programId
    );
    
    try {
      // Fetch account using the fetch method
      const account = await (this.program.account as any)['globalState'].fetch(globalStatePda);
      return { address: globalStatePda, data: account };
    } catch (error) {
      // Account doesn't exist yet (program not initialized)
      return null;
    }
  }

  // Helper: Get round account
  public async getRound(roundId: number): Promise<{ address: PublicKey; data: any } | null> {
    const [roundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('round'),
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(roundId)]).buffer))
      ],
      this.program.programId
    );
    
    try {
      const account = await (this.program.account as any)['round'].fetch(roundPda);
      return { address: roundPda, data: account };
    } catch (error) {
      return null;
    }
  }

  // Helper: Get prediction account
  public async getPrediction(roundId: number, userPubkey: PublicKey): Promise<{ address: PublicKey; data: any } | null> {
    const [predictionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('prediction'),
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(roundId)]).buffer)),
        userPubkey.toBuffer()
      ],
      this.program.programId
    );
    
    try {
      const account = await (this.program.account as any)['prediction'].fetch(predictionPda);
      return { address: predictionPda, data: account };
    } catch (error) {
      return null;
    }
  }

  // Helper: Get user stats account
  public async getUserStats(userPubkey: PublicKey): Promise<{ address: PublicKey; data: any } | null> {
    const [userStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('user_stats'), userPubkey.toBuffer()],
      this.program.programId
    );
    
    try {
      const account = await (this.program.account as any)['userStats'].fetch(userStatsPda);
      return { address: userStatsPda, data: account };
    } catch (error) {
      return null;
    }
  }

  // Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing Program Interface Service...\n');
    
    try {
      const programService = ProgramService.getInstance();
      const config = SolanaConfig.getInstance();
      
      // Test 1: Program loaded
      console.log('✓ Test 1: Program interface loaded');
      console.log(`  Program ID: ${programService.program.programId.toBase58()}`);
      
      // Test 2: IDL loaded
      const idl = programService.program.idl;
      const instructionNames = idl.instructions.map((ix: any) => ix.name);
      console.log(`✓ Test 2: IDL loaded with ${instructionNames.length} instructions`);
      console.log(`  Instructions: ${instructionNames.slice(0, 5).join(', ')}...`);
      
      // Test 3: Account types loaded
      const accountNames = idl.accounts?.map((acc: any) => acc.name) || [];
      console.log(`✓ Test 3: ${accountNames.length} account types defined`);
      console.log(`  Accounts: ${accountNames.join(', ')}`);
      
      // Test 4: Check if program is initialized
      console.log('\nTest 4: Checking program initialization...');
      const globalState = await programService.getGlobalState();
      
      if (globalState) {
        console.log('✓ Program is initialized');
        console.log(`  Global State PDA: ${globalState.address.toBase58()}`);
        console.log(`  Admin: ${globalState.data.admin.toBase58()}`);
        console.log(`  Platform Wallet: ${globalState.data.platformWallet.toBase58()}`);
        console.log(`  Platform Fee: ${globalState.data.platformFeeBps / 100}%`);
        console.log(`  Total Rounds: ${globalState.data.totalRounds.toString()}`);
        console.log(`  Total Volume: ${globalState.data.totalVolume.toString() / 1e9} SOL`);
        console.log(`  Paused: ${globalState.data.paused}`);
      } else {
        console.log('⚠️  Program NOT initialized yet');
        console.log('  This will be done in the Initialize Service test');
      }
      
      // Test 5: Verify program account exists on-chain
      console.log('\nTest 5: Verifying program account on-chain...');
      const programAccountInfo = await config.connection.getAccountInfo(
        programService.program.programId
      );
      
      if (!programAccountInfo) {
        console.log('❌ Program account not found');
        console.log('  Make sure you deployed the program:');
        console.log('    1. anchor build');
        console.log('    2. anchor deploy --provider.cluster devnet');
        return false;
      }
      
      console.log(`✓ Program account exists`);
      console.log(`  Executable: ${programAccountInfo.executable}`);
      console.log(`  Owner: ${programAccountInfo.owner.toBase58()}`);
      console.log(`  Data length: ${programAccountInfo.data.length} bytes`);
      
      if (!programAccountInfo.executable) {
        console.log('❌ Program is not executable!');
        return false;
      }
      
      // Test 6: Provider configuration
      console.log('\nTest 6: Provider configuration');
      console.log(`✓ Commitment: ${programService.provider.opts.commitment}`);
      console.log(`✓ Wallet: ${programService.wallet.publicKey.toBase58()}`);
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ All Program Interface tests passed!');
      console.log('='.repeat(60));
      
      return true;
      
    } catch (error) {
      console.error('\n❌ Program Interface test failed:', error);
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        
        // Helpful error messages
        if (error.message.includes('IDL file not found')) {
          console.error('\n💡 Fix: Build and copy IDL file');
          console.error('  1. cd .. (to root)');
          console.error('  2. anchor build');
          console.error('  3. cp target/idl/zeitgeist.json backend/idl/');
        } else if (error.message.includes('Invalid IDL')) {
          console.error('\n💡 Fix: Rebuild the program with latest Anchor version');
        }
      }
      
      return false;
    }
  }
}