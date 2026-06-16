-- Audit log table
-- Records who accessed or changed sensitive clinical data.

CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(user_id) ON DELETE SET NULL,
  role        VARCHAR(50),
  action      VARCHAR(20) NOT NULL,   -- READ | CREATE | UPDATE | DELETE
  resource    VARCHAR(100) NOT NULL,
  resource_id INT,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource   ON audit_log(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
