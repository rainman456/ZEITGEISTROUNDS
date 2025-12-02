import { 
  PublicKey, 
  SystemProgram, 
  LAMPORTS_PER_SOL, 
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  Connection,
} from '@solana/web3.js';
import BN from 'bn.js';
import { ProgramService } from '../blockchain/program';
import { PDAService } from '../blockchain/pdas';
import { SolanaConfig } from '../config/solana.config';
import {
  getConcurrentMerkleTreeAccountSize,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  createAllocTreeIx,
} from '@solana/spl-account-compression';




export interface MomentCardMetadata {
  roundId: number;
  question: string;
  userOutcome: number;
  userAmount: number;
  isWinner: boolean;
  winningOutcome: number;
  totalPool: number;
  winningPool: number;
  timestamp: number;
  rarity: string;
}

export interface MintResult {
  signature: string;
  roundId: number;
  user: string;
  rarity: string;
  metadata: MomentCardMetadata;
  treeAddress?: string;
}

export interface TreeSetup {
  merkleTree: PublicKey;
  treeAuthority: PublicKey;
  maxDepth: number;
  maxBufferSize: number;
}

export class NFTService {
  private programService: ProgramService;
  private pdaService: PDAService;
  private config: SolanaConfig;

  // Metaplex Bubblegum Program ID
  private readonly BUBBLEGUM_PROGRAM_ID = new PublicKey(
    'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
  );

  // SPL Account Compression Program ID
  private readonly COMPRESSION_PROGRAM_ID = SPL_ACCOUNT_COMPRESSION_PROGRAM_ID;

  // SPL Noop Program ID
  private readonly NOOP_PROGRAM_ID = SPL_NOOP_PROGRAM_ID;

  // Store merkle tree info (in production, store in database)
  private merkleTreeKeypair: Keypair | null = null;
  private treeAuthority: PublicKey | null = null;

  constructor() {
    this.programService = ProgramService.getInstance();
    this.pdaService = new PDAService();
    this.config = SolanaConfig.getInstance();
  }

  /**
   * Initialize a merkle tree for compressed NFTs (one-time setup)
   */
  public async setupMerkleTree(): Promise<TreeSetup> {
  try {
    console.log('\n🌳 Setting up Merkle Tree for cNFTs...');

    this.merkleTreeKeypair = Keypair.generate();
    const merkleTree = this.merkleTreeKeypair.publicKey;

    const maxDepth = 14;
    const maxBufferSize = 64;

    console.log(`  Tree Address: ${merkleTree.toBase58()}`);
    console.log(`  Max Depth: ${maxDepth} (capacity: ${2 ** maxDepth} NFTs)`);
    console.log(`  Max Buffer Size: ${maxBufferSize}`);

    const [treeAuthorityPDA] = PublicKey.findProgramAddressSync(
      [merkleTree.toBuffer()],
      this.BUBBLEGUM_PROGRAM_ID
    );
    this.treeAuthority = treeAuthorityPDA;

    console.log(`  Tree Authority: ${treeAuthorityPDA.toBase58()}`);

    const space = getConcurrentMerkleTreeAccountSize(maxDepth, maxBufferSize);
    const lamports = await this.config.connection.getMinimumBalanceForRentExemption(space);

    console.log(`  Space required: ${space} bytes`);
    console.log(`  Rent: ${lamports / LAMPORTS_PER_SOL} SOL`);

    // Only allocate the tree - Bubblegum will initialize tree authority on first mint
    const allocTreeIx = await createAllocTreeIx(
      this.config.connection,
      merkleTree,
      this.config.payerKeypair.publicKey,
      { maxDepth, maxBufferSize },
      0
    );

    const tx = new Transaction().add(allocTreeIx);
    tx.feePayer = this.config.payerKeypair.publicKey;
    tx.recentBlockhash = (await this.config.connection.getLatestBlockhash()).blockhash;

    const signature = await sendAndConfirmTransaction(
      this.config.connection,
      tx,
      [this.config.payerKeypair, this.merkleTreeKeypair],
      { commitment: 'confirmed' }
    );

    console.log('✅ Merkle tree allocated (authority will init on first mint)!');
    console.log(`📝 Signature: ${signature}`);
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    return {
      merkleTree,
      treeAuthority: treeAuthorityPDA,
      maxDepth,
      maxBufferSize,
    };

  } catch (error) {
    console.error('❌ Failed to setup merkle tree:', error);
    throw error;
  }
}

