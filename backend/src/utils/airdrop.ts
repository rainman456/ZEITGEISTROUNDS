import { SolanaConfig } from '../config/solana.config';

async function airdrop() {
  try {
    const config = SolanaConfig.getInstance();
    
    console.log('🪂 Requesting airdrop for payer...');
    console.log(`   Address: ${config.payerKeypair.publicKey.toBase58()}`);
    
    const signature = await config.requestAirdrop(1_000_000_000); // 2 SOL
    
    console.log('✅ Airdrop successful!');
    console.log(`📝 Signature: ${signature}`);
    console.log(`🔗 View: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    const newBalance = await config.getPayerBalance();
    console.log(`💰 New balance: ${newBalance / 1e9} SOL`);
    
  } catch (error) {
    console.error('❌ Airdrop failed:', error);
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  airdrop();
}