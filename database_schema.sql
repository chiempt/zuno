-- CHATWOOT DATABASE SCHEMA
-- Generated from schema.rb
-- PostgreSQL Database Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==============================================
-- CORE SYSTEM TABLES
-- ==============================================

-- Accounts table
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    locale INTEGER DEFAULT 0,
    domain VARCHAR(100),
    support_email VARCHAR(100),
    feature_flags BIGINT DEFAULT 0 NOT NULL,
    auto_resolve_duration INTEGER,
    limits JSONB DEFAULT '{}',
    custom_attributes JSONB DEFAULT '{}',
    status INTEGER DEFAULT 0,
    internal_attributes JSONB DEFAULT '{}' NOT NULL,
    settings JSONB DEFAULT '{}'
);

CREATE INDEX index_accounts_on_status ON accounts(status);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    provider VARCHAR DEFAULT 'email' NOT NULL,
    uid VARCHAR DEFAULT '' NOT NULL,
    encrypted_password VARCHAR DEFAULT '' NOT NULL,
    reset_password_token VARCHAR,
    reset_password_sent_at TIMESTAMP,
    remember_created_at TIMESTAMP,
    sign_in_count INTEGER DEFAULT 0 NOT NULL,
    current_sign_in_at TIMESTAMP,
    last_sign_in_at TIMESTAMP,
    current_sign_in_ip VARCHAR,
    last_sign_in_ip VARCHAR,
    confirmation_token VARCHAR,
    confirmed_at TIMESTAMP,
    confirmation_sent_at TIMESTAMP,
    unconfirmed_email VARCHAR,
    name VARCHAR NOT NULL,
    display_name VARCHAR,
    email VARCHAR,
    tokens JSON,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    pubsub_token VARCHAR,
    availability INTEGER DEFAULT 0,
    ui_settings JSONB DEFAULT '{}',
    custom_attributes JSONB DEFAULT '{}',
    type VARCHAR,
    message_signature TEXT
);

CREATE INDEX index_users_on_email ON users(email);
CREATE INDEX index_users_on_pubsub_token ON users(pubsub_token) UNIQUE;
CREATE INDEX index_users_on_reset_password_token ON users(reset_password_token) UNIQUE;
CREATE INDEX index_users_on_uid_and_provider ON users(uid, provider) UNIQUE;

-- Account Users (many-to-many relationship)
CREATE TABLE account_users (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT,
    user_id BIGINT,
    role INTEGER DEFAULT 0,
    inviter_id BIGINT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    active_at TIMESTAMP,
    availability INTEGER DEFAULT 0 NOT NULL,
    auto_offline BOOLEAN DEFAULT true NOT NULL,
    custom_role_id BIGINT,
    agent_capacity_policy_id BIGINT
);

CREATE UNIQUE INDEX uniq_user_id_per_account_id ON account_users(account_id, user_id);
CREATE INDEX index_account_users_on_account_id ON account_users(account_id);
CREATE INDEX index_account_users_on_agent_capacity_policy_id ON account_users(agent_capacity_policy_id);
CREATE INDEX index_account_users_on_custom_role_id ON account_users(custom_role_id);
CREATE INDEX index_account_users_on_user_id ON account_users(user_id);

-- ==============================================
-- CONVERSATION MANAGEMENT
-- ==============================================

-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    inbox_id INTEGER NOT NULL,
    status INTEGER DEFAULT 0 NOT NULL,
    assignee_id INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    contact_id BIGINT,
    display_id INTEGER NOT NULL,
    contact_last_seen_at TIMESTAMP,
    agent_last_seen_at TIMESTAMP,
    additional_attributes JSONB DEFAULT '{}',
    contact_inbox_id BIGINT,
    uuid UUID DEFAULT gen_random_uuid() NOT NULL,
    identifier VARCHAR,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    team_id BIGINT,
    campaign_id BIGINT,
    snoozed_until TIMESTAMP,
    custom_attributes JSONB DEFAULT '{}',
    assignee_last_seen_at TIMESTAMP,
    first_reply_created_at TIMESTAMP,
    priority INTEGER,
    sla_policy_id BIGINT,
    waiting_since TIMESTAMP,
    cached_label_list TEXT
);

