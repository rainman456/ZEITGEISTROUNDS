import { SolanaConfig } from './config/solana.config';
import { ProgramService } from './blockchain/program';
import { PDAService } from './blockchain/pdas';
import { InitializeService } from './services/initialize.service';
import { RoundService } from './services/round.service';
import { PredictionService } from './services/prediction.service';
import { SettlementService } from './services/settlement.service';
import { OracleService } from './services/oracle.service';
import { AdminService } from './services/admin.service';
import { RefundService } from './services/refund.service';
import { NFTService } from './services/nft.service';



async function runTests() {
  console.log('='.repeat(70));
  console.log('ZEITGEIST BACKEND - SERVICE TESTING');
  console.log('='.repeat(70));

  const tests = [
    { name: '1. Solana Client', fn: SolanaConfig.__test },
    { name: '2. Program Interface', fn: ProgramService.__test },
    { name: '3. PDA Service', fn: PDAService.__test },
   { name: '4. Initialize Service', fn: InitializeService.__test },
   { name: '5. Round Creation Service', fn: RoundService.__test },
   { name: '6. Prediction Service', fn: PredictionService.__test },
   { name: '7. Settlement Service', fn: SettlementService.__test },
    { name: '8. Oracle Service', fn: OracleService.__test },
    { name: '9. Admin Service', fn: AdminService.__test },
      { name: '10. Refund Service', fn: RefundService.__test }, 
      { name: '11. NFT Service', fn: NFTService.__test },
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Running: ${test.name}`);
    console.log('='.repeat(70));

    const passed = await test.fn();

    if (!passed) {
      console.error(`\n❌ ${test.name} FAILED. Fix before continuing.\n`);
      process.exit(1);
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ ALL TESTS PASSED - BACKEND COMPLETE!');
  console.log('='.repeat(70));
  console.log('\n🎉 Ready to run full game cycle!');
  console.log('Run: npm run game-cycle');
}

// Handle errors gracefully
runTests().catch(error => {
  console.error('\n💥 Test runner crashed:', error);
  process.exit(1);
});