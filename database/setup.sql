-- Proposal System Database Setup
-- Complete database schema for template proposal management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS proposal_system;

-- Connect to the database
\c proposal_system;

-- Create enum types
CREATE TYPE template_status AS ENUM ('draft', 'active', 'deprecated', 'archived');
CREATE TYPE template_visibility AS ENUM ('private', 'team', 'organization', 'public');
CREATE TYPE proposal_status AS ENUM ('draft', 'under_review', 'approved', 'rejected', 'published', 'completed', 'cancelled');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'sales', 'viewer', 'guest');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'system');

-- Create functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create tables
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(201) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    role user_role NOT NULL DEFAULT 'viewer',
    department VARCHAR(100),
    position VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    status template_status NOT NULL DEFAULT 'draft',
    visibility template_visibility NOT NULL DEFAULT 'private',
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    content JSONB NOT NULL,
    validation JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    approvals JSONB DEFAULT '{}',
    analytics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Template versions table
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    changes JSONB DEFAULT '[]',
    changelog TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Template shares table
CREATE TABLE template_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES users(id),
    shared_with UUID REFERENCES users(id),
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('view', 'edit', 'comment', 'download')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Template exports table
CREATE TABLE template_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL,
    options JSONB DEFAULT '{}',
    file_url TEXT,
    file_size BIGINT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Template analytics table
CREATE TABLE template_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Proposals table
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID REFERENCES templates(id),
    template_name VARCHAR(255),
    status proposal_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Proposal versions table
CREATE TABLE proposal_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    changes JSONB DEFAULT '[]',
    changelog TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    priority INTEGER DEFAULT 0,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail table
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_subcategory ON templates(subcategory);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_templates_visibility ON templates(visibility);
CREATE INDEX idx_templates_created_by ON templates(created_by);
CREATE INDEX idx_templates_created_at ON templates(created_at);
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);

CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_created_at ON template_versions(created_at);

CREATE INDEX idx_proposals_template_id ON proposals(template_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_by ON proposals(created_by);
CREATE INDEX idx_proposals_created_at ON proposals(created_at);
CREATE INDEX idx_proposals_approved_by ON proposals(approved_by);

CREATE INDEX idx_proposal_versions_proposal_id ON proposal_versions(proposal_id);
CREATE INDEX idx_proposal_versions_created_at ON proposal_versions(created_at);

CREATE INDEX idx_template_shares_template_id ON template_shares(template_id);
CREATE INDEX idx_template_shares_shared_by ON template_shares(shared_by);
CREATE INDEX idx_template_shares_shared_with ON template_shares(shared_with);

CREATE INDEX idx_template_analytics_template_id ON template_analytics(template_id);
CREATE INDEX idx_template_analytics_event_type ON template_analytics(event_type);
CREATE INDEX idx_template_analytics_user_id ON template_analytics(user_id);
CREATE INDEX idx_template_analytics_timestamp ON template_analytics(timestamp);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_action ON audit_trail(action);
CREATE INDEX idx_audit_trail_entity_type ON audit_trail(entity_type);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);

-- Create triggers
-- Updated at trigger for users
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Updated at trigger for templates
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Updated at trigger for proposals
CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
-- Insert sample users
INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, department, position, phone, is_active, is_verified) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@mdmedia.co.id', 'admin', '$2b$10$rZ8b2r8s9q2w3e4r5t6y7u8i9o0p1a2s3d4f5g6h7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4', 'Admin', 'User', 'admin', 'IT', 'System Administrator', '+62812345678', true, true),
('550e8400-e29b-41d4-a716-446655440001', 'sales@mdmedia.co.id', 'sales_manager', '$2b$10$rZ8b2r8s9q2w3e4r5t6y7u8i9o0p1a2s3d4f5g6h7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4', 'Sales', 'Manager', 'sales_manager', 'Sales', 'Sales Manager', '+62812345679', true, true),
('550e8400-e29b-41d4-a716-446655440002', 'account@mdmedia.co.id', 'account_manager', '$2b$10$rZ8b2r8s9q2w3e4r5t6y7u8i9o0p1a2s3d4f5g6h7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4', 'Account', 'Manager', 'account_manager', 'Sales', 'Account Manager', '+62812345680', true, true);

