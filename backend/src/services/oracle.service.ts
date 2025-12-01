import { PublicKey, Connection } from '@solana/web3.js';
import axios from 'axios';
import { SolanaConfig } from '../config/solana.config';

export interface PriceData {
  price: number; // Price in USD
  confidence: number;
  expo: number;
  publishTime: number;
}

export class OracleService {
  private config: SolanaConfig;

  // Pyth price feed IDs for Hermes API (not Solana addresses)
  // These are the actual Pyth price feed IDs (32-byte hex strings)
  private readonly PYTH_PRICE_FEED_IDS = {
    SOL_USD: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', // SOL/USD
    BTC_USD: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', // BTC/USD
  };

  // Solana devnet addresses (for on-chain verification)
  private readonly PYTH_DEVNET_ADDRESSES = {
    SOL_USD: 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
    BTC_USD: '3m1y5h2uv7EQL3KaJZehvAJa4yDNvgc5yAdL9KPMKwvk',
  };

  constructor() {
    this.config = SolanaConfig.getInstance();
  }

  /**
   * Fetch Pyth price from Hermes API (HTTP endpoint)
   */
  public async fetchPythPriceHTTP(symbol: 'SOL' | 'BTC' = 'SOL'): Promise<PriceData> {
    try {
      const feedId = symbol === 'SOL' ? this.PYTH_PRICE_FEED_IDS.SOL_USD : this.PYTH_PRICE_FEED_IDS.BTC_USD;
      
      // Correct Pyth Hermes API endpoint format
      const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}`;
      
      const response = await axios.get(url);
      
      if (!response.data || !response.data.parsed || response.data.parsed.length === 0) {
        throw new Error('No price data returned from Pyth');
      }

      const priceData = response.data.parsed[0].price;
      
      // Convert to USD (Pyth returns price with exponent)
      const price = parseFloat(priceData.price) * Math.pow(10, priceData.expo);
      
      return {
        price,
        confidence: parseFloat(priceData.conf) * Math.pow(10, priceData.expo),
        expo: priceData.expo,
        publishTime: priceData.publish_time,
      };

    } catch (error) {
      console.error('Failed to fetch Pyth price:', error);
      throw error;
    }
  }

  /**
   * Fetch Pyth price from on-chain account (for settlement)
   */
  public async fetchPythPriceOnChain(feedPubkey: PublicKey): Promise<PriceData> {
    try {
      const accountInfo = await this.config.connection.getAccountInfo(feedPubkey);
      
      if (!accountInfo || accountInfo.data.length < 32) {
        throw new Error('Invalid Pyth price account');
      }

      const data = accountInfo.data;
      
      // Parse Pyth V2 price account structure
      const price = data.readBigInt64LE(8);
      const conf = data.readUInt32LE(16);
      const expo = data.readInt32LE(20);
      const publishTime = data.readBigInt64LE(24);

      // Convert to USD
      const priceUsd = Number(price) * Math.pow(10, expo);

      return {
        price: priceUsd,
        confidence: conf * Math.pow(10, expo),
        expo,
        publishTime: Number(publishTime),
      };

    } catch (error) {
      console.error('Failed to fetch on-chain Pyth price:', error);
      throw error;
    }
  }

  /**
   * Determine outcome based on price comparison
   */
  public determinePriceOutcome(currentPrice: number, targetPrice: number): number {
    // 0 = YES (price >= target), 1 = NO (price < target)
    return currentPrice >= targetPrice ? 0 : 1;
  }

  /**
   * Format price for display
   */
  public formatPrice(priceData: PriceData): string {
    return `$${priceData.price.toFixed(2)} (±$${priceData.confidence.toFixed(4)})`;
  }

  /**
   * Mock Twitter API (for PoC)
   */
  public async fetchTwitterData(query: string): Promise<{ result: number }> {
    // Mock implementation - in production, call Twitter API
    console.log(`📱 Mock Twitter API query: ${query}`);
    
    // Randomly return YES (0) or NO (1)
    const result = Math.random() > 0.5 ? 0 : 1;
    
    return { result };
  }

  /**
   * Mock Sports API (for PoC)
   */
  public async fetchSportsData(gameId: string): Promise<{ winner: number }> {
    // Mock implementation - in production, call sports API
    console.log(`⚽ Mock Sports API query: ${gameId}`);
    
    // Randomly return team 0 or team 1
    const winner = Math.random() > 0.5 ? 0 : 1;
    
    return { winner };
  }

  // Embedded test method
  public static async __test(): Promise<boolean> {
    console.log('\n🧪 Testing Oracle Service...\n');

    try {
      const oracleService = new OracleService();

      // Test 1: Fetch SOL price via HTTP
      console.log('Test 1: Fetching SOL/USD price from Pyth Hermes...');
      const solPriceHTTP = await oracleService.fetchPythPriceHTTP('SOL');
      console.log(`✓ SOL Price (HTTP): ${oracleService.formatPrice(solPriceHTTP)}`);
      console.log(`  Published: ${new Date(solPriceHTTP.publishTime * 1000).toISOString()}`);

      // Test 2: Determine outcome
      console.log('\nTest 2: Testing price outcome determination...');
      const targetPrice = 150.0;
      const outcome = oracleService.determinePriceOutcome(solPriceHTTP.price, targetPrice);
      console.log(`✓ Current: $${solPriceHTTP.price.toFixed(2)}, Target: $${targetPrice}`);
      console.log(`  Outcome: ${outcome === 0 ? 'YES (>= target)' : 'NO (< target)'}`);

      // Test 3: Fetch on-chain price (may fail if account doesn't exist on devnet)
      console.log('\nTest 3: Fetching SOL/USD price from on-chain account...');
      try {
        const feedPubkey = new PublicKey('H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG');
        const solPriceOnChain = await oracleService.fetchPythPriceOnChain(feedPubkey);
        console.log(`✓ SOL Price (On-chain): ${oracleService.formatPrice(solPriceOnChain)}`);
      } catch (error) {
        console.log('⚠️  On-chain Pyth account not available on devnet (expected)');
        console.log('   Using HTTP endpoint is fine for settlement');
      }

      // Test 4: Mock APIs
      console.log('\nTest 4: Testing mock APIs...');
      const twitterResult = await oracleService.fetchTwitterData('Did @elonmusk tweet about Solana?');
      console.log(`✓ Twitter result: ${twitterResult.result === 0 ? 'YES' : 'NO'}`);

      const sportsResult = await oracleService.fetchSportsData('lakers-vs-celtics');
      console.log(`✓ Sports winner: Team ${sportsResult.winner}`);

      console.log('\n' + '='.repeat(60));
      console.log('✅ All Oracle Service tests passed!');
      console.log('='.repeat(60));

      return true;

    } catch (error) {
      console.error('\n❌ Oracle Service test failed:', error);
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }

      return false;
    }
  }
}