CREATE UNIQUE INDEX index_conversations_on_account_id_and_display_id ON conversations(account_id, display_id);
CREATE INDEX index_conversations_on_id_and_account_id ON conversations(account_id, id);
CREATE INDEX conv_acid_inbid_stat_asgnid_idx ON conversations(account_id, inbox_id, status, assignee_id);
CREATE INDEX index_conversations_on_account_id ON conversations(account_id);
CREATE INDEX index_conversations_on_assignee_id_and_account_id ON conversations(assignee_id, account_id);
CREATE INDEX index_conversations_on_campaign_id ON conversations(campaign_id);
CREATE INDEX index_conversations_on_contact_id ON conversations(contact_id);
CREATE INDEX index_conversations_on_contact_inbox_id ON conversations(contact_inbox_id);
CREATE INDEX index_conversations_on_first_reply_created_at ON conversations(first_reply_created_at);
CREATE INDEX index_conversations_on_inbox_id ON conversations(inbox_id);
CREATE INDEX index_conversations_on_priority ON conversations(priority);
CREATE INDEX index_conversations_on_status_and_account_id ON conversations(status, account_id);
CREATE INDEX index_conversations_on_status_and_priority ON conversations(status, priority);
CREATE INDEX index_conversations_on_team_id ON conversations(team_id);
CREATE INDEX index_conversations_on_uuid ON conversations(uuid) UNIQUE;
CREATE INDEX index_conversations_on_waiting_since ON conversations(waiting_since);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    content TEXT,
    account_id INTEGER NOT NULL,
    inbox_id INTEGER NOT NULL,
    conversation_id INTEGER NOT NULL,
    message_type INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    private BOOLEAN DEFAULT false NOT NULL,
    status INTEGER DEFAULT 0,
    source_id VARCHAR,
    content_type INTEGER DEFAULT 0 NOT NULL,
    content_attributes JSON DEFAULT '{}',
    sender_type VARCHAR,
    sender_id BIGINT,
    external_source_ids JSONB DEFAULT '{}',
    additional_attributes JSONB DEFAULT '{}',
    processed_message_content TEXT,
    sentiment JSONB DEFAULT '{}'
);

CREATE INDEX idx_messages_account_content_created ON messages(account_id, content_type, created_at);
CREATE INDEX index_messages_on_account_created_type ON messages(account_id, created_at, message_type);
CREATE INDEX index_messages_on_account_id_and_inbox_id ON messages(account_id, inbox_id);
CREATE INDEX index_messages_on_account_id ON messages(account_id);
CREATE INDEX index_messages_on_content ON messages USING gin(content gin_trgm_ops);
CREATE INDEX index_messages_on_conversation_account_type_created ON messages(conversation_id, account_id, message_type, created_at);
CREATE INDEX index_messages_on_conversation_id ON messages(conversation_id);
CREATE INDEX index_messages_on_created_at ON messages(created_at);
CREATE INDEX index_messages_on_inbox_id ON messages(inbox_id);
CREATE INDEX index_messages_on_sender_type_and_sender_id ON messages(sender_type, sender_id);
CREATE INDEX index_messages_on_source_id ON messages(source_id);

-- Contacts table
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR DEFAULT '',
    email VARCHAR,
    phone_number VARCHAR,
    account_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    additional_attributes JSONB DEFAULT '{}',
    identifier VARCHAR,
    custom_attributes JSONB DEFAULT '{}',
    last_activity_at TIMESTAMP,
    contact_type INTEGER DEFAULT 0,
    middle_name VARCHAR DEFAULT '',
    last_name VARCHAR DEFAULT '',
    location VARCHAR DEFAULT '',
    country_code VARCHAR DEFAULT '',
    blocked BOOLEAN DEFAULT false NOT NULL
);

CREATE INDEX index_contacts_on_lower_email_account_id ON contacts(lower(email), account_id);
CREATE INDEX index_contacts_on_account_id_and_contact_type ON contacts(account_id, contact_type);
CREATE INDEX index_contacts_on_nonempty_fields ON contacts(account_id, email, phone_number, identifier) WHERE ((email <> '') OR (phone_number <> '') OR (identifier <> ''));
CREATE INDEX index_contacts_on_account_id_and_last_activity_at ON contacts(account_id, last_activity_at DESC NULLS LAST);
CREATE INDEX index_contacts_on_account_id ON contacts(account_id);
CREATE INDEX index_resolved_contact_account_id ON contacts(account_id) WHERE ((email <> '') OR (phone_number <> '') OR (identifier <> ''));
CREATE INDEX index_contacts_on_blocked ON contacts(blocked);
CREATE UNIQUE INDEX uniq_email_per_account_contact ON contacts(email, account_id);
CREATE UNIQUE INDEX uniq_identifier_per_account_contact ON contacts(identifier, account_id);
CREATE INDEX index_contacts_on_name_email_phone_number_identifier ON contacts USING gin(name, email, phone_number, identifier gin_trgm_ops);
CREATE INDEX index_contacts_on_phone_number_and_account_id ON contacts(phone_number, account_id);

