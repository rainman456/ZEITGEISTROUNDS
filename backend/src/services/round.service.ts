import { PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { ProgramService } from '../blockchain/program';
import { PDAService } from '../blockchain/pdas';
import { SolanaConfig } from '../config/solana.config';

// Enum matching smart contract (from state/round.rs)
export enum VerificationMethod {
  PythPrice = 'pythPrice',
  OnChainData = 'onChainData',
  TwitterAPI = 'twitterAPI',
  SwitchboardVRF = 'switchboardVRF',
}

export interface CreateRoundParams {
  question: string;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  numOutcomes: number; // 2 for YES/NO
  verificationType: VerificationMethod;
  targetValue: number; // e.g., 15000 for $150.00 in cents
  dataSource: PublicKey; // e.g., Pyth price feed pubkey
  oracle: PublicKey; // Backend oracle pubkey
}

export class RoundService {
  private programService: ProgramService;
  private pdaService: PDAService;
  private config: SolanaConfig;

  constructor() {
    this.programService = ProgramService.getInstance();
    this.pdaService = new PDAService();
    this.config = SolanaConfig.getInstance();
  }

  /**
   * Create a new prediction round
   */
  public async createRound(params: CreateRoundParams): Promise<{
    signature: string;
    roundId: number;
    roundPda: PublicKey;
    vaultPda: PublicKey;
  }> {
    try {
      // Generate round ID from timestamp
      const roundId = Math.floor(Date.now() / 1000);
      
      console.log('\n🎲 Creating new round...');
      console.log(`  Round ID: ${roundId}`);
      console.log(`  Question: ${params.question}`);
      console.log(`  Start: ${new Date(params.startTime * 1000).toISOString()}`);
      console.log(`  End: ${new Date(params.endTime * 1000).toISOString()}`);
      
      // Derive PDAs
      const [roundPda] = this.pdaService.getRoundPDA(roundId);
      const [vaultPda] = this.pdaService.getVaultPDA(roundId);
      const [globalStatePda] = this.pdaService.getGlobalStatePDA();
      
      console.log(`  Round PDA: ${roundPda.toBase58()}`);
      console.log(`  Vault PDA: ${vaultPda.toBase58()}`);
      
      // Convert verification method to format expected by smart contract
      const verificationMethodVariant = this.toVerificationMethodVariant(params.verificationType);
      
      // Build and send transaction
      const signature = await this.programService.program.methods
        .createRound(
          new BN(roundId),
          new BN(params.startTime),
          new BN(params.endTime),
          params.numOutcomes,
          params.question,
          verificationMethodVariant,
          new BN(params.targetValue),
          params.dataSource,
          params.oracle
        )
        .accounts({
          globalState: globalStatePda,
          round: roundPda,
          vault: vaultPda,
          creator: this.config.payerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Round created successfully!');
      console.log(`📝 Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      
      // Wait for confirmation
      await this.config.connection.confirmTransaction(signature, 'confirmed');
      
      return {
        signature,
        roundId,
        roundPda,
        vaultPda,
      };
      
    } catch (error) {
      console.error('❌ Failed to create round:', error);
      throw error;
    }
  }

  /**
   * Get round data from blockchain
   */
  public async getRound(roundId: number): Promise<any> {
    const round = await this.programService.getRound(roundId);
    if (!round) {
      throw new Error(`Round ${roundId} not found`);
    }
    return round;
  }
/**
   * Get all rounds (simplified for PoC - in production, use indexer)
   */
  public async getAllRounds(): Promise<any[]> {
    try {
      // Fetch all Round accounts with proper type casting
      const accounts = await (this.programService.program.account as any)['round'].all();
      return accounts.map((acc: any) => ({
        address: acc.publicKey,
        ...acc.account,
      }));
    } catch (error) {
      console.error('Failed to fetch rounds:', error);
      return [];
    }
  }


  /**
   * Convert TypeScript enum to Anchor enum format
   */
  private toVerificationMethodVariant(method: VerificationMethod): any {
    switch (method) {
      case VerificationMethod.PythPrice:
        return { pythPrice: {} };
      case VerificationMethod.OnChainData:
        return { onChainData: {} };
      case VerificationMethod.TwitterAPI:
        return { twitterAPI: {} };
      case VerificationMethod.SwitchboardVRF:
        return { switchboardVRF: {} };
      default:
        throw new Error(`Unknown verification method: ${method}`);
    }
  }

  /**
   * Format round data for display
   */
  public formatRound(roundData: any): string {
    const startTime = new Date(roundData.data.startTime.toNumber() * 1000);
    const endTime = new Date(roundData.data.endTime.toNumber() * 1000);
    const bettingCloseTime = new Date(roundData.data.bettingCloseTime.toNumber() * 1000);
    
    return `
Round Details:
  ID: ${roundData.data.roundId.toString()}
  Question: ${roundData.data.question}
  Status: ${Object.keys(roundData.data.status)[0]}
  Creator: ${roundData.data.creator.toBase58()}
  
Timing:
  Start: ${startTime.toISOString()}
  Betting Close: ${bettingCloseTime.toISOString()}
  End: ${endTime.toISOString()}
  
Pool:
  Total Pool: ${roundData.data.totalPool.toNumber() / 1e9} SOL
  Total Predictions: ${roundData.data.totalPredictions}
  Winning Pool: ${roundData.data.winningPool.toNumber() / 1e9} SOL
  
Outcomes:
  Number of Outcomes: ${roundData.data.numOutcomes}
  Winning Outcome: ${roundData.data.winningOutcome === 255 ? 'Not Set' : roundData.data.winningOutcome}
  
Oracle:
  Verification: ${Object.keys(roundData.data.verificationMethod)[0]}
  Target Value: ${roundData.data.targetValue.toString()}
  Data Source: ${roundData.data.dataSource.toBase58()}
  Oracle: ${roundData.data.oracle.toBase58()}
    `;
  }

  // Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing Round Creation Service...\n');
    
    try {
      const roundService = new RoundService();
      const config = SolanaConfig.getInstance();
      
      // Test 1: Check balance before creating round
      console.log('Test 1: Checking balance...');
      const balance = await config.getPayerBalance();
      console.log(`✓ Balance: ${balance / 1e9} SOL`);
      
      if (balance < 0.5 * 1e9) {
        console.log('⚠️  Low balance. Requesting airdrop...');
        await config.requestAirdrop(2_000_000_000);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Test 2: Create a test round
      console.log('\nTest 2: Creating a test round...');
      
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 5; // Start in 5 seconds
      const endTime = startTime + 60; // 60 second round
      
      // Use Pyth SOL/USD feed for devnet
      const pythSolUsdFeed = new PublicKey(
        process.env.PYTH_SOL_USD_FEED || 
        'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG'
      );
      
      const createParams: CreateRoundParams = {
        question: 'Will SOL price be > $150?',
        startTime,
        endTime,
        numOutcomes: 2, // YES/NO
        verificationType: VerificationMethod.PythPrice,
        targetValue: 15000, // $150.00 in cents
        dataSource: pythSolUsdFeed,
        oracle: config.payerKeypair.publicKey, // Using payer as oracle for PoC
      };
      
      const result = await roundService.createRound(createParams);
      
      console.log('✓ Round created successfully!');
      console.log(`  Round ID: ${result.roundId}`);
      console.log(`  Round PDA: ${result.roundPda.toBase58()}`);
      console.log(`  Vault PDA: ${result.vaultPda.toBase58()}`);
      console.log(`  Signature: ${result.signature}`);
      
      // Test 3: Fetch the round back from blockchain
      console.log('\nTest 3: Fetching round from blockchain...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for confirmation
      
      const roundData = await roundService.getRound(result.roundId);
      console.log('✓ Round fetched successfully!');
      console.log(roundService.formatRound(roundData));
      
      // Test 4: Verify round data matches input
      console.log('Test 4: Verifying round data...');
      
      const checks = [
        {
          name: 'Question',
          expected: createParams.question,
          actual: roundData.data.question,
        },
        {
          name: 'Start Time',
          expected: startTime,
          actual: roundData.data.startTime.toNumber(),
        },
        {
          name: 'End Time',
          expected: endTime,
          actual: roundData.data.endTime.toNumber(),
        },
        {
          name: 'Num Outcomes',
          expected: createParams.numOutcomes,
          actual: roundData.data.numOutcomes,
        },
        {
          name: 'Creator',
          expected: config.payerKeypair.publicKey.toBase58(),
          actual: roundData.data.creator.toBase58(),
        },
        {
          name: 'Target Value',
          expected: createParams.targetValue,
          actual: roundData.data.targetValue.toNumber(),
        },
      ];
      
      let allPassed = true;
      for (const check of checks) {
        const passed = check.expected === check.actual;
        console.log(`  ${passed ? '✓' : '❌'} ${check.name}: ${check.actual}`);
        if (!passed) {
          console.log(`    Expected: ${check.expected}`);
          allPassed = false;
        }
      }
      
      if (!allPassed) {
        throw new Error('Round data verification failed');
      }
      
      // Test 5: Check vault PDA exists
      console.log('\nTest 5: Verifying vault PDA...');
      const vaultInfo = await config.connection.getAccountInfo(result.vaultPda);
      
      if (!vaultInfo) {
        throw new Error('Vault PDA not found');
      }
      
      console.log('✓ Vault PDA exists');
      console.log(`  Balance: ${vaultInfo.lamports / 1e9} SOL`);
      console.log(`  Owner: ${vaultInfo.owner.toBase58()}`);
      
      // Test 6: Fetch all rounds
      console.log('\nTest 6: Fetching all rounds...');
      const allRounds = await roundService.getAllRounds();
      console.log(`✓ Found ${allRounds.length} round(s) total`);
      
      if (allRounds.length > 0) {
        console.log(`  Latest round ID: ${allRounds[allRounds.length - 1].roundId.toString()}`);
      }
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ All Round Creation tests passed!');
      console.log('='.repeat(60));
      console.log('\n💡 Next: You can now place predictions on this round!');
      console.log(`   Round ID: ${result.roundId}`);
      console.log(`   Betting opens at: ${new Date(startTime * 1000).toISOString()}`);
      
      return true;
      
    } catch (error) {
      console.error('\n❌ Round Creation test failed:', error);
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        
        // Helpful error messages
        if (error.message.includes('ProgramPaused')) {
          console.error('\n💡 Fix: Program is paused. Call unpause_program first.');
        } else if (error.message.includes('InvalidBettingDuration')) {
          console.error('\n💡 Fix: Check start_time and end_time values.');
        } else if (error.message.includes('Unauthorized')) {
          console.error('\n💡 Fix: Make sure payer is the program admin.');
        } else if (error.message.includes('insufficient funds')) {
          console.error('\n💡 Fix: Request airdrop - npm run airdrop');
        }
      }
      
      return false;
    }
  }
}