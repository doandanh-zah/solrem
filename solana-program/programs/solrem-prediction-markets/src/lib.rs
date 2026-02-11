use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("SoLrEmPrEdIcTiOnMaRkEtS1111111111111111111");

#[program]
pub mod solrem_prediction_markets {
    use super::*;

    /// Initialize a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        description: String,
        end_time: i64,
        creator_stake: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        market.market_id = market_id;
        market.creator = ctx.accounts.creator.key();
        market.description = description;
        market.end_time = end_time;
        market.creator_stake = creator_stake;
        market.total_pool = creator_stake;
        market.yes_pool = 0;
        market.no_pool = 0;
        market.status = MarketStatus::Active;
        market.created_at = clock.unix_timestamp;
        market.bump = ctx.bumps.market;

        // Transfer creator's stake to the market
        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_token_account.to_account_info(),
            to: ctx.accounts.market_token_account.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, creator_stake)?;

        emit!(MarketCreated {
            market_id,
            creator: ctx.accounts.creator.key(),
            description: description.clone(),
            end_time,
            creator_stake,
        });

        Ok(())
    }

    /// Place a bet on a prediction market
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        bet_amount: u64,
        bet_direction: BetDirection,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(market.status == MarketStatus::Active, ErrorCode::MarketNotActive);
        require!(clock.unix_timestamp < market.end_time, ErrorCode::MarketExpired);

        let bet = &mut ctx.accounts.bet;
        bet.market = market.key();
        bet.bettor = ctx.accounts.bettor.key();
        bet.amount = bet_amount;
        bet.direction = bet_direction;
        bet.created_at = clock.unix_timestamp;
        bet.bump = ctx.bumps.bet;

        // Update market pools
        match bet_direction {
            BetDirection::Yes => {
                market.yes_pool += bet_amount;
            }
            BetDirection::No => {
                market.no_pool += bet_amount;
            }
        }
        market.total_pool += bet_amount;

        // Transfer bet amount to market
        let cpi_accounts = Transfer {
            from: ctx.accounts.bettor_token_account.to_account_info(),
            to: ctx.accounts.market_token_account.to_account_info(),
            authority: ctx.accounts.bettor.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, bet_amount)?;

        emit!(BetPlaced {
            market: market.key(),
            bettor: ctx.accounts.bettor.key(),
            amount: bet_amount,
            direction: bet_direction,
        });

        Ok(())
    }

    /// Resolve a prediction market
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: MarketOutcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(market.status == MarketStatus::Active, ErrorCode::MarketNotActive);
        require!(clock.unix_timestamp >= market.end_time, ErrorCode::MarketNotExpired);
        require!(ctx.accounts.resolver.key() == market.creator, ErrorCode::UnauthorizedResolver);

        market.status = MarketStatus::Resolved;
        market.outcome = outcome;
        market.resolved_at = clock.unix_timestamp;

        emit!(MarketResolved {
            market: market.key(),
            outcome,
            resolved_at: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Claim winnings from a resolved market
    /// Uses reentrancy guard to prevent double-claiming
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        let bet = &ctx.accounts.bet;
        
        // Reentrancy guard: check if winnings already claimed
        require!(!bet.claimed, ErrorCode::WinningsAlreadyClaimed);

        require!(market.status == MarketStatus::Resolved, ErrorCode::MarketNotResolved);
        require!(bet.bettor == ctx.accounts.bettor.key(), ErrorCode::UnauthorizedClaimer);

        // Calculate winnings based on market outcome and bet direction
        let winning_pool = match market.outcome {
            MarketOutcome::Yes => market.yes_pool,
            MarketOutcome::No => market.no_pool,
        };

        let total_winning_bets = match market.outcome {
            MarketOutcome::Yes => market.yes_pool,
            MarketOutcome::No => market.no_pool,
        };

        // Prevent division by zero
        require!(total_winning_bets > 0, ErrorCode::NoWinningBets);

        let winnings = if (market.outcome == MarketOutcome::Yes && bet.direction == BetDirection::Yes)
            || (market.outcome == MarketOutcome::No && bet.direction == BetDirection::No)
        {
            // Calculate proportional winnings: (bet_amount * total_pool) / winning_pool
            (bet.amount * market.total_pool) / total_winning_bets
        } else {
            0
        };

        // Mark bet as claimed before transfer (reentrancy protection)
        let bet_mut = &mut ctx.accounts.bet;
        bet_mut.claimed = true;

        if winnings > 0 {
            // Transfer winnings to bettor using PDA signer
            let seeds = &[
                b"market",
                market.market_id.to_le_bytes().as_ref(),
                &[market.bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.market_token_account.to_account_info(),
                to: ctx.accounts.bettor_token_account.to_account_info(),
                authority: market.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, winnings)?;
        }

        emit!(WinningsClaimed {
            market: market.key(),
            bettor: ctx.accounts.bettor.key(),
            amount: winnings,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = market
    )]
    pub market_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        init,
        payer = bettor,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", market.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub bettor: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bettor
    )]
    pub bettor_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = market
    )]
    pub market_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub resolver: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), bettor.key().as_ref()],
        bump = bet.bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub bettor: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bettor
    )]
    pub bettor_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = market
    )]
    pub market_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub market_id: u64,
    pub creator: Pubkey,
    pub description: String,
    pub end_time: i64,
    pub creator_stake: u64,
    pub total_pool: u64,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub status: MarketStatus,
    pub outcome: Option<MarketOutcome>,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub market: Pubkey,
    pub bettor: Pubkey,
    pub amount: u64,
    pub direction: BetDirection,
    pub created_at: i64,
    pub bump: u8,
    pub claimed: bool, // Reentrancy guard flag
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Active,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketOutcome {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BetDirection {
    Yes,
    No,
}

#[event]
pub struct MarketCreated {
    pub market_id: u64,
    pub creator: Pubkey,
    pub description: String,
    pub end_time: i64,
    pub creator_stake: u64,
}

#[event]
pub struct BetPlaced {
    pub market: Pubkey,
    pub bettor: Pubkey,
    pub amount: u64,
    pub direction: BetDirection,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub outcome: MarketOutcome,
    pub resolved_at: i64,
}

#[event]
pub struct WinningsClaimed {
    pub market: Pubkey,
    pub bettor: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Market has expired")]
    MarketExpired,
    #[msg("Market has not expired yet")]
    MarketNotExpired,
    #[msg("Market is not resolved")]
    MarketNotResolved,
    #[msg("Unauthorized resolver")]
    UnauthorizedResolver,
    #[msg("Unauthorized claimer")]
    UnauthorizedClaimer,
    #[msg("Winnings already claimed for this bet")]
    WinningsAlreadyClaimed,
    #[msg("No winning bets in this market")]
    NoWinningBets,
}