  /**
   * Calculate rarity based on winning percentage
   */
  private calculateRarity(winningPool: number, totalPool: number, isWinner: boolean): string {
    if (!isWinner) {
      return 'Common';
    }

    if (totalPool === 0) {
      return 'Common';
    }

    const winPercentage = (winningPool * 100) / totalPool;

    if (winPercentage < 10) {
      return 'Legendary';
    } else if (winPercentage < 25) {
      return 'Epic';
    } else if (winPercentage < 40) {
      return 'Rare';
    } else {
      return 'Uncommon';
    }
  }

  /**
   * Check if user can mint a moment card for a round
   */
  public async canMintMomentCard(roundId: number, userPubkey?: PublicKey): Promise<{
    canMint: boolean;
    reason?: string;
    metadata?: MomentCardMetadata;
  }> {
    try {
      const user = userPubkey || this.config.payerKeypair.publicKey;

      // Get round data
      const round = await this.programService.getRound(roundId);
      if (!round) {
        return {
          canMint: false,
          reason: 'Round not found',
        };
      }

      // Check if round is settled
      const status = Object.keys(round.data.status)[0];
      if (status !== 'settled') {
        return {
          canMint: false,
          reason: `Round not settled (status: ${status})`,
        };
      }

      // Get user's prediction
      const prediction = await this.programService.getPrediction(roundId, user);
      if (!prediction) {
        return {
          canMint: false,
          reason: 'No prediction found for this user',
        };
      }

      const isWinner = prediction.data.outcome === round.data.winningOutcome;
      const rarity = this.calculateRarity(
        round.data.winningPool.toNumber(),
        round.data.totalPool.toNumber(),
        isWinner
      );

      const metadata: MomentCardMetadata = {
        roundId,
        question: round.data.question,
        userOutcome: prediction.data.outcome,
        userAmount: prediction.data.amount.toNumber(),
        isWinner,
        winningOutcome: round.data.winningOutcome,
        totalPool: round.data.totalPool.toNumber(),
        winningPool: round.data.winningPool.toNumber(),
        timestamp: prediction.data.timestamp.toNumber(),
        rarity,
      };

      return {
        canMint: true,
        metadata,
      };

    } catch (error) {
      return {
        canMint: false,
        reason: `Error checking eligibility: ${error}`,
      };
    }
  }

