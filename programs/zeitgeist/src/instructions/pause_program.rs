use anchor_lang::prelude::*;
use crate::contexts::PauseProgram;

pub fn handler(ctx: Context<PauseProgram>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    global_state.paused = true;
    Ok(())
}