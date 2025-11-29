use anchor_lang::prelude::*;
use mpl_bubblegum::instructions::MintV1CpiBuilder;
use mpl_bubblegum::types::{MetadataArgs, TokenProgramVersion, TokenStandard};
use crate::contexts::MintMomentCard;
use crate::errors::SocialRouletteError;

pub fn handler(ctx: Context<MintMomentCard>, round_id: u64) -> Result<()> {
    let round = &ctx.accounts.round;
    let prediction = &ctx.accounts.prediction;
    
    // Validate round is settled
    require!(
        round.is_settled(),
        SocialRouletteError::RoundNotSettled
    );
    
    // Determine rarity based on outcome
   let rarity = if prediction.is_winner(round.winning_outcome) {
    // Calculate what % of total pool bet on winning side
    let win_percentage = (round.winning_pool * 100) / round.total_pool;
    
    if win_percentage < 20 {
        "Legendary" // Less than 20% bet on winning side
    } else if win_percentage < 40 {
        "Epic" // 20-40% bet on winning side
    } else {
        "Rare" // 40%+ bet on winning side (favorite won)
    }
} else {
    "Common" // Wrong prediction
};


    let front_metadata = format!(
    "Question: {}|Prediction: Outcome {}|Timestamp: {}|Pot: {} SOL",
    round.question,
    prediction.outcome,
    prediction.timestamp,
    round.total_pool as f64 / 1_000_000_000.0
);

let back_metadata = if prediction.is_winner(round.winning_outcome) {
    let winnings = crate::utils::calculate_winnings(
        prediction.amount,
        round.winning_pool,
        round.total_pool,
        round.platform_fee_collected,
    )?;
    
    format!(
        "Outcome: {}|Winnings: {} SOL|Rank: {}|Rarity: {}",
        round.winning_outcome,
        winnings as f64 / 1_000_000_000.0,
        "N/A", // Need to implement ranking system
        rarity
    )
} else {
    format!(
        "Outcome: {}|Winnings: 0 SOL|Rank: N/A|Rarity: {}",
        round.winning_outcome,
        rarity
    )
};

// Calculate user's rank:
let user_rank = round.leaderboard.iter()
    .position(|(user, _)| user == &ctx.accounts.user.key())
    .map(|pos| pos + 1)
    .unwrap_or(0);



    
    // Build metadata
    let metadata = MetadataArgs {
        name: format!("Zeitgeist Round #{} - {}", round_id, rarity),
    symbol: "ZGST".to_string(),
    uri: format!(
        "https://api.zeitgeist.game/moments/{}/{}?front={}&back={}",
        round_id,
        ctx.accounts.user.key(),
        urlencoding::encode(&front_metadata),
        urlencoding::encode(&back_metadata)
        ),
        seller_fee_basis_points: 0,
        primary_sale_happened: true,
        is_mutable: false,
        edition_nonce: None,
        token_standard: Some(TokenStandard::NonFungible),
        collection: Some(mpl_bubblegum::types::Collection {
            verified: false,
            key: ctx.accounts.collection_mint.key(),
        }),
        uses: None,
        token_program_version: TokenProgramVersion::Original,
        creators: vec![],
    };
    
    // Mint compressed NFT
    MintV1CpiBuilder::new(&ctx.accounts.bubblegum_program)
        .tree_config(&ctx.accounts.tree_authority)
        .leaf_owner(&ctx.accounts.user.to_account_info())
        .leaf_delegate(&ctx.accounts.user.to_account_info())
        .merkle_tree(&ctx.accounts.merkle_tree.to_account_info())
        .payer(&ctx.accounts.user.to_account_info())
        .tree_creator_or_delegate(&ctx.accounts.user.to_account_info())
        .log_wrapper(&ctx.accounts.log_wrapper.to_account_info())
        .compression_program(&ctx.accounts.compression_program.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .metadata(metadata)
        .invoke()?;
    
    Ok(())
}