-- ==============================================
-- CHANNEL INTEGRATIONS
-- ==============================================

-- Inboxes table
CREATE TABLE inboxes (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    channel_type VARCHAR,
    enable_auto_assignment BOOLEAN DEFAULT true,
    greeting_enabled BOOLEAN DEFAULT false,
    greeting_message VARCHAR,
    email_address VARCHAR,
    working_hours_enabled BOOLEAN DEFAULT false,
    out_of_office_message VARCHAR,
    timezone VARCHAR DEFAULT 'UTC',
    enable_email_collect BOOLEAN DEFAULT true,
    csat_survey_enabled BOOLEAN DEFAULT false,
    allow_messages_after_resolved BOOLEAN DEFAULT true,
    auto_assignment_config JSONB DEFAULT '{}',
    lock_to_single_conversation BOOLEAN DEFAULT false NOT NULL,
    portal_id BIGINT,
    sender_name_type INTEGER DEFAULT 0 NOT NULL,
    business_name VARCHAR,
    csat_config JSONB DEFAULT '{}' NOT NULL
);

CREATE INDEX index_inboxes_on_account_id ON inboxes(account_id);
CREATE INDEX index_inboxes_on_channel_id_and_channel_type ON inboxes(channel_id, channel_type);
CREATE INDEX index_inboxes_on_portal_id ON inboxes(portal_id);

-- Contact Inboxes (junction table)
CREATE TABLE contact_inboxes (
    id BIGSERIAL PRIMARY KEY,
    contact_id BIGINT,
    inbox_id BIGINT,
    source_id VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    hmac_verified BOOLEAN DEFAULT false,
    pubsub_token VARCHAR
);

CREATE INDEX index_contact_inboxes_on_contact_id ON contact_inboxes(contact_id);
CREATE UNIQUE INDEX index_contact_inboxes_on_inbox_id_and_source_id ON contact_inboxes(inbox_id, source_id);
CREATE INDEX index_contact_inboxes_on_inbox_id ON contact_inboxes(inbox_id);
CREATE INDEX index_contact_inboxes_on_pubsub_token ON contact_inboxes(pubsub_token) UNIQUE;
CREATE INDEX index_contact_inboxes_on_source_id ON contact_inboxes(source_id);

-- ==============================================
-- AI & AUTOMATION
-- ==============================================

-- Captain Assistants (AI)
CREATE TABLE captain_assistants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    account_id BIGINT NOT NULL,
    description VARCHAR,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    config JSONB DEFAULT '{}' NOT NULL,
    response_guidelines JSONB DEFAULT '[]',
    guardrails JSONB DEFAULT '[]'
);

CREATE INDEX index_captain_assistants_on_account_id ON captain_assistants(account_id);

-- Captain Assistant Responses
CREATE TABLE captain_assistant_responses (
    id BIGSERIAL PRIMARY KEY,
    question VARCHAR NOT NULL,
    answer TEXT NOT NULL,
    embedding VECTOR(1536),
    assistant_id BIGINT NOT NULL,
    documentable_id BIGINT,
    account_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    status INTEGER DEFAULT 1 NOT NULL,
    documentable_type VARCHAR
);

CREATE INDEX index_captain_assistant_responses_on_account_id ON captain_assistant_responses(account_id);
CREATE INDEX index_captain_assistant_responses_on_assistant_id ON captain_assistant_responses(assistant_id);
CREATE INDEX idx_cap_asst_resp_on_documentable ON captain_assistant_responses(documentable_id, documentable_type);
CREATE INDEX vector_idx_knowledge_entries_embedding ON captain_assistant_responses USING ivfflat(embedding);
CREATE INDEX index_captain_assistant_responses_on_status ON captain_assistant_responses(status);

-- ==============================================
-- KNOWLEDGE BASE
-- ==============================================

