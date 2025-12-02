-- Global State Table
CREATE TABLE IF NOT EXISTS global_state (
    id SERIAL PRIMARY KEY,
    admin_pubkey VARCHAR(44) NOT NULL,
    oracle_pubkey VARCHAR(44) NOT NULL,
    platform_fee_bps INTEGER NOT NULL DEFAULT 0,
    total_rounds BIGINT NOT NULL DEFAULT 0,
    total_volume BIGINT NOT NULL DEFAULT 0,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Rounds Table
CREATE TABLE IF NOT EXISTS rounds (
    id SERIAL PRIMARY KEY,
    round_pubkey VARCHAR(44) UNIQUE NOT NULL,
    round_id BIGINT UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    
    -- Timing
    betting_start BIGINT NOT NULL,
    betting_end BIGINT NOT NULL,
    settlement_time BIGINT,
    
    -- Pool Info
    total_pool BIGINT NOT NULL DEFAULT 0,
    total_predictions INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    outcome INTEGER,
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    created_by VARCHAR(44) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'betting_closed', 'settled', 'cancelled'))
);

-- Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    prediction_pubkey VARCHAR(44) UNIQUE NOT NULL,
    round_id BIGINT NOT NULL REFERENCES rounds(round_id),
    user_pubkey VARCHAR(44) NOT NULL,
    
    -- Prediction Details
    predicted_outcome INTEGER NOT NULL,
    amount BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    
    -- Settlement
    is_winner BOOLEAN,
    payout_amount BIGINT DEFAULT 0,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at BIGINT,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(round_id, user_pubkey)
);

-- User Statistics Table
CREATE TABLE IF NOT EXISTS user_stats (
    id SERIAL PRIMARY KEY,
    user_pubkey VARCHAR(44) UNIQUE NOT NULL,
    
    -- Participation Stats
    total_predictions INTEGER NOT NULL DEFAULT 0,
    total_wins INTEGER NOT NULL DEFAULT 0,
    total_losses INTEGER NOT NULL DEFAULT 0,
    
    -- Financial Stats
    total_wagered BIGINT NOT NULL DEFAULT 0,
    total_won BIGINT NOT NULL DEFAULT 0,
    net_profit BIGINT NOT NULL DEFAULT 0,
    
    -- Streaks
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    
    -- Rankings
    rank INTEGER,
    reputation_score INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tournaments Table
CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    tournament_pubkey VARCHAR(44) UNIQUE NOT NULL,
    tournament_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Timing
    start_time BIGINT NOT NULL,
    end_time BIGINT NOT NULL,
    
    -- Prize Pool
    prize_pool BIGINT NOT NULL DEFAULT 0,
    entry_fee BIGINT NOT NULL DEFAULT 0,
    
    -- Participants
    max_participants INTEGER,
    current_participants INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_tournament_status CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled'))
);

-- Tournament Participants Table
CREATE TABLE IF NOT EXISTS tournament_participants (
    id SERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(tournament_id),
    user_pubkey VARCHAR(44) NOT NULL,
    
    -- Performance
    score INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    predictions_made INTEGER NOT NULL DEFAULT 0,
    predictions_won INTEGER NOT NULL DEFAULT 0,
    
    -- Prizes
    prize_amount BIGINT DEFAULT 0,
    is_prize_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(tournament_id, user_pubkey)
);

-- Events Log Table (for audit trail)
CREATE TABLE IF NOT EXISTS events_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    round_id BIGINT,
    user_pubkey VARCHAR(44),
    data JSONB,
    signature VARCHAR(88),
    slot BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);
CREATE INDEX IF NOT EXISTS idx_rounds_round_id ON rounds(round_id);
CREATE INDEX IF NOT EXISTS idx_predictions_round_id ON predictions(round_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_pubkey);
CREATE INDEX IF NOT EXISTS idx_user_stats_pubkey ON user_stats(user_pubkey);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_events_log_type ON events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_events_log_round ON events_log(round_id);
CREATE INDEX IF NOT EXISTS idx_events_log_created ON events_log(created_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_global_state_updated_at BEFORE UPDATE ON global_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON rounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
