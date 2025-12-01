import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaConfig } from '../config/solana.config';
import { RoundService, VerificationMethod } from '../services/round.service';
import { PredictionService } from '../services/prediction.service';
import { SettlementService } from '../services/settlement.service';
import { ClaimsService } from '../services/claims.service';
import { OracleService } from '../services/oracle.service';

async function runFullGameCycle() {
  console.log('='.repeat(70));
  console.log('🎮 ZEITGEIST - FULL 60-SECOND GAME CYCLE TEST');
  console.log('='.repeat(70));

  try {
    const config = SolanaConfig.getInstance();
    const roundService = new RoundService();
    const predictionService = new PredictionService();
    const settlementService = new SettlementService();
    const claimsService = new ClaimsService();
    const oracleService = new OracleService();

    // Phase 1: Get Current Price
    console.log('\n📊 PHASE 1: FETCH CURRENT SOL PRICE');
    console.log('='.repeat(70));
    
    const currentPrice = await oracleService.fetchPythPriceHTTP('SOL');
    console.log(`Current SOL Price: ${oracleService.formatPrice(currentPrice)}`);
    
    // Set target slightly above/below current (50/50 chance)
    const targetPrice = currentPrice.price + (Math.random() > 0.5 ? 5 : -5);
    const targetPriceCents = Math.floor(targetPrice * 100);
    
    console.log(`Target Price: $${targetPrice.toFixed(2)}`);
    console.log(`Question: Will SOL be >= $${targetPrice.toFixed(2)} in 60 seconds?`);

    // Phase 2: Create Round
    console.log('\n🎲 PHASE 2: CREATE PREDICTION ROUND');
    console.log('='.repeat(70));

    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 5; // Start in 5 seconds
    const endTime = startTime + 60; // 60-second round

    const roundResult = await roundService.createRound({
      question: `Will SOL be >= $${targetPrice.toFixed(2)}?`,
      startTime,
      endTime,
      numOutcomes: 2,
      verificationType: VerificationMethod.OnChainData,
      targetValue: targetPriceCents,
      dataSource: config.payerKeypair.publicKey,
      oracle: config.payerKeypair.publicKey,
    });

    console.log(`✅ Round created: ${roundResult.roundId}`);
    console.log(`   Betting opens: ${new Date(startTime * 1000).toISOString()}`);
    console.log(`   Betting closes: ${new Date((startTime + 10) * 1000).toISOString()}`);
    console.log(`   Round ends: ${new Date(endTime * 1000).toISOString()}`);

    // Phase 3: Wait for Betting Window
    console.log('\n⏰ PHASE 3: WAITING FOR BETTING WINDOW');
    console.log('='.repeat(70));

    const waitForStart = (startTime - now) * 1000;
    if (waitForStart > 0) {
      console.log(`Waiting ${waitForStart / 1000}s for betting to open...`);
      await new Promise(resolve => setTimeout(resolve, waitForStart + 2000));
    }

    console.log('✅ Betting window is now OPEN!');

    // Phase 4: Place Predictions
    console.log('\n💰 PHASE 4: PLACE PREDICTIONS');
    console.log('='.repeat(70));

    // Predict based on current vs target
    const userPrediction = currentPrice.price >= targetPrice ? 0 : 1;
    const predictionLabel = userPrediction === 0 ? 'YES' : 'NO';

    console.log(`Placing bet: ${predictionLabel} (0.1 SOL)`);
    console.log(`Logic: Current $${currentPrice.price.toFixed(2)} ${userPrediction === 0 ? '>=' : '<'} Target $${targetPrice.toFixed(2)}`);

    await predictionService.placePrediction({
      roundId: roundResult.roundId,
      outcome: userPrediction,
      amount: 0.1 * LAMPORTS_PER_SOL,
    });

    console.log('✅ Prediction placed successfully!');

    // Show pool distribution
    const distribution = await predictionService.calculatePoolDistribution(roundResult.roundId);
    console.log(`\nCurrent Pool:`);
    console.log(`  Total: ${distribution.totalPool / LAMPORTS_PER_SOL} SOL`);
    console.log(`  YES: ${distribution.yesPool / LAMPORTS_PER_SOL} SOL (${distribution.yesPredictions} bets)`);
    console.log(`  NO: ${distribution.noPool / LAMPORTS_PER_SOL} SOL (${distribution.noPredictions} bets)`);

    // Phase 5: Live Price Monitoring
    console.log('\n📈 PHASE 5: LIVE PRICE MONITORING');
    console.log('='.repeat(70));
    console.log('Monitoring SOL price for 60 seconds...\n');

    const monitoringInterval = 10; // Check every 10 seconds
    const roundDuration = endTime - startTime;
    
    for (let elapsed = 0; elapsed < roundDuration; elapsed += monitoringInterval) {
      const remainingTime = roundDuration - elapsed;
      
      try {
        const livePrice = await oracleService.fetchPythPriceHTTP('SOL');
        const currentOutcome = oracleService.determinePriceOutcome(livePrice.price, targetPrice);
        
        console.log(`[T-${remainingTime}s] SOL: $${livePrice.price.toFixed(2)} | ` +
                   `Target: $${targetPrice.toFixed(2)} | ` +
                   `Currently: ${currentOutcome === 0 ? 'YES ✅' : 'NO ❌'}`);
      } catch (error) {
        console.log(`[T-${remainingTime}s] Failed to fetch price (retrying...)`);
      }

      if (remainingTime > monitoringInterval) {
        await new Promise(resolve => setTimeout(resolve, monitoringInterval * 1000));
      }
    }

    // Wait for round to fully end
    const timeUntilEnd = endTime - Math.floor(Date.now() / 1000) + 2;
    if (timeUntilEnd > 0) {
      console.log(`\nWaiting ${timeUntilEnd}s for round to officially end...`);
      await new Promise(resolve => setTimeout(resolve, timeUntilEnd * 1000));
    }

    // Phase 6: Settlement
    console.log('\n🏆 PHASE 6: ROUND SETTLEMENT');
    console.log('='.repeat(70));

    console.log('Fetching final price...');
    const finalPrice = await oracleService.fetchPythPriceHTTP('SOL');
    const finalOutcome = oracleService.determinePriceOutcome(finalPrice.price, targetPrice);

    console.log(`Final SOL Price: ${oracleService.formatPrice(finalPrice)}`);
    console.log(`Target Price: $${targetPrice.toFixed(2)}`);
    console.log(`Winning Outcome: ${finalOutcome === 0 ? 'YES' : 'NO'}`);

    // Close betting
    await settlementService.closeBetting(roundResult.roundId);
    console.log('✅ Betting closed');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Calculate winning pool
    const winningPool = await settlementService.calculateWinningPool(roundResult.roundId, finalOutcome);

    // Settle round
    const settlementResult = await settlementService.settleRound({
      roundId: roundResult.roundId,
      winningPoolAmount: winningPool,
    });

    console.log('✅ Round settled successfully!');
    console.log(`   Platform fee: ${settlementResult.platformFee / LAMPORTS_PER_SOL} SOL`);

    // Phase 7: Claim Winnings
    console.log('\n💎 PHASE 7: CLAIM WINNINGS');
    console.log('='.repeat(70));

    const didUserWin = userPrediction === finalOutcome;

    if (didUserWin) {
      console.log('🎉 YOU WON! Claiming winnings...');

      await new Promise(resolve => setTimeout(resolve, 2000));

      const claimResult = await claimsService.claimWinnings(roundResult.roundId);

      console.log('✅ Winnings claimed!');
      console.log(`   Amount: ${claimResult.amount / LAMPORTS_PER_SOL} SOL`);
    } else {
      console.log('😢 You lost this round. Better luck next time!');
      console.log(`   Your bet: ${predictionLabel}`);
      console.log(`   Actual: ${finalOutcome === 0 ? 'YES' : 'NO'}`);
    }

    // Phase 8: Final Summary
    console.log('\n📊 PHASE 8: FINAL SUMMARY');
    console.log('='.repeat(70));

    const finalRound = await roundService.getRound(roundResult.roundId);
    console.log(settlementService.formatSettlement(
      roundResult.roundId,
      finalRound,
      finalOutcome,
      settlementResult.platformFee
    ));

    // User stats
    const userStats = await predictionService.getUserStats(config.payerKeypair.publicKey);
    if (userStats) {
      console.log('Your Stats:');
      console.log(`  Total Predictions: ${userStats.data.totalPredictions.toString()}`);
      console.log(`  Total Wagered: ${userStats.data.totalWagered.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`  Total Won: ${userStats.data.totalWon.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`  Net Profit: ${userStats.data.netProfit.toNumber() / LAMPORTS_PER_SOL} SOL`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ FULL GAME CYCLE COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Game cycle failed:', error);
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the full cycle
runFullGameCycle();