// Initialize instruction

use anchor_lang::prelude::*;
use crate::contexts::Initialize;
use crate::events::GlobalStateInitialized;
use crate::constants::PLATFORM_FEE_BPS;

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let clock = Clock::get()?;
    
    // Initialize all fields explicitly
    global_state.admin = ctx.accounts.admin.key();
    global_state.platform_fee_bps = PLATFORM_FEE_BPS;
    global_state.total_rounds = 0;
    global_state.total_tournaments = 0;
    global_state.total_volume = 0;
    global_state.paused = false;
    global_state.bump = ctx.bumps.global_state;
    
    emit!(GlobalStateInitialized {
        admin: global_state.admin,
        platform_fee_bps: global_state.platform_fee_bps,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