-- Insert sample templates
INSERT INTO templates (id, name, description, category, subcategory, status, visibility, created_by, updated_by, tags, content, validation, permissions, approvals, analytics) VALUES
('550e8400-e29b-41d4-a716-446655440100', 'SMS Campaign Template', 'Professional SMS campaign proposal template', 'messaging_services', 'sms_campaign', 'active', 'organization', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', ARRAY['sms', 'campaign', 'messaging'], '{"sections": [{"id": "account_info", "name": "Account Information", "title": "Account/Sales Information", "description": "Fill in your account and sales details", "order": 1, "required": true, "type": "fields", "fields": [{"id": "accountName", "name": "accountName", "label": "Account/Sales Name", "type": "text", "required": true, "order": 1, "validation": {"rules": [{"type": "required", "message": "Account name is required"}, {"type": "minLength", "value": 2, "message": "Account name must be at least 2 characters"}]}, "placeholder": "Enter your account name", "description": "Enter your company or account name"}]}], "variables": [], "styles": {"global": {"primary_color": "#3b82f6", "secondary_color": "#64748b", "background_color": "#ffffff", "text_color": "#1f2937", "font_family": "Inter, sans-serif", "font_size": "14px", "border_radius": "8px", "box_shadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1)", "spacing": "16px"}, "sections": {}, "fields": {}}, "layout": {"type": "single_column", "sections": [], "responsive": {"mobile": {"width": "100%", "columns": 1, "spacing": "16px", "alignment": "left"}, "tablet": {"width": "100%", "columns": 2, "spacing": "16px", "alignment": "left"}, "desktop": {"width": "100%", "columns": 3, "spacing": "16px", "alignment": "left"}}}, "custom_properties": {}}, "validation": {"rules": [], "dependencies": [], "required_fields": [], "optional_fields": [], "custom_validators": []}, "permissions": {"can_edit": ["550e8400-e29b-41d4-a716-446655440000"], "can_view": ["550e8400-e29b-41d4-a716-446655440000"], "can_delete": ["550e8400-e29b-41d4-a716-446655440000"], "can_publish": ["550e8400-e29b-41d4-a716-446655440000"], "can_archive": ["550e8400-e29b-41d4-a716-446655440000"]}, "approvals": {"created_by": "550e8400-e29b-41d4-a716-446655440000", "status": "approved", "comments": []}, "analytics": {"views": 156, "uses": 142, "downloads": 23, "shares": 12, "ratings": [{"id": "1", "user_id": "550e8400-e29b-41d4-a716-446655440001", "rating": 5, "comment": "Excellent template", "timestamp": "2024-01-15T10:30:00Z"}], "feedback": [{"id": "1", "user_id": "550e8400-e29b-41d4-a716-446655440001", "feedback": "Very useful template", "type": "improvement", "status": "resolved", "timestamp": "2024-01-15T10:30:00Z"}]}}', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '2024-01-15 10:00:00+07', '2024-01-15 10:00:00+07');

