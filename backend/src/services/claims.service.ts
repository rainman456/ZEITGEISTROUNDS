import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { ProgramService } from '../blockchain/program';
import { PDAService } from '../blockchain/pdas';
import { SolanaConfig } from '../config/solana.config';

export class ClaimsService {
  private programService: ProgramService;
  private pdaService: PDAService;
  private config: SolanaConfig;

  constructor() {
    this.programService = ProgramService.getInstance();
    this.pdaService = new PDAService();
    this.config = SolanaConfig.getInstance();
  }

  /**
   * Calculate winnings for a user's prediction
   */
  public calculateWinnings(
    userBet: number,
    totalWinningBets: number,
    totalPool: number,
    platformFee: number
  ): number {
    if (totalWinningBets === 0) return 0;

    const distributablePool = totalPool - platformFee;
    const winnings = Math.floor((userBet * distributablePool) / totalWinningBets);

    return winnings;
  }

  /**
   * Claim winnings for a settled round
   */
  public async claimWinnings(roundId: number, userPubkey?: PublicKey): Promise<{
    signature: string;
    amount: number;
  }> {
    try {
      const user = userPubkey || this.config.payerKeypair.publicKey;

      console.log(`\n💰 Claiming winnings for round ${roundId}...`);
      console.log(`  User: ${user.toBase58()}`);

      // Derive PDAs
      const [roundPda] = this.pdaService.getRoundPDA(roundId);
      const [predictionPda] = this.pdaService.getPredictionPDA(roundId, user);
      const [userStatsPda] = this.pdaService.getUserStatsPDA(user);
      const [vaultPda] = this.pdaService.getVaultPDA(roundId);

      // Get prediction to check if user is winner
      const prediction = await this.programService.getPrediction(roundId, user);
      if (!prediction) {
        throw new Error('No prediction found for this user');
      }

      if (prediction.data.claimed) {
        throw new Error('Winnings already claimed');
      }

      // Get round to calculate winnings
      const round = await this.programService.getRound(roundId);
      if (!round) {
        throw new Error('Round not found');
      }

      // Check if user won
      if (prediction.data.outcome !== round.data.winningOutcome) {
        throw new Error('User did not win this round');
      }

      // Calculate expected winnings
      const userBet = prediction.data.amount.toNumber();
      const totalPool = round.data.totalPool.toNumber();
      const winningPool = round.data.winningPool.toNumber();
      const platformFee = round.data.platformFeeCollected.toNumber();

      const expectedWinnings = this.calculateWinnings(
        userBet,
        winningPool,
        totalPool,
        platformFee
      );

      console.log(`  Expected winnings: ${expectedWinnings / LAMPORTS_PER_SOL} SOL`);

      // Get balance before claim
      const balanceBefore = await this.config.connection.getBalance(user);

      // Build and send transaction
      const signature = await this.programService.program.methods
        .claimWinnings(new BN(roundId))
        .accounts({
          round: roundPda,
          prediction: predictionPda,
          userStats: userStatsPda,
          vault: vaultPda,
          user: user,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Winnings claimed successfully!');
      console.log(`📝 Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      // Wait for confirmation
      await this.config.connection.confirmTransaction(signature, 'confirmed');

      // Verify balance increased
      await new Promise(resolve => setTimeout(resolve, 1000));
      const balanceAfter = await this.config.connection.getBalance(user);
      const actualWinnings = balanceAfter - balanceBefore;

      console.log(`\n💵 Balance change: +${actualWinnings / LAMPORTS_PER_SOL} SOL`);
      console.log(`  Before: ${balanceBefore / LAMPORTS_PER_SOL} SOL`);
      console.log(`  After: ${balanceAfter / LAMPORTS_PER_SOL} SOL`);

      return {
        signature,
        amount: actualWinnings,
      };

    } catch (error) {
      console.error('❌ Failed to claim winnings:', error);
      throw error;
    }
  }

  /**
   * Check if user has claimable winnings
   */
  public async hasClaimableWinnings(roundId: number, userPubkey?: PublicKey): Promise<{
    hasWinnings: boolean;
    amount: number;
    claimed: boolean;
  }> {
    try {
      const user = userPubkey || this.config.payerKeypair.publicKey;

      const prediction = await this.programService.getPrediction(roundId, user);
      if (!prediction) {
        return { hasWinnings: false, amount: 0, claimed: false };
      }

      const round = await this.programService.getRound(roundId);
      if (!round) {
        return { hasWinnings: false, amount: 0, claimed: false };
      }

      // Check if round is settled
      const status = Object.keys(round.data.status)[0];
      if (status !== 'settled') {
        return { hasWinnings: false, amount: 0, claimed: false };
      }

      // Check if user won
      const isWinner = prediction.data.outcome === round.data.winningOutcome;
      if (!isWinner) {
        return { hasWinnings: false, amount: 0, claimed: false };
      }

      // Calculate winnings
      const userBet = prediction.data.amount.toNumber();
      const totalPool = round.data.totalPool.toNumber();
      const winningPool = round.data.winningPool.toNumber();
      const platformFee = round.data.platformFeeCollected.toNumber();

      const amount = this.calculateWinnings(userBet, winningPool, totalPool, platformFee);

      return {
        hasWinnings: true,
        amount,
        claimed: prediction.data.claimed,
      };

    } catch (error) {
      return { hasWinnings: false, amount: 0, claimed: false };
    }
  }
}