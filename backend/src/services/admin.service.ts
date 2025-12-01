import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { ProgramService } from '../blockchain/program';
import { PDAService } from '../blockchain/pdas';
import { SolanaConfig } from '../config/solana.config';

export interface EmergencyCancelParams {
  roundId: number;
  reason: string;
}

export interface AdminStats {
  isAdmin: boolean;
  globalState: {
    admin: string;
    platformWallet: string;
    platformFeeBps: number;
    totalRounds: number;
    totalTournaments: number;
    totalVolume: number;
    paused: boolean;
  };
}

export class AdminService {
  private programService: ProgramService;
  private pdaService: PDAService;
  private config: SolanaConfig;

  constructor() {
    this.programService = ProgramService.getInstance();
    this.pdaService = new PDAService();
    this.config = SolanaConfig.getInstance();
  }

  /**
   * Check if current user is admin
   */
  public async isAdmin(userPubkey?: PublicKey): Promise<boolean> {
    try {
      const user = userPubkey || this.config.payerKeypair.publicKey;
      const globalState = await this.programService.getGlobalState();
      
      if (!globalState) {
        return false;
      }
      
      return globalState.data.admin.equals(user);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get admin statistics
   */
  public async getAdminStats(): Promise<AdminStats> {
    const globalState = await this.programService.getGlobalState();
    
    if (!globalState) {
      throw new Error('Global state not initialized');
    }

    const isAdminUser = await this.isAdmin();

    return {
      isAdmin: isAdminUser,
      globalState: {
        admin: globalState.data.admin.toBase58(),
        platformWallet: globalState.data.platformWallet.toBase58(),
        platformFeeBps: globalState.data.platformFeeBps,
        totalRounds: globalState.data.totalRounds.toNumber(),
        totalTournaments: globalState.data.totalTournaments.toNumber(),
        totalVolume: globalState.data.totalVolume.toNumber(),
        paused: globalState.data.paused,
      },
    };
  }

  /**
   * Pause the program (emergency stop)
   */
  public async pauseProgram(): Promise<string> {
    try {
      console.log('\n⏸️  Pausing program...');

      // Verify admin
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        throw new Error('Only admin can pause the program');
      }

      // Check if already paused
      const globalState = await this.programService.getGlobalState();
      if (globalState?.data.paused) {
        console.log('⚠️  Program is already paused');
        return '';
      }

      const [globalStatePda] = this.pdaService.getGlobalStatePDA();

      const signature = await this.programService.program.methods
        .pauseProgram()
        .accounts({
          globalState: globalStatePda,
          admin: this.config.payerKeypair.publicKey,
        })
        .rpc();

      console.log('✅ Program paused successfully!');
      console.log(`📝 Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      await this.config.connection.confirmTransaction(signature, 'confirmed');

      return signature;

    } catch (error) {
      console.error('❌ Failed to pause program:', error);
      throw error;
    }
  }

  /**
   * Unpause the program (resume operations)
   */
  public async unpauseProgram(): Promise<string> {
    try {
      console.log('\n▶️  Unpausing program...');

      // Verify admin
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        throw new Error('Only admin can unpause the program');
      }

      // Check if not paused
      const globalState = await this.programService.getGlobalState();
      if (!globalState?.data.paused) {
        console.log('⚠️  Program is not paused');
        return '';
      }

      const [globalStatePda] = this.pdaService.getGlobalStatePDA();

      const signature = await this.programService.program.methods
        .unpauseProgram()
        .accounts({
          globalState: globalStatePda,
          admin: this.config.payerKeypair.publicKey,
        })
        .rpc();

      console.log('✅ Program unpaused successfully!');
      console.log(`📝 Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      await this.config.connection.confirmTransaction(signature, 'confirmed');

      return signature;

    } catch (error) {
      console.error('❌ Failed to unpause program:', error);
      throw error;
    }
  }

  /**
   * Emergency cancel a round
   */
  public async emergencyCancel(params: EmergencyCancelParams): Promise<string> {
    try {
      console.log('\n🚨 Emergency cancelling round...');
      console.log(`  Round ID: ${params.roundId}`);
      console.log(`  Reason: ${params.reason}`);

      // Verify admin
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        throw new Error('Only admin can emergency cancel rounds');
      }

      // Get round data
      const round = await this.programService.getRound(params.roundId);
      if (!round) {
        throw new Error(`Round ${params.roundId} not found`);
      }

      // Check if already cancelled
      if (round.data.status && Object.keys(round.data.status)[0] === 'cancelled') {
        throw new Error('Round is already cancelled');
      }

      // Check if already settled
      if (round.data.status && Object.keys(round.data.status)[0] === 'settled') {
        throw new Error('Cannot cancel a settled round');
      }

      const [globalStatePda] = this.pdaService.getGlobalStatePDA();
      const [roundPda] = this.pdaService.getRoundPDA(params.roundId);

      const signature = await this.programService.program.methods
        .emergencyCancel(new BN(params.roundId), params.reason)
        .accounts({
          globalState: globalStatePda,
          round: roundPda,
          admin: this.config.payerKeypair.publicKey,
        })
        .rpc();

      console.log('✅ Round cancelled successfully!');
      console.log(`📝 Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      console.log('\n⚠️  Users can now request refunds for this round');

      await this.config.connection.confirmTransaction(signature, 'confirmed');

      return signature;

    } catch (error) {
      console.error('❌ Failed to emergency cancel round:', error);
      throw error;
    }
  }

  /**
   * Get round status for admin dashboard
   */
  public async getRoundStatus(roundId: number): Promise<{
    exists: boolean;
    status: string;
    totalPool: number;
    totalPredictions: number;
    needsAction: boolean;
    actionNeeded?: string;
  }> {
    try {
      const round = await this.programService.getRound(roundId);
      
      if (!round) {
        return {
          exists: false,
          status: 'not_found',
          totalPool: 0,
          totalPredictions: 0,
          needsAction: false,
        };
      }

      const status = Object.keys(round.data.status)[0];
      const clock = await this.config.connection.getSlot();
      const currentTime = Math.floor(Date.now() / 1000);

      let needsAction = false;
      let actionNeeded = undefined;

      // Check if needs closing
      if (status === 'active' && currentTime >= round.data.bettingCloseTime.toNumber()) {
        needsAction = true;
        actionNeeded = 'close_betting';
      }

      // Check if needs settlement
      if (status === 'closed' && currentTime >= round.data.endTime.toNumber()) {
        needsAction = true;
        actionNeeded = 'settle_round';
      }

      return {
        exists: true,
        status,
        totalPool: round.data.totalPool.toNumber(),
        totalPredictions: round.data.totalPredictions,
        needsAction,
        actionNeeded,
      };

    } catch (error) {
      return {
        exists: false,
        status: 'error',
        totalPool: 0,
        totalPredictions: 0,
        needsAction: false,
      };
    }
  }

  /**
   * Get all rounds that need admin action
   */
  public async getRoundsNeedingAction(): Promise<{
    roundId: number;
    action: string;
    reason: string;
  }[]> {
    try {
      const allRounds = await (this.programService.program.account as any)['round'].all();
      const needsAction: { roundId: number; action: string; reason: string }[] = [];
      const currentTime = Math.floor(Date.now() / 1000);

      for (const round of allRounds) {
        const status = Object.keys(round.account.status)[0];
        const roundId = round.account.roundId.toNumber();

        // Check if betting should be closed
        if (status === 'active' && currentTime >= round.account.bettingCloseTime.toNumber()) {
          needsAction.push({
            roundId,
            action: 'close_betting',
            reason: `Betting period ended ${Math.floor((currentTime - round.account.bettingCloseTime.toNumber()) / 60)} minutes ago`,
          });
        }

        // Check if round should be settled
        if (status === 'closed' && currentTime >= round.account.endTime.toNumber()) {
          needsAction.push({
            roundId,
            action: 'settle_round',
            reason: `Round ended ${Math.floor((currentTime - round.account.endTime.toNumber()) / 60)} minutes ago`,
          });
        }
      }

      return needsAction;

    } catch (error) {
      console.error('Failed to fetch rounds needing action:', error);
      return [];
    }
  }

  /**
   * Format admin stats for display
   */
  public formatAdminStats(stats: AdminStats): string {
    return `
Admin Dashboard:
  Admin Status: ${stats.isAdmin ? '✅ AUTHORIZED' : '❌ UNAUTHORIZED'}
  
Global State:
  Admin: ${stats.globalState.admin}
  Platform Wallet: ${stats.globalState.platformWallet}
  Platform Fee: ${stats.globalState.platformFeeBps / 100}%
  Program Status: ${stats.globalState.paused ? '⏸️  PAUSED' : '▶️  ACTIVE'}
  
Statistics:
  Total Rounds: ${stats.globalState.totalRounds}
  Total Tournaments: ${stats.globalState.totalTournaments}
  Total Volume: ${stats.globalState.totalVolume / LAMPORTS_PER_SOL} SOL
  Fees Collected: ${(stats.globalState.totalVolume * stats.globalState.platformFeeBps) / 1_000_000} SOL
    `;
  }

  // Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing Admin Service...\n');

    try {
      const adminService = new AdminService();
      const config = SolanaConfig.getInstance();

      // Test 1: Check admin status
      console.log('Test 1: Checking admin status...');
      const isAdminUser = await adminService.isAdmin();
      console.log(`✓ Admin check: ${isAdminUser ? 'YES' : 'NO'}`);
      console.log(`  Current user: ${config.payerKeypair.publicKey.toBase58()}`);

      if (!isAdminUser) {
        console.log('\n⚠️  Current user is not admin');
        console.log('   Admin functions will fail');
        console.log('   Make sure payer is the program admin');
      }

      // Test 2: Get admin statistics
      console.log('\nTest 2: Fetching admin statistics...');
      const stats = await adminService.getAdminStats();
      console.log(adminService.formatAdminStats(stats));

      // Test 3: Pause program
      console.log('Test 3: Testing pause functionality...');
      
      if (stats.globalState.paused) {
        console.log('  Program is already paused, unpausing first...');
        await adminService.unpauseProgram();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const pauseSignature = await adminService.pauseProgram();
      console.log(`✓ Program paused: ${pauseSignature}`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify pause
      const statsAfterPause = await adminService.getAdminStats();
      if (!statsAfterPause.globalState.paused) {
        throw new Error('Program pause verification failed');
      }
      console.log('✓ Pause verified on-chain');

      // Test 4: Try to create round while paused (should fail)
      console.log('\nTest 4: Verifying pause prevents round creation...');
      try {
        const { RoundService, VerificationMethod } = await import('./round.service');
        const roundService = new RoundService();
        
        const now = Math.floor(Date.now() / 1000);
        await roundService.createRound({
          question: 'Test while paused',
          startTime: now + 10,
          endTime: now + 70,
          numOutcomes: 2,
          verificationType: VerificationMethod.OnChainData,
          targetValue: 15000,
          dataSource: config.payerKeypair.publicKey,
          oracle: config.payerKeypair.publicKey,
        });
        
        throw new Error('Round creation should have failed while paused');
      } catch (error: any) {
        if (error.message.includes('ProgramPaused') || error.message.includes('paused')) {
          console.log('✓ Pause correctly prevents round creation');
        } else {
          throw error;
        }
      }

      // Test 5: Unpause program
      console.log('\nTest 5: Testing unpause functionality...');
      const unpauseSignature = await adminService.unpauseProgram();
      console.log(`✓ Program unpaused: ${unpauseSignature}`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify unpause
      const statsAfterUnpause = await adminService.getAdminStats();
      if (statsAfterUnpause.globalState.paused) {
        throw new Error('Program unpause verification failed');
      }
      console.log('✓ Unpause verified on-chain');

      // Test 6: Emergency cancel a round
      console.log('\nTest 6: Testing emergency cancel...');
      
      // Create a test round first
      const { RoundService, VerificationMethod } = await import('./round.service');
      const roundService = new RoundService();
      
      const now = Math.floor(Date.now() / 1000);
      const testRound = await roundService.createRound({
        question: 'Emergency cancel test round',
        startTime: now + 10,
        endTime: now + 70,
        numOutcomes: 2,
        verificationType: VerificationMethod.OnChainData,
        targetValue: 15000,
        dataSource: config.payerKeypair.publicKey,
        oracle: config.payerKeypair.publicKey,
      });

      console.log(`  Created test round: ${testRound.roundId}`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Emergency cancel it
      const cancelSignature = await adminService.emergencyCancel({
        roundId: testRound.roundId,
        reason: 'Testing emergency cancel functionality',
      });

      console.log(`✓ Round cancelled: ${cancelSignature}`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify cancellation
      const roundStatus = await adminService.getRoundStatus(testRound.roundId);
      if (roundStatus.status !== 'cancelled') {
        throw new Error('Round cancellation verification failed');
      }
      console.log('✓ Cancellation verified on-chain');

      // Test 7: Get rounds needing action
      console.log('\nTest 7: Checking rounds needing action...');
      const roundsNeedingAction = await adminService.getRoundsNeedingAction();
      console.log(`✓ Found ${roundsNeedingAction.length} round(s) needing action`);
      
      if (roundsNeedingAction.length > 0) {
        console.log('\nRounds needing action:');
        for (const round of roundsNeedingAction.slice(0, 3)) {
          console.log(`  Round ${round.roundId}:`);
          console.log(`    Action: ${round.action}`);
          console.log(`    Reason: ${round.reason}`);
        }
      }

      // Test 8: Final admin stats
      console.log('\nTest 8: Final admin statistics...');
      const finalStats = await adminService.getAdminStats();
      console.log('✓ Admin stats retrieved');
      console.log(`  Total Rounds: ${finalStats.globalState.totalRounds}`);
      console.log(`  Program Status: ${finalStats.globalState.paused ? 'PAUSED' : 'ACTIVE'}`);

      console.log('\n' + '='.repeat(60));
      console.log('✅ All Admin Service tests passed!');
      console.log('='.repeat(60));
      console.log('\n💡 Admin service ready for production!');
      console.log('   - Pause/unpause: ✅');
      console.log('   - Emergency cancel: ✅');
      console.log('   - Admin verification: ✅');
      console.log('   - Dashboard stats: ✅');

      return true;

    } catch (error) {
      console.error('\n❌ Admin Service test failed:', error);

      if (error instanceof Error) {
        console.error('Error details:', error.message);

        // Helpful error messages
        if (error.message.includes('Unauthorized')) {
          console.error('\n💡 Fix: Current payer is not the program admin');
          console.error('   Only the admin can use these functions');
        } else if (error.message.includes('ProgramPaused')) {
          console.error('\n💡 Fix: Program is paused, unpause first');
        } else if (error.message.includes('RoundAlreadyCancelled')) {
          console.error('\n💡 Fix: Round is already cancelled');
        }
      }

      return false;
    }
  }
}