-- Insert WhatsApp Campaign template
INSERT INTO templates (id, name, description, category, subcategory, status, visibility, created_by, updated_by, tags, content, validation, permissions, approvals, analytics) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'WhatsApp Campaign Template', 'Professional WhatsApp campaign proposal template', 'messaging_services', 'whatsapp_campaign', 'active', 'organization', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', ARRAY['whatsapp', 'campaign', 'messaging'], '{"sections": [{"id": "account_info", "name": "Account Information", "title": "Account/Sales Information", "description": "Fill in your account and sales details", "order": 1, "required": true, "type": "fields", "fields": [{"id": "accountName", "name": "accountName", "label": "Account/Sales Name", "type": "text", "required": true, "order": 1, "validation": {"rules": [{"type": "required", "message": "Account name is required"}, {"type": "minLength", "value": 2, "message": "Account name must be at least 2 characters"}]}, "placeholder": "Enter your account name", "description": "Enter your company or account name"}]}], "variables": [], "styles": {"global": {"primary_color": "#3b82f6", "secondary_color": "#64748b", "background_color": "#ffffff", "text_color": "#1f2937", "font_family": "Inter, sans-serif", "font_size": "14px", "border_radius": "8px", "box_shadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1)", "spacing": "16px"}, "sections": {}, "fields": {}}, "layout": {"type": "single_column", "sections": [], "responsive": {"mobile": {"width": "100%", "columns": 1, "spacing": "16px", "alignment": "left"}, "tablet": {"width": "100%", "columns": 2, "spacing": "16px", "alignment": "left"}, "desktop": {"width": "100%", "columns": 3, "spacing": "16px", "alignment": "left"}}}, "custom_properties": {}}, "validation": {"rules": [], "dependencies": [], "required_fields": [], "optional_fields": [], "custom_validators": []}, "permissions": {"can_edit": ["550e8400-e29b-41d4-a716-446655440000"], "can_view": ["550e8400-e29b-41d4-a716-446655440000"], "can_delete": ["550e8400-e29b-41d4-a716-446655440000"], "can_publish": ["550e8400-e29b-41d4-a716-446655440000"], "can_archive": ["550e8400-e29b-41d4-a716-446655440000"]}, "approvals": {"created_by": "550e8400-e29b-41d4-a716-446655440000", "status": "approved", "comments": []}, "analytics": {"views": 189, "uses": 167, "downloads": 31, "shares": 18, "ratings": [{"id": "2", "user_id": "550e8400-e29b-41d4-a716-446655440001", "rating": 5, "comment": "Perfect for WhatsApp campaigns", "timestamp": "2024-01-15T11:00:00Z"}], "feedback": [{"id": "2", "user_id": "550e8400-e29b-41d4-a716-446655440001", "feedback": "Great template features", "type": "feature", "status": "resolved", "timestamp": "2024-01-15T11:00:00Z"}]}}', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '2024-01-15 11:00:00+07', '2024-01-15 11:00:00+07');

-- Insert Data Analytics template
INSERT INTO templates (id, name, description, category, subcategory, status, visibility, created_by, updated_by, tags, content, validation, permissions, approvals, analytics) VALUES
('550e8400-e29b-41d4-a716-446655440102', 'Data Analytics Template', 'Professional data analytics solution proposal', 'data_analytics', 'data_analytics', 'active', 'organization', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', ARRAY['analytics', 'data', 'insights'], '{"sections": [{"id": "account_info", "name": "Account Information", "title": "Account/Sales Information", "description": "Fill in your account and sales details", "order": 1, "required": true, "type": "fields", "fields": [{"id": "accountName", "name": "accountName", "label": "Account/Sales Name", "type": "text", "required": true, "order": 1, "validation": {"rules": [{"type": "required", "message": "Account name is required"}, {"type": "minLength", "value": 2, "message": "Account name must be at least 2 characters"}]}, "placeholder": "Enter your account name", "description": "Enter your company or account name"}]}], "variables": [], "styles": {"global": {"primary_color": "#3b82f6", "secondary_color": "#64748b", "background_color": "#ffffff", "text_color": "#1f2937", "font_family": "Inter, sans-serif", "font_size": "14px", "border_radius": "8px", "box_shadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1)", "spacing": "16px"}, "sections": {}, "fields": {}}, "layout": {"type": "single_column", "sections": [], "responsive": {"mobile": {"width": "100%", "columns": 1, "spacing": "16px", "alignment": "left"}, "tablet": {"width": "100%", "columns": 2, "spacing": "16px", "alignment": "left"}, "desktop": {"width": "100%", "columns": 3, "spacing": "16px", "alignment": "left"}}}, "custom_properties": {}}, "validation": {"rules": [], "dependencies": [], "required_fields": [], "optional_fields": [], "custom_validators": []}, "permissions": {"can_edit": ["550e8400-e29b-41d4-a716-446655440000"], "can_view": ["550e8400-e29b-41d4-a716-446655440000"], "can_delete": ["550e8400-e29b-41d4-a716-446655440000"], "can_publish": ["550e8400-e29b-41d4-a716-446655440000"], "can_archive": ["550e8400-e29b-41d4-a716-446655440000"]}, "approvals": {"created_by": "550e8400-e29b-41d4-a716-446655440000", "status": "approved", "comments": []}, "analytics": {"views": 234, "uses": 198, "downloads": 45, "shares": 28, "ratings": [{"id": "3", "user_id": "550e8400-e29b-41d4-a716-446655440001", "rating": 5, "comment": "Excellent analytics template", "timestamp": "2024-01-15T12:00:00Z"}], "feedback": [{"id": "3", "user_id": "550e8400-e29b-41d4-a716-446655440001", "feedback": "Great analytics features", "type": "feature", "status": "resolved", "timestamp": "2024-01-15T12:00:00Z"}]}}', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '2024-01-15 12:00:00+07', '2024-01-15 12:00:00+07');

