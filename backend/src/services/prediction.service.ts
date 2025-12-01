import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { ProgramService } from '../blockchain/program';
import { PDAService } from '../blockchain/pdas';
import { SolanaConfig } from '../config/solana.config';

export interface PlacePredictionParams {
  roundId: number;
  outcome: number; // 0 = YES, 1 = NO (for binary predictions)
  amount: number; // in lamports
}

export class PredictionService {
  private programService: ProgramService;
  private pdaService: PDAService;
  private config: SolanaConfig;

  // Constants from smart contract (constants.rs)
  private readonly MIN_PREDICTION_AMOUNT = 1_000_000; // 0.001 SOL
  private readonly MAX_PREDICTION_AMOUNT = 100_000_000_000; // 100 SOL

  constructor() {
    this.programService = ProgramService.getInstance();
    this.pdaService = new PDAService();
    this.config = SolanaConfig.getInstance();
  }

  /**
   * Place a prediction on a round
   */
  public async placePrediction(params: PlacePredictionParams): Promise<{
    signature: string;
    predictionPda: PublicKey;
    amount: number;
  }> {
    try {
      console.log('\n💰 Placing prediction...');
      console.log(`  Round ID: ${params.roundId}`);
      console.log(`  Outcome: ${params.outcome} (${params.outcome === 0 ? 'YES' : 'NO'})`);
      console.log(`  Amount: ${params.amount / LAMPORTS_PER_SOL} SOL`);

      // Validate amount
      if (params.amount < this.MIN_PREDICTION_AMOUNT) {
        throw new Error(`Amount too low. Minimum: ${this.MIN_PREDICTION_AMOUNT / LAMPORTS_PER_SOL} SOL`);
      }
      if (params.amount > this.MAX_PREDICTION_AMOUNT) {
        throw new Error(`Amount too high. Maximum: ${this.MAX_PREDICTION_AMOUNT / LAMPORTS_PER_SOL} SOL`);
      }

      // Derive PDAs
      const [globalStatePda] = this.pdaService.getGlobalStatePDA();
      const [roundPda] = this.pdaService.getRoundPDA(params.roundId);
      const [predictionPda] = this.pdaService.getPredictionPDA(
        params.roundId,
        this.config.payerKeypair.publicKey
      );
      const [userStatsPda] = this.pdaService.getUserStatsPDA(
        this.config.payerKeypair.publicKey
      );
      const [vaultPda] = this.pdaService.getVaultPDA(params.roundId);

      console.log(`  Prediction PDA: ${predictionPda.toBase58()}`);
      console.log(`  Vault PDA: ${vaultPda.toBase58()}`);

      // Check user balance before betting
      const userBalance = await this.config.getPayerBalance();
      if (userBalance < params.amount + 0.01 * LAMPORTS_PER_SOL) {
        throw new Error(
          `Insufficient balance. Need ${(params.amount + 0.01 * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL} SOL, ` +
          `have ${userBalance / LAMPORTS_PER_SOL} SOL`
        );
      }

      // Get vault balance before
      const vaultInfoBefore = await this.config.connection.getAccountInfo(vaultPda);
      const vaultBalanceBefore = vaultInfoBefore?.lamports || 0;

      // Build and send transaction
      const signature = await this.programService.program.methods
        .placePrediction(
          new BN(params.roundId),
          params.outcome,
          new BN(params.amount)
        )
        .accounts({
          globalState: globalStatePda,
          round: roundPda,
          prediction: predictionPda,
          userStats: userStatsPda,
          vault: vaultPda,
          user: this.config.payerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Prediction placed successfully!');
      console.log(`📝 Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      // Wait for confirmation
      await this.config.connection.confirmTransaction(signature, 'confirmed');

      // Verify vault received funds
      await new Promise(resolve => setTimeout(resolve, 1000));
      const vaultInfoAfter = await this.config.connection.getAccountInfo(vaultPda);
      const vaultBalanceAfter = vaultInfoAfter?.lamports || 0;
      const vaultIncrease = vaultBalanceAfter - vaultBalanceBefore;

      console.log(`\n💵 Vault balance change: +${vaultIncrease / LAMPORTS_PER_SOL} SOL`);
      console.log(`  Before: ${vaultBalanceBefore / LAMPORTS_PER_SOL} SOL`);
      console.log(`  After: ${vaultBalanceAfter / LAMPORTS_PER_SOL} SOL`);

      if (vaultIncrease < params.amount * 0.99) {
        console.log('⚠️  Warning: Vault increase is less than expected');
      }

      return {
        signature,
        predictionPda,
        amount: params.amount,
      };

    } catch (error) {
      console.error('❌ Failed to place prediction:', error);
      throw error;
    }
  }

  /**
   * Get prediction data from blockchain
   */
  public async getPrediction(roundId: number, userPubkey: PublicKey): Promise<any> {
    const prediction = await this.programService.getPrediction(roundId, userPubkey);
    if (!prediction) {
      throw new Error(`Prediction not found for round ${roundId} and user ${userPubkey.toBase58()}`);
    }
    return prediction;
  }

  /**
   * Get all predictions for a round (simplified for PoC)
   */
  public async getPredictionsForRound(roundId: number): Promise<any[]> {
    try {
      const allPredictions = await (this.programService.program.account as any)['prediction'].all();
      
      // Filter by round ID
      return allPredictions.filter((pred: any) => 
        pred.account.roundId.toNumber() === roundId
      );
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
      return [];
    }
  }

  /**
   * Get user stats
   */
  public async getUserStats(userPubkey: PublicKey): Promise<any> {
    return await this.programService.getUserStats(userPubkey);
  }

  /**
   * Calculate pool distribution for a round
   */
  public async calculatePoolDistribution(roundId: number): Promise<{
    totalPool: number;
    yesPool: number;
    noPool: number;
    totalPredictions: number;
    yesPredictions: number;
    noPredictions: number;
  }> {
    const predictions = await this.getPredictionsForRound(roundId);

    let yesPool = 0;
    let noPool = 0;
    let yesPredictions = 0;
    let noPredictions = 0;

    for (const pred of predictions) {
      const amount = pred.account.amount.toNumber();
      if (pred.account.outcome === 0) {
        yesPool += amount;
        yesPredictions++;
      } else {
        noPool += amount;
        noPredictions++;
      }
    }

    return {
      totalPool: yesPool + noPool,
      yesPool,
      noPool,
      totalPredictions: predictions.length,
      yesPredictions,
      noPredictions,
    };
  }

  /**
   * Format prediction data for display
   */
  public formatPrediction(predictionData: any): string {
    const timestamp = new Date(predictionData.data.timestamp.toNumber() * 1000);

    return `
Prediction Details:
  Round ID: ${predictionData.data.roundId.toString()}
  User: ${predictionData.data.user.toBase58()}
  Outcome: ${predictionData.data.outcome} (${predictionData.data.outcome === 0 ? 'YES' : 'NO'})
  Amount: ${predictionData.data.amount.toNumber() / LAMPORTS_PER_SOL} SOL
  Timestamp: ${timestamp.toISOString()}
  Claimed: ${predictionData.data.claimed}
    `;
  }

  // Embedded test method
// Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing Prediction Service...\n');

    try {
      const predictionService = new PredictionService();
      const config = SolanaConfig.getInstance();

      // Test 1: Check balance
      console.log('Test 1: Checking balance...');
      const balance = await config.getPayerBalance();
      console.log(`✓ Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

      if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.log('⚠️  Low balance. Requesting airdrop...');
        await config.requestAirdrop(2_000_000_000);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Test 2: Create a test round first
    // Test 2: Create a test round first
      console.log('\nTest 2: Creating a test round for predictions...');
      const { RoundService, VerificationMethod } = await import('./round.service');
      const roundService = new RoundService();

      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 10; // Start in 10 seconds ✅
      const endTime = startTime + 60; // 60 second round

      const pythSolUsdFeed = new PublicKey(
        process.env.PYTH_SOL_USD_FEED ||
        'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG'
      );

      const roundResult = await roundService.createRound({
        question: 'Will SOL > $150? (Prediction Test)',
        startTime,
        endTime,
        numOutcomes: 2,
        verificationType: VerificationMethod.PythPrice,
        targetValue: 15000,
        dataSource: pythSolUsdFeed,
        oracle: config.payerKeypair.publicKey,
      });

      console.log(`✓ Test round created: ${roundResult.roundId}`);
      console.log(`  Betting opens at: ${new Date(startTime * 1000).toISOString()}`);
      console.log(`  Waiting for betting window to open...`);

      // Wait for betting window to open (start_time must be reached)
      const waitTime = (startTime - now + 2) * 1000; // Wait until 2 seconds after start
      if (waitTime > 0) {
        console.log(`  Sleeping for ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      console.log('  Betting window is now open!');

      // Test 3: Place a YES prediction
      console.log('\nTest 3: Placing YES prediction...');
      const yesPrediction = await predictionService.placePrediction({
        roundId: roundResult.roundId,
        outcome: 0, // YES
        amount: 0.1 * LAMPORTS_PER_SOL,
      });

      console.log('✓ YES prediction placed successfully!');
      console.log(`  Signature: ${yesPrediction.signature}`);
      console.log(`  Prediction PDA: ${yesPrediction.predictionPda.toBase58()}`);

      // Test 4: Fetch prediction back
      console.log('\nTest 4: Fetching prediction from blockchain...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const predictionData = await predictionService.getPrediction(
        roundResult.roundId,
        config.payerKeypair.publicKey
      );

      console.log('✓ Prediction fetched successfully!');
      console.log(predictionService.formatPrediction(predictionData));

      // Test 5: Verify prediction data
      console.log('Test 5: Verifying prediction data...');
      const checks = [
        {
          name: 'Round ID',
          expected: roundResult.roundId,
          actual: predictionData.data.roundId.toNumber(),
        },
        {
          name: 'User',
          expected: config.payerKeypair.publicKey.toBase58(),
          actual: predictionData.data.user.toBase58(),
        },
        {
          name: 'Outcome',
          expected: 0,
          actual: predictionData.data.outcome,
        },
        {
          name: 'Amount',
          expected: 0.1 * LAMPORTS_PER_SOL,
          actual: predictionData.data.amount.toNumber(),
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
        throw new Error('Prediction data verification failed');
      }

      // Test 6: Check user stats
      console.log('\nTest 6: Checking user stats...');
      const userStats = await predictionService.getUserStats(config.payerKeypair.publicKey);

      if (userStats) {
        console.log('✓ User stats found');
        console.log(`  Total Predictions: ${userStats.data.totalPredictions.toString()}`);
        console.log(`  Total Wagered: ${userStats.data.totalWagered.toNumber() / LAMPORTS_PER_SOL} SOL`);
        console.log(`  Total Won: ${userStats.data.totalWon.toNumber() / LAMPORTS_PER_SOL} SOL`);
        console.log(`  Net Profit: ${userStats.data.netProfit.toNumber() / LAMPORTS_PER_SOL} SOL`);
      } else {
        console.log('⚠️  User stats not found (might be created on-demand)');
      }

      // Test 7: Calculate pool distribution
      console.log('\nTest 7: Calculating pool distribution...');
      const distribution = await predictionService.calculatePoolDistribution(roundResult.roundId);

      console.log('✓ Pool distribution:');
      console.log(`  Total Pool: ${distribution.totalPool / LAMPORTS_PER_SOL} SOL`);
      console.log(`  YES Pool: ${distribution.yesPool / LAMPORTS_PER_SOL} SOL (${distribution.yesPredictions} bets)`);
      console.log(`  NO Pool: ${distribution.noPool / LAMPORTS_PER_SOL} SOL (${distribution.noPredictions} bets)`);

      // Test 8: Verify round was updated
      console.log('\nTest 8: Verifying round was updated...');
      const updatedRound = await roundService.getRound(roundResult.roundId);

      console.log('✓ Round updated:');
      console.log(`  Total Pool: ${updatedRound.data.totalPool.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`  Total Predictions: ${updatedRound.data.totalPredictions}`);

      if (updatedRound.data.totalPredictions === 0) {
        throw new Error('Round predictions count not updated');
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ All Prediction Service tests passed!');
      console.log('='.repeat(60));
      console.log('\n💡 Next: Settlement service to determine winners!');
      console.log(`   Round ID: ${roundResult.roundId}`);
      console.log(`   Your prediction: YES with 0.1 SOL`);

      return true;

    } catch (error) {
      console.error('\n❌ Prediction Service test failed:', error);

      if (error instanceof Error) {
        console.error('Error details:', error.message);

        // Helpful error messages
        if (error.message.includes('BettingEnded')) {
          console.error('\n💡 Fix: Betting window closed. Create a new round.');
        } else if (error.message.includes('BettingNotStarted')) {
          console.error('\n💡 Fix: Betting has not started yet. Wait for start_time.');
        } else if (error.message.includes('AlreadyPredicted')) {
          console.error('\n💡 Fix: User already placed prediction on this round.');
        } else if (error.message.includes('InvalidPredictionAmount')) {
          console.error('\n💡 Fix: Amount outside min/max range.');
        } else if (error.message.includes('InvalidOutcome')) {
          console.error('\n💡 Fix: Outcome must be 0 or 1 for binary prediction.');
        } else if (error.message.includes('insufficient funds')) {
          console.error('\n💡 Fix: Request airdrop - npm run airdrop');
        }
      }

      return false;
    }
  }
}