-- Portals (Help Center)
CREATE TABLE portals (
    id BIGSERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    slug VARCHAR NOT NULL,
    custom_domain VARCHAR,
    color VARCHAR,
    homepage_link VARCHAR,
    page_title VARCHAR,
    header_text TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    config JSONB DEFAULT '{"allowed_locales": ["en"]}',
    archived BOOLEAN DEFAULT false,
    channel_web_widget_id BIGINT,
    ssl_settings JSONB DEFAULT '{}' NOT NULL
);

CREATE INDEX index_portals_on_channel_web_widget_id ON portals(channel_web_widget_id);
CREATE INDEX index_portals_on_custom_domain ON portals(custom_domain) UNIQUE;
CREATE INDEX index_portals_on_slug ON portals(slug) UNIQUE;

-- Articles
CREATE TABLE articles (
    id BIGSERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    portal_id INTEGER NOT NULL,
    category_id INTEGER,
    folder_id INTEGER,
    title VARCHAR,
    description TEXT,
    content TEXT,
    status INTEGER,
    views INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    author_id BIGINT,
    associated_article_id BIGINT,
    meta JSONB DEFAULT '{}',
    slug VARCHAR NOT NULL,
    position INTEGER,
    locale VARCHAR DEFAULT 'en' NOT NULL
);

CREATE INDEX index_articles_on_account_id ON articles(account_id);
CREATE INDEX index_articles_on_associated_article_id ON articles(associated_article_id);
CREATE INDEX index_articles_on_author_id ON articles(author_id);
CREATE INDEX index_articles_on_portal_id ON articles(portal_id);
CREATE INDEX index_articles_on_slug ON articles(slug) UNIQUE;
CREATE INDEX index_articles_on_status ON articles(status);
CREATE INDEX index_articles_on_views ON articles(views);

-- ==============================================
-- ORGANIZATION & TAGGING
-- ==============================================

-- Teams
CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    allow_auto_assign BOOLEAN DEFAULT true,
    account_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX index_teams_on_account_id ON teams(account_id);
CREATE UNIQUE INDEX index_teams_on_name_and_account_id ON teams(name, account_id);

-- Labels
CREATE TABLE labels (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR,
    description TEXT,
    color VARCHAR DEFAULT '#1f93ff' NOT NULL,
    show_on_sidebar BOOLEAN,
    account_id BIGINT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX index_labels_on_account_id ON labels(account_id);
CREATE UNIQUE INDEX index_labels_on_title_and_account_id ON labels(title, account_id);

-- ==============================================
-- NOTIFICATIONS & WEBHOOKS
-- ==============================================

-- Notifications
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    notification_type INTEGER NOT NULL,
    primary_actor_type VARCHAR NOT NULL,
    primary_actor_id BIGINT NOT NULL,
    secondary_actor_type VARCHAR,
    secondary_actor_id BIGINT,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    snoozed_until TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meta JSONB DEFAULT '{}'
);

CREATE INDEX index_notifications_on_account_id ON notifications(account_id);
CREATE INDEX index_notifications_on_last_activity_at ON notifications(last_activity_at);
CREATE INDEX uniq_primary_actor_per_account_notifications ON notifications(primary_actor_type, primary_actor_id);
CREATE INDEX uniq_secondary_actor_per_account_notifications ON notifications(secondary_actor_type, secondary_actor_id);
CREATE INDEX idx_notifications_performance ON notifications(user_id, account_id, snoozed_until, read_at);
CREATE INDEX index_notifications_on_user_id ON notifications(user_id);

-- Webhooks
CREATE TABLE webhooks (
    id BIGSERIAL PRIMARY KEY,
    account_id INTEGER,
    inbox_id INTEGER,
    url VARCHAR,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    webhook_type INTEGER DEFAULT 0,
    subscriptions JSONB DEFAULT '["conversation_status_changed", "conversation_updated", "conversation_created", "contact_created", "contact_updated", "message_created", "message_updated", "webwidget_triggered"]'
);

CREATE UNIQUE INDEX index_webhooks_on_account_id_and_url ON webhooks(account_id, url);

-- ==============================================
-- SLA & WORKFLOW MANAGEMENT
-- ==============================================

-- SLA Policies
CREATE TABLE sla_policies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    first_response_time_threshold FLOAT,
    next_response_time_threshold FLOAT,
    only_during_business_hours BOOLEAN DEFAULT false,
    account_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    description VARCHAR,
    resolution_time_threshold FLOAT
);

CREATE INDEX index_sla_policies_on_account_id ON sla_policies(account_id);