-- Insert sample proposals
INSERT INTO proposals (id, name, description, template_id, template_name, status, created_by, updated_by, data, metadata) VALUES
('550e8400-e29b-41d4-a716-446655440200', 'Test SMS Campaign Proposal', 'Test proposal for SMS campaign', '550e8400-e29b-41d4-a716-446655440100', 'SMS Campaign Template', 'draft', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '{
  "accountName": "MDSMedia",
  "accountEmail": "sales@mdmedia.co.id",
  "approvalEmail": "gm@mdmedia.co.id",
  "clientPicName": "John Doe",
  "clientPhone": "+628123456789",
  "clientEmail": "john.doe@client.com",
  "projectName": "Q1 SMS Campaign",
  "resource": "own_channel",
  "segmentProject": "enterprise",
  "projectQuality": "hot_prospect",
  "internalBriefDate": "2024-01-15",
  "brainstormingDate": "2024-01-16",
  "estimatedTenderDate": "2024-01-20",
  "tenderType": "non_tender",
  "projectOverview": "Test SMS campaign for Q1",
  "clientBackground": "Test client background",
  "projectObjectives": "Test objectives",
  "scopeOfWork": "Test scope of work",
  "revenueRp": 1000000000,
  "marginRp": 200000000,
  "attachments": []
}', '{"usage_count": 0, "last_used": null, "success_rate": 0, "average_rating": 0, "total_ratings": 0, "completion_time": 0, "file_size": 0, "dependencies": [], "compatibility": []}', '2024-01-15 10:00:00+07', '2024-01-15 10:00:00+07');

-- Insert sample analytics
INSERT INTO template_analytics (template_id, event_type, user_id, properties) VALUES
('550e8400-e29b-41d4-a716-446655440100', 'template_viewed', '550e8400-e29b-41d4-a716-446655440001', '{"source": "template_selector", "ip": "127.0.0.1", "user_agent": "Mozilla/5.0"}'),
('550e8400-e29b-41d4-a716-446655440100', 'template_used', '550e8400-e29b-41d4-a716-446655440001', '{"form_data": {"accountName": "Test"}, "session_duration": 300}'),
('550e8400-e29b-41d4-a716-446655440101', 'template_viewed', '550e8400-e29b-41d4-a716-446655440001', '{"source": "template_selector", "ip": "127.0.0.1", "user_agent": "Mozilla/5.0"}'),
('550e8400-e29b-41d4-a716-446655440101', 'template_used', '550e8400-e29b-41d4-a716-446655440001', '{"form_data": {"accountName": "Test"}, "session_duration": 450}');

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type, priority, metadata) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Welcome to Template System', 'Welcome to the Template Proposal System!', 'system', 0, '{"source": "system", "category": "welcome"}'),
('550e8400-e29b-41d4-a716-446655440001', 'Template Created', 'Your template has been created successfully', 'success', 1, '{"template_id": "550e8400-e29b-41d4-a716-446655440100", "template_name": "Test Template"}'),
('550e8400-e29b-41d4-a716-446655440001', 'Proposal Submitted', 'Your proposal has been submitted for review', 'info', 2, '{"proposal_id": "550e8400-e29b-41d4-a716-446655440200", "proposal_name": "Test Proposal"}');

