import { PublicKey } from '@solana/web3.js';
import { RoundService, VerificationMethod, CreateRoundParams } from '../services/round.service';
import { SolanaConfig } from '../config/solana.config';

async function createTestRound() {
  try {
    console.log('🎲 Creating test round...\n');
    
    const roundService = new RoundService();
    const config = SolanaConfig.getInstance();
    
    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 10; // Start in 10 seconds
    const endTime = startTime + 60; // 60 second round
    
    // Pyth SOL/USD feed on devnet
    const pythSolUsdFeed = new PublicKey(
      'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG'
    );
    
    const params: CreateRoundParams = {
      question: 'Will SOL price be above $150 in 60 seconds?',
      startTime,
      endTime,
      numOutcomes: 2,
      verificationType: VerificationMethod.PythPrice,
      targetValue: 15000, // $150.00
      dataSource: pythSolUsdFeed,
      oracle: config.payerKeypair.publicKey,
    };
    
    const result = await roundService.createRound(params);
    
    console.log('\n✅ Success!');
    console.log(`Round ID: ${result.roundId}`);
    console.log(`Round PDA: ${result.roundPda.toBase58()}`);
    console.log(`\nView transaction:`);
    console.log(`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
    
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

createTestRound();