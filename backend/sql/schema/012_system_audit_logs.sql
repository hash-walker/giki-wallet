-- +goose Up
CREATE TABLE giki_wallet.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,                     
    action VARCHAR(50) NOT NULL,       
    target_id UUID,                    
    details JSONB DEFAULT '{}',        
    ip_address VARCHAR(45) NOT NULL,   
    user_agent TEXT,                   
    status VARCHAR(20) NOT NULL,       
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_created_at ON giki_wallet.system_audit_logs(created_at);
CREATE INDEX idx_audit_actor_id ON giki_wallet.system_audit_logs(actor_id);
CREATE INDEX idx_audit_action ON giki_wallet.system_audit_logs(action);

-- +goose Down
DROP TABLE IF EXISTS giki_wallet.system_audit_logs;