-- Create sample audit trail entries
INSERT INTO audit_trail (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'CREATE', 'user', '550e8400-e29b-41d4-a716-446655440000', '{"email": "admin@mdmedia.co.id", "username": "admin", "role": "admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('550e8400-e29b-41d4-a716-446655440000', 'CREATE', 'template', '550e8400-e29b-41d4-a716-446655440100', '{"name": "SMS Campaign Template", "category": "messaging_services"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('550e8400-e29b-41d4-a716-446655440001', 'CREATE', 'proposal', '550e8400-e29b-41d4-a716-446655440200', '{"name": "Test SMS Campaign Proposal", "template_id": "550e8400-e29b-41d4-a716-446655440100"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;

-- Create functions for template management
CREATE OR REPLACE FUNCTION get_template_analytics(template_uuid UUID)
RETURNS TABLE (
    total_views BIGINT,
    total_uses BIGINT,
    total_downloads BIGINT,
    total_shares BIGINT,
    average_rating DECIMAL(3,2),
    total_ratings BIGINT,
    success_rate DECIMAL(5,2),
    completion_time DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((SELECT COUNT(*) FROM template_analytics WHERE template_id = template_uuid AND event_type = 'template_viewed'), 0) as total_views,
        COALESCE((SELECT COUNT(*) FROM template_analytics WHERE template_id = template_uuid AND event_type = 'template_used'), 0) as total_uses,
        COALESCE((SELECT COUNT(*) FROM template_analytics WHERE template_id = template_uuid AND event_type = 'template_downloaded'), 0) as total_downloads,
        COALESCE((SELECT COUNT(*) FROM template_analytics WHERE template_id = template_uuid AND event_type = 'template_shared'), 0) as total_shares,
        COALESCE((SELECT AVG(CAST(properties->>'rating' AS DECIMAL)) FROM template_analytics WHERE template_id = template_uuid AND properties->>'rating' IS NOT NULL), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM template_analytics WHERE template_id = template_uuid AND properties->>'rating' IS NOT NULL), 0) as total_ratings,
        COALESCE((SELECT COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM template_analytics WHERE template_id = template_uuid AND event_type = 'template_used'), 0) * 100 WHERE template_id = template_uuid AND (properties->>'success' = true OR properties->>'completed' = true)), 0) as success_rate,
        COALESCE((SELECT AVG(CAST(properties->>'session_duration' AS DECIMAL)) FROM template_analytics WHERE template_id = template_uuid AND properties->>'session_duration' IS NOT NULL), 0) as completion_time
    FROM template_analytics
    WHERE template_id = template_uuid
    GROUP BY template_id;
END;
$$ LANGUAGE plpgsql;

-- Create function for proposal statistics
CREATE OR REPLACE FUNCTION get_proposal_statistics()
RETURNS TABLE (
    total_proposals BIGINT,
    draft_proposals BIGINT,
    active_proposals BIGINT,
    completed_proposals BIGINT,
    cancelled_proposals BIGINT,
    avg_completion_time DECIMAL(10,2),
    success_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_proposals,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_proposals,
        COUNT(*) FILTER (WHERE status = 'active') as active_proposals,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_proposals,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_proposals,
        COALESCE(AVG(EXTRACT(EPOCH FROM (published_at - created_at)) / 86400), 0) as avg_completion_time,
        COALESCE((SELECT COUNT(*)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0) * 100 FROM proposals), 0) as success_rate
    FROM proposals;
END;
$$ LANGUAGE plpgsql;

-- Create function for user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS TABLE (
    total_proposals BIGINT,
    draft_proposals BIGINT,
    active_proposals BIGINT,
    completed_proposals BIGINT,
    total_templates BIGINT,
    total_analytics BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((SELECT COUNT(*) FROM proposals WHERE created_by = user_uuid), 0) as total_proposals,
        COALESCE((SELECT COUNT(*) FROM proposals WHERE created_by = user_uuid AND status = 'draft'), 0) as draft_proposals,
        COALESCE((SELECT COUNT(*) FROM proposals WHERE created_by = user_uuid AND status = 'active'), 0) as active_proposals,
        COALESCE((SELECT COUNT(*) FROM proposals WHERE created_by = user_uuid AND status = 'completed'), 0) as completed_proposals,
        COALESCE((SELECT COUNT(*) FROM templates WHERE created_by = user_uuid), 0) as total_templates,
        COALESCE((SELECT COUNT(*) FROM template_analytics WHERE user_id = user_uuid), 0) as total_analytics
    FROM users
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create view for template analytics summary
CREATE OR REPLACE VIEW template_analytics_summary AS
SELECT
    t.id as template_id,
    t.name as template_name,
    t.category,
    t.subcategory,
    t.status,
    ta.total_views,
    ta.total_uses,
    ta.total_downloads,
    ta.total_shares,
    ta.average_rating,
    ta.total_ratings,
    ta.success_rate,
    ta.completion_time,
    t.created_at,
    t.updated_at
FROM templates t
LEFT JOIN LATERAL (
    SELECT get_template_analytics(t.id) as ta
) ta ON t.id = ta.template_id;

-- Create view for proposal statistics
CREATE OR REPLACE VIEW proposal_statistics AS
SELECT * FROM get_proposal_statistics();

-- Create view for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT
    u.id as user_id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.role,
    us.total_proposals,
    us.draft_proposals,
    us.active_proposals,
    us.completed_proposals,
    us.total_templates,
    us.total_analytics
FROM users u
LEFT JOIN LATERAL (
    SELECT get_user_statistics(u.id) as us
) us ON u.id = us.user_id;

-- Create view for system statistics
CREATE OR REPLACE VIEW system_statistics AS
SELECT
    'users' as metric_type,
    (SELECT COUNT(*) FROM users) as total_count,
    (SELECT COUNT(*) FROM users WHERE is_active = true) as active_count,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
    (SELECT COUNT(*) FROM users WHERE role = 'sales_manager') as sales_manager_count,
    (SELECT COUNT(*) FROM users WHERE role = 'account_manager') as account_manager_count
FROM users UNION ALL
SELECT
    'templates' as metric_type,
    (SELECT COUNT(*) FROM templates) as total_count,
    (SELECT COUNT(*) FROM templates WHERE status = 'active') as active_count,
    (SELECT COUNT(*) FROM templates WHERE status = 'draft') as draft_count,
    (SELECT COUNT(*) FROM templates WHERE status = 'archived') as archived_count
FROM templates UNION ALL
SELECT
    'proposals' as metric_type,
    (SELECT COUNT(*) FROM proposals) as total_count,
    (SELECT COUNT(*) FROM proposals WHERE status = 'draft') as draft_count,
    (SELECT COUNT(*) FROM proposals WHERE status = 'active') as active_count,
    (SELECT COUNT(*) FROM proposals WHERE status = 'completed') as completed_count,
    (SELECT COUNT(*) FROM proposals WHERE status = 'cancelled') as cancelled_count
FROM proposals UNION ALL
SELECT
    'analytics' as metric_type,
    (SELECT COUNT(*) FROM template_analytics) as total_count,
    (SELECT COUNT(*) FROM template_analytics WHERE event_type = 'template_viewed') as views_count,
    (SELECT COUNT(*) FROM template_analytics WHERE event_type = 'template_used') as uses_count,
    (SELECT COUNT(*) FROM template_analytics WHERE event_type = 'template_downloaded') as downloads_count,
    (SELECT COUNT(*) FROM template_analytics WHERE event_type = 'template_shared') as shares_count
FROM template_analytics;

-- Create view for recent activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT
    at.timestamp,
    at.action,
    at.entity_type,
    at.entity_id,
    at.new_values,
    u.username,
    u.full_name,
    u.role
FROM audit_trail at
JOIN users u ON at.user_id = u.id
ORDER BY at.timestamp DESC
LIMIT 50;

-- Success message
SELECT 'Database setup completed successfully!' as status,
'🎉 Proposal System Database Ready for Demo' as message,
'-' as separator,
'📋 Created Tables: users, templates, proposals, analytics, notifications, audit_trail' as tables_created,
'📊 Created Views: template_analytics_summary, proposal_statistics, user_statistics, system_statistics, recent_activity' as views_created,
'🔧 Created Functions: get_template_analytics, get_proposal_statistics, get_user_statistics' as functions_created,
'📊 Sample Data: 3 users, 3 templates, 1 proposal, analytics, notifications, audit trail' as sample_data,
'💾 Grants Applied: All privileges to postgres' as permissions_granted,
'✅ Database Ready: PostgreSQL database ready for application' as database_status,
'🚀 Ready for Demo: Database is now ready for the application demo' as demo_status;
```

### **📋 Langkah 2: Inisialisasi Backend API**

### **Buat API Configuration**</think>