-- Applied SLAs
CREATE TABLE applied_slas (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    sla_policy_id BIGINT NOT NULL,
    conversation_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    sla_status INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX index_applied_slas_on_account_sla_policy_conversation ON applied_slas(account_id, sla_policy_id, conversation_id);
CREATE INDEX index_applied_slas_on_account_id ON applied_slas(account_id);
CREATE INDEX index_applied_slas_on_conversation_id ON applied_slas(conversation_id);
CREATE INDEX index_applied_slas_on_sla_policy_id ON applied_slas(sla_policy_id);

-- ==============================================
-- FOREIGN KEY CONSTRAINTS
-- ==============================================

-- Add foreign key constraints
ALTER TABLE account_users ADD CONSTRAINT fk_account_users_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE account_users ADD CONSTRAINT fk_account_users_user_id FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE conversations ADD CONSTRAINT fk_conversations_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE conversations ADD CONSTRAINT fk_conversations_inbox_id FOREIGN KEY (inbox_id) REFERENCES inboxes(id);
ALTER TABLE conversations ADD CONSTRAINT fk_conversations_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id);

ALTER TABLE messages ADD CONSTRAINT fk_messages_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE messages ADD CONSTRAINT fk_messages_inbox_id FOREIGN KEY (inbox_id) REFERENCES inboxes(id);
ALTER TABLE messages ADD CONSTRAINT fk_messages_conversation_id FOREIGN KEY (conversation_id) REFERENCES conversations(id);

ALTER TABLE contacts ADD CONSTRAINT fk_contacts_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE inboxes ADD CONSTRAINT fk_inboxes_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE inboxes ADD CONSTRAINT fk_inboxes_portal_id FOREIGN KEY (portal_id) REFERENCES portals(id);

ALTER TABLE contact_inboxes ADD CONSTRAINT fk_contact_inboxes_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id);
ALTER TABLE contact_inboxes ADD CONSTRAINT fk_contact_inboxes_inbox_id FOREIGN KEY (inbox_id) REFERENCES inboxes(id);

ALTER TABLE captain_assistants ADD CONSTRAINT fk_captain_assistants_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE captain_assistant_responses ADD CONSTRAINT fk_captain_assistant_responses_assistant_id FOREIGN KEY (assistant_id) REFERENCES captain_assistants(id);
ALTER TABLE captain_assistant_responses ADD CONSTRAINT fk_captain_assistant_responses_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE portals ADD CONSTRAINT fk_portals_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE articles ADD CONSTRAINT fk_articles_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE articles ADD CONSTRAINT fk_articles_portal_id FOREIGN KEY (portal_id) REFERENCES portals(id);

ALTER TABLE teams ADD CONSTRAINT fk_teams_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE labels ADD CONSTRAINT fk_labels_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE notifications ADD CONSTRAINT fk_notifications_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE webhooks ADD CONSTRAINT fk_webhooks_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE webhooks ADD CONSTRAINT fk_webhooks_inbox_id FOREIGN KEY (inbox_id) REFERENCES inboxes(id);

ALTER TABLE sla_policies ADD CONSTRAINT fk_sla_policies_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE applied_slas ADD CONSTRAINT fk_applied_slas_account_id FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE applied_slas ADD CONSTRAINT fk_applied_slas_sla_policy_id FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id);
ALTER TABLE applied_slas ADD CONSTRAINT fk_applied_slas_conversation_id FOREIGN KEY (conversation_id) REFERENCES conversations(id);

-- ==============================================
-- TRIGGERS AND FUNCTIONS
-- ==============================================

-- Create sequences for display IDs
CREATE OR REPLACE FUNCTION create_account_sequence()
RETURNS TRIGGER AS $$
BEGIN
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS conv_dpid_seq_%s', NEW.id);
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS camp_dpid_seq_%s', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for account creation
CREATE TRIGGER accounts_after_insert_row_tr
    AFTER INSERT ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION create_account_sequence();

-- Function to set conversation display_id
CREATE OR REPLACE FUNCTION set_conversation_display_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.display_id := nextval('conv_dpid_seq_' || NEW.account_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversation display_id
CREATE TRIGGER conversations_before_insert_row_tr
    BEFORE INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION set_conversation_display_id();

-- Function to set campaign display_id
CREATE OR REPLACE FUNCTION set_campaign_display_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.display_id := nextval('camp_dpid_seq_' || NEW.account_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for campaign display_id
CREATE TRIGGER campaigns_before_insert_row_tr
    BEFORE INSERT ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION set_campaign_display_id();
