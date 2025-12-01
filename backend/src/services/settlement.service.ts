import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { ProgramService } from '../blockchain/program';
import { PDAService } from '../blockchain/pdas';
import { SolanaConfig } from '../config/solana.config';

export interface SettleRoundParams {
  roundId: number;
  winningPoolAmount: number; // Pre-calculated by backend (in lamports)
}

export class SettlementService {
  private programService: ProgramService;
  private pdaService: PDAService;
  private config: SolanaConfig;

  constructor() {
    this.programService = ProgramService.getInstance();
    this.pdaService = new PDAService();
    this.config = SolanaConfig.getInstance();
  }

  /**
   * Calculate winning pool amount by iterating through all predictions
   * This is done off-chain because it's too expensive on-chain
   */
  public async calculateWinningPool(roundId: number, winningOutcome: number): Promise<number> {
    try {
      console.log(`\n📊 Calculating winning pool for outcome ${winningOutcome}...`);

      // Fetch all predictions for this round
      const allPredictions = await (this.programService.program.account as any)['prediction'].all();
      
      // Filter by round ID and winning outcome
      const winningPredictions = allPredictions.filter((pred: any) => 
        pred.account.roundId.toNumber() === roundId &&
        pred.account.outcome === winningOutcome
      );

      // Sum up winning amounts
      let winningPool = 0;
      for (const pred of winningPredictions) {
        winningPool += pred.account.amount.toNumber();
      }

      console.log(`✓ Found ${winningPredictions.length} winning predictions`);
      console.log(`✓ Winning pool: ${winningPool / LAMPORTS_PER_SOL} SOL`);

      return winningPool;

    } catch (error) {
      console.error('Failed to calculate winning pool:', error);
      throw error;
    }
  }

 /**
   * Get mock oracle data for testing (replace with real oracle integration)
   */
 private async getMockOracleData(round: any): Promise<number> {
    const verificationMethod = Object.keys(round.data.verificationMethod)[0];
    console.log(`\n🔮 Getting oracle data (${verificationMethod})...`);

    if (verificationMethod === 'onChainData') {
      // For onchain data, slot will determine outcome
      // Since we set target to past timestamp, slot will be higher (YES = outcome 0)
      console.log(`✓ OnChain oracle: Slot will be >= target (YES wins)`);
      return 0; // YES wins
    } else if (verificationMethod === 'pythPrice') {
      const winningOutcome = Math.random() > 0.4 ? 0 : 1;
      console.log(`✓ Mock Pyth oracle: ${winningOutcome === 0 ? 'YES' : 'NO'} wins`);
      return winningOutcome;
    } else {
      const winningOutcome = Math.floor(Math.random() * round.data.numOutcomes);
      console.log(`✓ Mock oracle: Outcome ${winningOutcome} wins`);
      return winningOutcome;
    }
  }

  /**
   * Close betting for a round (required before settlement)
   */
  public async closeBetting(roundId: number): Promise<string> {
    try {
      console.log(`\n🔒 Closing betting for round ${roundId}...`);

      const [globalStatePda] = this.pdaService.getGlobalStatePDA();
      const [roundPda] = this.pdaService.getRoundPDA(roundId);

      const signature = await this.programService.program.methods
        .closeBetting(new BN(roundId))
        .accounts({
          globalState: globalStatePda,
          round: roundPda,
          authority: this.config.payerKeypair.publicKey,
        })
        .rpc();

      console.log('✅ Betting closed successfully!');
      console.log(`📝 Signature: ${signature}`);

      await this.config.connection.confirmTransaction(signature, 'confirmed');

      return signature;

    } catch (error) {
      console.error('❌ Failed to close betting:', error);
      throw error;
    }
  }

