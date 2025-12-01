import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PredictionService } from '../services/prediction.service';

async function placeTestPrediction() {
  try {
    const predictionService = new PredictionService();

    // Get round ID from command line or use default
    const roundId = parseInt(process.argv[2]) || Math.floor(Date.now() / 1000);
    const outcome = parseInt(process.argv[3]) || 0; // 0 = YES, 1 = NO
    const amountSol = parseFloat(process.argv[4]) || 0.1;

    console.log('💰 Placing prediction...\n');
    console.log(`Round ID: ${roundId}`);
    console.log(`Outcome: ${outcome === 0 ? 'YES' : 'NO'}`);
    console.log(`Amount: ${amountSol} SOL\n`);

    const result = await predictionService.placePrediction({
      roundId,
      outcome,
      amount: amountSol * LAMPORTS_PER_SOL,
    });

    console.log('\n✅ Success!');
    console.log(`Prediction PDA: ${result.predictionPda.toBase58()}`);
    console.log(`\nView transaction:`);
    console.log(`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);

  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

placeTestPrediction();