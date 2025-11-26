// Constants for the Social Roulette program

use anchor_lang::prelude::*;

// Fee configuration (in basis points, 1 bp = 0.01%)
pub const PLATFORM_FEE_BPS: u16 = 200; // 2% platform fee
pub const MIN_PREDICTION_AMOUNT: u64 = 1_000_000; // 0.001 SOL minimum bet
pub const MAX_PREDICTION_AMOUNT: u64 = 100_000_000_000; // 100 SOL maximum bet

// Time limits (in seconds)
pub const MIN_BETTING_DURATION: i64 = 60; // 1 minute minimum
pub const MAX_BETTING_DURATION: i64 = 86400 * 7; // 7 days maximum
pub const SETTLEMENT_TIMEOUT: i64 = 86400; // 24 hours to settle after betting closes

// Round configuration
pub const MAX_PREDICTIONS_PER_ROUND: u32 = 10000;
pub const MAX_OUTCOMES: u8 = 10; // Maximum number of possible outcomes

// Tournament configuration
pub const MAX_TOURNAMENT_ROUNDS: u8 = 20;
pub const MIN_TOURNAMENT_ENTRY_FEE: u64 = 10_000_000; // 0.01 SOL

// PDA seeds
pub const GLOBAL_STATE_SEED: &[u8] = b"global_state";
pub const ROUND_SEED: &[u8] = b"round";
pub const PREDICTION_SEED: &[u8] = b"prediction";
pub const USER_STATS_SEED: &[u8] = b"user_stats";
pub const TOURNAMENT_SEED: &[u8] = b"tournament";
pub const VAULT_SEED: &[u8] = b"vault";

// Account space calculations (discriminator + data)
pub const GLOBAL_STATE_SIZE: usize = 8 + 32 + 8 + 8 + 8 + 1 + 1; // ~66 bytes
pub const ROUND_SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 32 + 8 + 8 + 1; // ~160 bytes
pub const PREDICTION_SIZE: usize = 8 + 32 + 32 + 8 + 1 + 8 + 1 + 1; // ~100 bytes
pub const USER_STATS_SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8; // ~96 bytes
pub const TOURNAMENT_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 8 + 8; // ~120 bytes
