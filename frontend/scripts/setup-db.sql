-- =======================================================
-- SQLite Optimization Settings (WAL + I/O Tuning)
-- =======================================================
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 30000000000;
PRAGMA cache_size = -2000;
PRAGMA foreign_keys = ON;
PRAGMA optimize;

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_requested_by ON projects(requestedById);
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON proposals(projectId);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_progress_project_id ON progress(projectId);
CREATE INDEX IF NOT EXISTS idx_progress_reported_at ON progress(reportedAt);
CREATE INDEX IF NOT EXISTS idx_attachments_project_id ON attachments(projectId);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipientId);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sentAt);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(projectId);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

-- Enable query optimizer statistics
PRAGMA optimize;

-- Vacuum and analyze database
VACUUM;
ANALYZE;