  /**
   * Mint a moment card NFT - REAL IMPLEMENTATION calling smart contract
   */
  public async mintMomentCard(roundId: number, userPubkey?: PublicKey): Promise<MintResult> {
    try {
      const user = userPubkey || this.config.payerKeypair.publicKey;

      console.log(`\n🎨 Minting Moment Card for round ${roundId}...`);
      console.log(`  User: ${user.toBase58()}`);

      // Check eligibility
      const eligibility = await this.canMintMomentCard(roundId, user);
      if (!eligibility.canMint) {
        throw new Error(`Cannot mint moment card: ${eligibility.reason}`);
      }

      const metadata = eligibility.metadata!;
      console.log(`  Rarity: ${metadata.rarity}`);
      console.log(`  Winner: ${metadata.isWinner ? 'YES' : 'NO'}`);

      // Check if tree is set up
      if (!this.merkleTreeKeypair || !this.treeAuthority) {
        console.log('  ⚠️  Merkle tree not initialized, setting up...');
        const treeSetup = await this.setupMerkleTree();
        console.log(`  ✅ Tree ready: ${treeSetup.merkleTree.toBase58()}`);
      }

      // For prototype: Create a simple collection mint (just a keypair)
      const collectionMint = Keypair.generate().publicKey;
      
      // Derive PDAs for metadata and edition (Token Metadata Program)
      const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
      
      const [collectionMetadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          collectionMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const [collectionEdition] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          collectionMint.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Get PDAs for the smart contract call
      const [roundPda] = this.pdaService.getRoundPDA(roundId);
      const [predictionPda] = this.pdaService.getPredictionPDA(roundId, user);

      console.log('\n  📞 Calling smart contract mint_moment_card...');
      console.log(`     Round PDA: ${roundPda.toBase58()}`);
      console.log(`     Prediction PDA: ${predictionPda.toBase58()}`);
      console.log(`     Merkle Tree: ${this.merkleTreeKeypair!.publicKey.toBase58()}`);

      // Call the smart contract's mint_moment_card instruction
      const signature = await this.programService.program.methods
        .mintMomentCard(new BN(roundId))
        .accounts({
          round: roundPda,
          prediction: predictionPda,
          merkleTree: this.merkleTreeKeypair!.publicKey,
          treeAuthority: this.treeAuthority!,
          collectionMint: collectionMint,
          collectionMetadata: collectionMetadata,
          collectionEdition: collectionEdition,
          user: user,
          bubblegumProgram: this.BUBBLEGUM_PROGRAM_ID,
          compressionProgram: this.COMPRESSION_PROGRAM_ID,
          logWrapper: this.NOOP_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('\n✅ Moment Card minted successfully!');
      console.log(`📝 Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      console.log(`🎨 Rarity: ${metadata.rarity}`);
      console.log(`🏆 Result: ${metadata.isWinner ? 'WINNER' : 'PARTICIPATED'}`);

      // Wait for confirmation
      await this.config.connection.confirmTransaction(signature, 'confirmed');

      return {
        signature,
        roundId,
        user: user.toBase58(),
        rarity: metadata.rarity,
        metadata,
        treeAddress: this.merkleTreeKeypair!.publicKey.toBase58(),
      };

    } catch (error) {
      console.error('❌ Failed to mint moment card:', error);
      throw error;
    }
  }

  /**
   * Get all moment cards for a user
   */
  public async getUserMomentCards(userPubkey?: PublicKey): Promise<MomentCardMetadata[]> {
    try {
      const user = userPubkey || this.config.payerKeypair.publicKey;

      console.log(`\n🔍 Fetching moment cards for user: ${user.toBase58()}`);

      const allPredictions = await (this.programService.program.account as any)['prediction'].all();
      
      const userPredictions = allPredictions.filter((pred: any) => 
        pred.account.user.equals(user)
      );

      console.log(`  Found ${userPredictions.length} prediction(s)`);

      const momentCards: MomentCardMetadata[] = [];

      for (const pred of userPredictions) {
        const roundId = pred.account.roundId.toNumber();
        const eligibility = await this.canMintMomentCard(roundId, user);
        
        if (eligibility.canMint && eligibility.metadata) {
          momentCards.push(eligibility.metadata);
        }
      }

      return momentCards;

    } catch (error) {
      console.error('Failed to fetch user moment cards:', error);
      return [];
    }
  }

  /**
   * Generate metadata URI for moment card
   */
  public generateMetadataURI(roundId: number, userPubkey: PublicKey): string {
    return `https://api.zeitgeist.game/moments/${roundId}/${userPubkey.toBase58()}`;
  }

  /**
   * Format moment card metadata for display
   */
  public formatMomentCard(metadata: MomentCardMetadata): string {
    return `
╔════════════════════════════════════════════════════════╗
║              ZEITGEIST MOMENT CARD                     ║
╠════════════════════════════════════════════════════════╣
║ Round ID: ${metadata.roundId.toString().padEnd(43)} ║
║ Question: ${metadata.question.slice(0, 43).padEnd(43)} ║
║                                                        ║
║ Your Prediction: ${(metadata.userOutcome === 0 ? 'YES' : 'NO').padEnd(37)} ║
║ Amount Wagered: ${(metadata.userAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL${' '.repeat(28)} ║
║                                                        ║
║ Result: ${(metadata.isWinner ? '🏆 WINNER' : '❌ LOSS').padEnd(45)} ║
║ Winning Outcome: ${(metadata.winningOutcome === 0 ? 'YES' : 'NO').padEnd(38)} ║
║                                                        ║
║ Pool Stats:                                            ║
║   Total Pool: ${(metadata.totalPool / LAMPORTS_PER_SOL).toFixed(4)} SOL${' '.repeat(29)} ║
║   Winning Pool: ${(metadata.winningPool / LAMPORTS_PER_SOL).toFixed(4)} SOL${' '.repeat(27)} ║
║                                                        ║
║ Rarity: ⭐ ${metadata.rarity.toUpperCase().padEnd(40)} ║
║ Date: ${new Date(metadata.timestamp * 1000).toISOString().slice(0, 10).padEnd(45)} ║
╚════════════════════════════════════════════════════════╝
    `;
  }

  /**
   * Get rarity distribution
   */
  public async getRarityDistribution(): Promise<{
    legendary: number;
    epic: number;
    rare: number;
    uncommon: number;
    common: number;
  }> {
    try {
      const allRounds = await (this.programService.program.account as any)['round'].all();
      
      const settledRounds = allRounds.filter((round: any) => {
        const status = Object.keys(round.account.status)[0];
        return status === 'settled';
      });

      const distribution = {
        legendary: 0,
        epic: 0,
        rare: 0,
        uncommon: 0,
        common: 0,
      };

      for (const round of settledRounds) {
        const winningPool = round.account.winningPool.toNumber();
        const totalPool = round.account.totalPool.toNumber();
        
        const rarity = this.calculateRarity(winningPool, totalPool, true);
        
        switch (rarity) {
          case 'Legendary':
            distribution.legendary++;
            break;
          case 'Epic':
            distribution.epic++;
            break;
          case 'Rare':
            distribution.rare++;
            break;
          case 'Uncommon':
            distribution.uncommon++;
            break;
          case 'Common':
            distribution.common++;
            break;
        }
      }

      return distribution;

    } catch (error) {
      return {
        legendary: 0,
        epic: 0,
        rare: 0,
        uncommon: 0,
        common: 0,
      };
    }
  }

  // Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing NFT Moment Card Service (REAL DEVNET IMPLEMENTATION)...\n');

    try {
      const nftService = new NFTService();
      const config = SolanaConfig.getInstance();

      // Test 1: Check balance
      console.log('Test 1: Checking balance...');
      const balance = await config.getPayerBalance();
      console.log(`✓ Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

      if (balance < 1.0 * LAMPORTS_PER_SOL) {
        console.log('⚠️  Low balance. Requesting airdrop...');
        await config.requestAirdrop(2_000_000_000);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Test 2: Setup merkle tree
      console.log('\nTest 2: Setting up Merkle Tree...');
      const treeSetup = await nftService.setupMerkleTree();
      console.log('✓ Merkle tree created');
      console.log(`  Address: ${treeSetup.merkleTree.toBase58()}`);
      console.log(`  Authority: ${treeSetup.treeAuthority.toBase58()}`);
      console.log(`  Capacity: ${2 ** treeSetup.maxDepth} NFTs`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test 3: Setup test round
      console.log('\nTest 3: Setting up test round with prediction...');
      
      const { RoundService, VerificationMethod } = await import('./round.service');
      const { PredictionService } = await import('./prediction.service');
      const { SettlementService } = await import('./settlement.service');
      
      const roundService = new RoundService();
      const predictionService = new PredictionService();
      const settlementService = new SettlementService();

      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 5;
      const endTime = startTime + 60;

      const testRound = await roundService.createRound({
        question: 'NFT Test: Will SOL > $150?',
        startTime,
        endTime,
        numOutcomes: 2,
        verificationType: VerificationMethod.OnChainData,
        targetValue: 15000,
        dataSource: config.payerKeypair.publicKey,
        oracle: config.payerKeypair.publicKey,
      });

      console.log(`✓ Test round created: ${testRound.roundId}`);

      // Wait for betting
      const waitTime = (startTime - now + 2) * 1000;
      if (waitTime > 0) {
        console.log(`  Waiting ${waitTime / 1000}s for betting to open...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Place bet
      await predictionService.placePrediction({
        roundId: testRound.roundId,
        outcome: 0,
        amount: 0.1 * LAMPORTS_PER_SOL,
      });

      console.log('✓ Placed bet');

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test 4: Check eligibility before settlement
      console.log('\nTest 4: Checking eligibility (before settlement)...');
      const eligibilityBefore = await nftService.canMintMomentCard(testRound.roundId);
      
      if (eligibilityBefore.canMint) {
        throw new Error('Should not mint before settlement');
      }
      
      console.log(`✓ Correctly rejected: ${eligibilityBefore.reason}`);

      // Test 5: Settle round
      console.log('\nTest 5: Settling round...');
      const timeUntilEnd = endTime - Math.floor(Date.now() / 1000) + 2;
      if (timeUntilEnd > 0) {
        console.log(`  Waiting ${timeUntilEnd}s...`);
        await new Promise(resolve => setTimeout(resolve, timeUntilEnd * 1000));
      }

      await settlementService.closeBetting(testRound.roundId);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const winningPoolAmount = await settlementService.calculateWinningPool(testRound.roundId, 0);
      await settlementService.settleRound({
        roundId: testRound.roundId,
        winningPoolAmount,
      });

      console.log('✓ Round settled');

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test 6: Check eligibility after settlement
      console.log('\nTest 6: Checking eligibility (after settlement)...');
      const eligibilityAfter = await nftService.canMintMomentCard(testRound.roundId);
      
      if (!eligibilityAfter.canMint) {
        throw new Error(`Should be able to mint: ${eligibilityAfter.reason}`);
      }

      console.log('✓ Eligibility confirmed');
      console.log(`  Rarity: ${eligibilityAfter.metadata?.rarity}`);

      // Test 7: MINT THE ACTUAL NFT ON DEVNET
      console.log('\nTest 7: Minting REAL compressed NFT on devnet...');
      const mintResult = await nftService.mintMomentCard(testRound.roundId);

      console.log('✓ NFT MINTED ON DEVNET!');
      console.log(`  Signature: ${mintResult.signature}`);
      console.log(`  Rarity: ${mintResult.rarity}`);
      console.log(`  Tree: ${mintResult.treeAddress}`);

      // Test 8: Display card
      console.log('\nTest 8: Displaying minted moment card...');
      console.log(nftService.formatMomentCard(mintResult.metadata));

      // Test 9: Verify on-chain
      console.log('Test 9: Verifying transaction on-chain...');
      const txInfo = await config.connection.getTransaction(mintResult.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo) {
        throw new Error('Transaction not found on-chain');
      }

      console.log('✓ Transaction verified on-chain');
      console.log(`  Slot: ${txInfo.slot}`);
      console.log(`  Block time: ${new Date(txInfo.blockTime! * 1000).toISOString()}`);

      // Test 10: Rarity calculation
      console.log('\nTest 10: Testing rarity calculation...');
      const rarityTests = [
        { wp: 5, tp: 100, win: true, exp: 'Legendary' },
        { wp: 15, tp: 100, win: true, exp: 'Epic' },
        { wp: 30, tp: 100, win: true, exp: 'Rare' },
        { wp: 45, tp: 100, win: true, exp: 'Uncommon' },
      ];

      for (const test of rarityTests) {
        const rarity = nftService['calculateRarity'](test.wp, test.tp, test.win);
        if (rarity !== test.exp) {
          throw new Error(`Expected ${test.exp}, got ${rarity}`);
        }
        console.log(`  ✓ ${test.wp}/${test.tp} = ${rarity}`);
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ ALL NFT SERVICE TESTS PASSED!');
      console.log('='.repeat(60));
      console.log('\n🎉 REAL NFT MINTING WORKING ON DEVNET!');
      console.log('\n📊 Summary:');
      console.log('   - Merkle tree: ✅ CREATED');
      console.log('   - Smart contract call: ✅ WORKING');
      console.log('   - cNFT minting: ✅ WORKING');
      console.log('   - On-chain verification: ✅ CONFIRMED');
      console.log('\n🔗 View transaction:');
      console.log(`   https://explorer.solana.com/tx/${mintResult.signature}?cluster=devnet`);

      return true;

    } catch (error) {
      console.error('\n❌ NFT Service test failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return false;
    }
  }
}