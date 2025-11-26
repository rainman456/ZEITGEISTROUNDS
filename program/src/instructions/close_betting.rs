// Close betting instruction

use anchor_lang::prelude::*;
use crate::contexts::CloseBetting;
use crate::events::BettingClosed;
use crate::errors::SocialRouletteError;

pub fn handler(ctx: Context<CloseBetting>, round_id: u64) -> Result<()> {
    let round = &mut ctx.accounts.round;
    let clock = Clock::get()?;
    
    // Validate betting period has ended
    require!(
        round.is_betting_ended(clock.unix_timestamp),
        SocialRouletteError::BettingStillActive
    );
    
    // Close betting
    round.close_betting()?;
    
    emit!(BettingClosed {
        round_id,
        total_pool: round.total_pool,
        total_predictions: round.total_predictions,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