  /**
   * Settle a round with the winning outcome
   */
  public async settleRound(params: SettleRoundParams): Promise<{
    signature: string;
    winningOutcome: number;
    platformFee: number;
  }> {
    try {
      console.log(`\n🏆 Settling round ${params.roundId}...`);

      // Fetch round data
      const round = await this.programService.getRound(params.roundId);
      if (!round) {
        throw new Error(`Round ${params.roundId} not found`);
      }

      // Get oracle data to determine winner
      const winningOutcome = await this.getMockOracleData(round);

      // Derive PDAs
      const [globalStatePda] = this.pdaService.getGlobalStatePDA();
      const [roundPda] = this.pdaService.getRoundPDA(params.roundId);
      const [vaultPda] = this.pdaService.getVaultPDA(params.roundId);

      // Get global state for platform wallet
      const globalState = await this.programService.getGlobalState();
      if (!globalState) {
        throw new Error('Global state not found');
      }

      // Mock oracle data account (Pyth price feed)
      const oracleDataAccount = round.data.dataSource;

      console.log(`  Winning outcome: ${winningOutcome}`);
      console.log(`  Winning pool: ${params.winningPoolAmount / LAMPORTS_PER_SOL} SOL`);
      console.log(`  Platform wallet: ${globalState.data.platformWallet.toBase58()}`);

      // Build and send transaction
      const signature = await this.programService.program.methods
        .settleRound(
          new BN(params.roundId),
          new BN(params.winningPoolAmount)
        )
        .accounts({
          globalState: globalStatePda,
          round: roundPda,
          vault: vaultPda,
          platformWallet: globalState.data.platformWallet,
          oracleData: oracleDataAccount,
          oracle: this.config.payerKeypair.publicKey,
          admin: this.config.payerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Round settled successfully!');
      console.log(`📝 Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      // Wait for confirmation
      await this.config.connection.confirmTransaction(signature, 'confirmed');

      // Calculate platform fee (2% from constants.rs)
      const totalPool = round.data.totalPool.toNumber();
      const platformFee = Math.floor((totalPool * 200) / 10000); // 2%

      return {
        signature,
        winningOutcome,
        platformFee,
      };

    } catch (error) {
      console.error('❌ Failed to settle round:', error);
      throw error;
    }
  }

  /**
   * Complete settlement workflow: close betting + settle
   */
  public async completeSettlement(roundId: number): Promise<{
    closeBettingSignature: string;
    settlementSignature: string;
    winningOutcome: number;
    platformFee: number;
  }> {
    try {
      // Step 1: Close betting
      const closeBettingSignature = await this.closeBetting(roundId);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Get round data
      const round = await this.programService.getRound(roundId);

      // Step 3: Determine winning outcome (mock oracle)
      const winningOutcome = await this.getMockOracleData(round);

      // Step 4: Calculate winning pool
      const winningPoolAmount = await this.calculateWinningPool(roundId, winningOutcome);

      // Step 5: Settle round
      const settlementResult = await this.settleRound({
        roundId,
        winningPoolAmount,
      });

      return {
        closeBettingSignature,
        settlementSignature: settlementResult.signature,
        winningOutcome: settlementResult.winningOutcome,
        platformFee: settlementResult.platformFee,
      };

    } catch (error) {
      console.error('❌ Complete settlement failed:', error);
      throw error;
    }
  }

  /**
   * Format settlement summary
   */
  public formatSettlement(
    roundId: number,
    round: any,
    winningOutcome: number,
    platformFee: number
  ): string {
    const totalPool = round.data.totalPool.toNumber();
    const winningPool = round.data.winningPool.toNumber();
    const distributablePool = totalPool - platformFee;

    return `
Settlement Summary:
  Round ID: ${roundId}
  Question: ${round.data.question}
  
Results:
  Winning Outcome: ${winningOutcome} (${winningOutcome === 0 ? 'YES' : 'NO'})
  Total Pool: ${totalPool / LAMPORTS_PER_SOL} SOL
  Winning Pool: ${winningPool / LAMPORTS_PER_SOL} SOL
  
Fees:
  Platform Fee (2%): ${platformFee / LAMPORTS_PER_SOL} SOL
  Distributable to Winners: ${distributablePool / LAMPORTS_PER_SOL} SOL
  
Status: ${Object.keys(round.data.status)[0]}
    `;
  }

  // Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing Settlement Service...\n');

    try {
      const settlementService = new SettlementService();
      const config = SolanaConfig.getInstance();

      // Test 1: Check balance
      console.log('Test 1: Checking balance...');
      const balance = await config.getPayerBalance();
      console.log(`✓ Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

      // Test 2: Create a test round with predictions
      console.log('\nTest 2: Setting up test round with predictions...');
      const { RoundService, VerificationMethod } = await import('./round.service');
      const { PredictionService } = await import('./prediction.service');
      
      const roundService = new RoundService();
      const predictionService = new PredictionService();

      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 5; // Start in 5 seconds
      const endTime = startTime + 60; // 60 second round (minimum required) ✅

      const pythSolUsdFeed = new PublicKey(
        process.env.PYTH_SOL_USD_FEED ||
        'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG'
      );

      // Create round
      const roundResult = await roundService.createRound({
        question: 'Will SOL > $150? (Settlement Test)',
        startTime,
        endTime,
        numOutcomes: 2,
        verificationType: VerificationMethod.OnChainData, // ✅ Use OnChainData
        targetValue: 15000,
        dataSource: pythSolUsdFeed,
        oracle: config.payerKeypair.publicKey,
      });

      console.log(`✓ Test round created: ${roundResult.roundId}`);

      // Wait for betting window
      const waitTime = (startTime - now + 2) * 1000;
      if (waitTime > 0) {
        console.log(`  Waiting ${waitTime / 1000}s for betting to open...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Place predictions (YES and NO for testing)
      console.log('\nPlacing test predictions...');
      
      await predictionService.placePrediction({
        roundId: roundResult.roundId,
        outcome: 0, // YES
        amount: 0.1 * LAMPORTS_PER_SOL,
      });
      console.log('✓ YES prediction placed (0.1 SOL)');

      await new Promise(resolve => setTimeout(resolve, 1000));

      // For a complete test, we'd need another user to bet NO
      // For now, we'll proceed with just YES bets

      // Test 3: Wait for round to end
      console.log('\nTest 3: Waiting for round to end...');
      const timeUntilEnd = endTime - Math.floor(Date.now() / 1000) + 2;
      if (timeUntilEnd > 0) {
        console.log(`  Waiting ${timeUntilEnd}s for round to end...`);
        await new Promise(resolve => setTimeout(resolve, timeUntilEnd * 1000));
      }
      console.log('✓ Round betting period ended');

      // Test 4: Close betting
      console.log('\nTest 4: Closing betting...');
      const closeBettingSignature = await settlementService.closeBetting(roundResult.roundId);
      console.log(`✓ Betting closed: ${closeBettingSignature}`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test 5: Calculate winning pool
      console.log('\nTest 5: Calculating winning pool...');
      const mockWinningOutcome = 0; // YES wins for this test
      const winningPoolAmount = await settlementService.calculateWinningPool(
        roundResult.roundId,
        mockWinningOutcome
      );
      console.log(`✓ Winning pool calculated: ${winningPoolAmount / LAMPORTS_PER_SOL} SOL`);

      // Test 6: Settle round
      console.log('\nTest 6: Settling round...');
      const settlementResult = await settlementService.settleRound({
        roundId: roundResult.roundId,
        winningPoolAmount,
      });

      console.log(`✓ Round settled successfully!`);
      console.log(`  Winning outcome: ${settlementResult.winningOutcome}`);
      console.log(`  Platform fee: ${settlementResult.platformFee / LAMPORTS_PER_SOL} SOL`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test 7: Verify settlement
      console.log('\nTest 7: Verifying settlement...');
      const settledRound = await roundService.getRound(roundResult.roundId);

      console.log(settlementService.formatSettlement(
        roundResult.roundId,
        settledRound,
        settlementResult.winningOutcome,
        settlementResult.platformFee
      ));

      // Verify round status is "settled"
      const status = Object.keys(settledRound.data.status)[0];
      if (status !== 'settled') {
        throw new Error(`Expected status 'settled', got '${status}'`);
      }

      // Verify winning outcome is set
      if (settledRound.data.winningOutcome === 255) {
        throw new Error('Winning outcome not set');
      }

      console.log('✓ Settlement verified successfully!');

      console.log('\n' + '='.repeat(60));
      console.log('✅ All Settlement Service tests passed!');
      console.log('='.repeat(60));
      console.log('\n💡 Next: Users can now claim their winnings!');
      console.log(`   Round ID: ${roundResult.roundId}`);
      console.log(`   Winners can call claim_winnings()`);

      return true;

    } catch (error) {
      console.error('\n❌ Settlement Service test failed:', error);

      if (error instanceof Error) {
        console.error('Error details:', error.message);

        // Helpful error messages
        if (error.message.includes('BettingStillActive')) {
          console.error('\n💡 Fix: Wait for betting period to end.');
        } else if (error.message.includes('RoundAlreadySettled')) {
          console.error('\n💡 Fix: This round was already settled.');
        } else if (error.message.includes('Unauthorized')) {
          console.error('\n💡 Fix: Only admin can settle rounds.');
        } else if (error.message.includes('RoundNotActive')) {
          console.error('\n💡 Fix: Round must be in Closed status before settlement.');
        }
      }

      return false;
    }
  }
}