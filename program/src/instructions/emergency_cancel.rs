// Emergency cancel round instruction

use anchor_lang::prelude::*;
use crate::contexts::EmergencyCancel;
use crate::events::RoundCancelled;
use crate::errors::SocialRouletteError;

pub fn handler(ctx: Context<EmergencyCancel>, round_id: u64, reason: String) -> Result<()> {
    let round = &mut ctx.accounts.round;
    let clock = Clock::get()?;
    
    // Validate round is not already settled
    require!(
        !round.is_settled(),
        SocialRouletteError::RoundAlreadySettled
    );
    
    // Cancel the round
    round.cancel()?;
    
    emit!(RoundCancelled {
        round_id,
        reason,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
