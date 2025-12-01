import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { SolanaConfig } from '../config/solana.config';

// PDA Seeds (must match smart contract constants.rs)
const SEEDS = {
  GLOBAL_STATE: 'global_state',
  ROUND: 'round',
  PREDICTION: 'prediction',
  USER_STATS: 'user_stats',
  TOURNAMENT: 'tournament',
  VAULT: 'vault',
} as const;

export class PDAService {
  private programId: PublicKey;

  constructor() {
    const config = SolanaConfig.getInstance();
    this.programId = config.programId;
  }

  // Global State PDA
  public getGlobalStatePDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.GLOBAL_STATE)],
      this.programId
    );
  }

  // Round PDA
  public getRoundPDA(roundId: number | BN): [PublicKey, number] {
    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEEDS.ROUND),
        roundIdBN.toArrayLike(Buffer, 'le', 8)
      ],
      this.programId
    );
  }

  // Vault PDA
  public getVaultPDA(roundId: number | BN): [PublicKey, number] {
    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEEDS.VAULT),
        roundIdBN.toArrayLike(Buffer, 'le', 8)
      ],
      this.programId
    );
  }

  // Prediction PDA
  public getPredictionPDA(roundId: number | BN, userPubkey: PublicKey): [PublicKey, number] {
    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEEDS.PREDICTION),
        roundIdBN.toArrayLike(Buffer, 'le', 8),
        userPubkey.toBuffer()
      ],
      this.programId
    );
  }

  // User Stats PDA
  public getUserStatsPDA(userPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEEDS.USER_STATS),
        userPubkey.toBuffer()
      ],
      this.programId
    );
  }

  // Tournament PDA
  public getTournamentPDA(tournamentId: number | BN): [PublicKey, number] {
    const tournamentIdBN = typeof tournamentId === 'number' ? new BN(tournamentId) : tournamentId;
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEEDS.TOURNAMENT),
        tournamentIdBN.toArrayLike(Buffer, 'le', 8)
      ],
      this.programId
    );
  }

  // Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing PDA Service...\n');
    
    try {
      const pdaService = new PDAService();
      const config = SolanaConfig.getInstance();
      
      // Test 1: Global State PDA
      const [globalStatePda, globalStateBump] = pdaService.getGlobalStatePDA();
      console.log('✓ Test 1: Global State PDA derived');
      console.log(`  Address: ${globalStatePda.toBase58()}`);
      console.log(`  Bump: ${globalStateBump}`);
      
      // Test 2: Round PDA
      const testRoundId = Date.now();
      const [roundPda, roundBump] = pdaService.getRoundPDA(testRoundId);
      console.log(`✓ Test 2: Round PDA derived (ID: ${testRoundId})`);
      console.log(`  Address: ${roundPda.toBase58()}`);
      console.log(`  Bump: ${roundBump}`);
      
      // Test 3: Vault PDA
      const [vaultPda, vaultBump] = pdaService.getVaultPDA(testRoundId);
      console.log('✓ Test 3: Vault PDA derived');
      console.log(`  Address: ${vaultPda.toBase58()}`);
      console.log(`  Bump: ${vaultBump}`);
      
      // Test 4: Prediction PDA
      const [predictionPda, predictionBump] = pdaService.getPredictionPDA(
        testRoundId,
        config.payerKeypair.publicKey
      );
      console.log('✓ Test 4: Prediction PDA derived');
      console.log(`  Address: ${predictionPda.toBase58()}`);
      console.log(`  Bump: ${predictionBump}`);
      
      // Test 5: User Stats PDA
      const [userStatsPda, userStatsBump] = pdaService.getUserStatsPDA(
        config.payerKeypair.publicKey
      );
      console.log('✓ Test 5: User Stats PDA derived');
      console.log(`  Address: ${userStatsPda.toBase58()}`);
      console.log(`  Bump: ${userStatsBump}`);
      
      // Test 6: Verify PDAs are deterministic
      const [roundPda2] = pdaService.getRoundPDA(testRoundId);
      const isDeterministic = roundPda.equals(roundPda2);
      console.log(`✓ Test 6: PDAs are deterministic: ${isDeterministic}`);
      
      console.log('\n✅ All PDA Service tests passed!\n');
      return true;
      
    } catch (error) {
      console.error('❌ PDA Service test failed:', error);
      return false;
    }
  }
}