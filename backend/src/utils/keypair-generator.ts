import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

export function generateAndSaveKeypair(filename: string = 'payer.json') {
  const keypair = Keypair.generate();
  const keypairPath = path.join(process.cwd(), 'keypairs', filename);
  
  // Create keypairs directory if it doesn't exist
  const dir = path.dirname(keypairPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Save keypair
  fs.writeFileSync(
    keypairPath,
    JSON.stringify(Array.from(keypair.secretKey))
  );
  
  console.log(`Keypair generated and saved to: ${keypairPath}`);
  console.log(`Public Key: ${keypair.publicKey.toBase58()}`);
  console.log(`\nRun this command to fund it:`);
  console.log(`solana airdrop 2 ${keypair.publicKey.toBase58()} --url devnet`);
  
  return keypair;
}

// Allow running directly
if (require.main === module) {
  generateAndSaveKeypair();
}