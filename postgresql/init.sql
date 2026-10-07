CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application VARCHAR(100) NOT NULL,
    version VARCHAR(100) NOT NULL,
    environment VARCHAR(100) NOT NULL,
    status VARCHAR(100) NOT NULL,
    responsible VARCHAR(100) NOT NULL,
    commit_hash VARCHAR(100),
    commit_message TEXT,
    failure_reason TEXT,
    rollback BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);