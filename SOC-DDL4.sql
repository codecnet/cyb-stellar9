-- =========================================
-- SUBSCRIPTION PLAN MANAGEMENT
-- =========================================
-- Defines available subscription tiers and their limitations
CREATE TABLE subscription_plan (
    plan_id BIGSERIAL PRIMARY KEY,
    plan_name CITEXT NOT NULL UNIQUE CHECK (LENGTH(plan_name) >= 3),
    plan_description TEXT,
    plan_code VARCHAR(20) NOT NULL UNIQUE, -- Short code for API/billing integration
    
    -- Resource Limits
    max_users INTEGER NOT NULL CHECK (max_users > 0),
    max_assets INTEGER NOT NULL CHECK (max_assets > 0),
    
    -- Features (JSONB for flexibility)
    features JSONB DEFAULT '{}' NOT NULL,
    
    -- Plan Management
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    display_order INTEGER DEFAULT 1,
    trial_days INTEGER DEFAULT 0 CHECK (trial_days >= 0),
    
    -- Metadata
    other_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    updated_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Ensure only one default plan
    CONSTRAINT only_one_default_plan EXCLUDE (is_default WITH =) WHERE (is_default = TRUE)
);


-- =========================================
-- ORGANISATION / CLIENT
-- =========================================
-- Client organizations with enhanced subscription management
CREATE TABLE organisation (
    organisation_id BIGSERIAL PRIMARY KEY,
    
    -- Basic Information
    client_name CITEXT NOT NULL CHECK (LENGTH(client_name) >= 3),
    organisation_name CITEXT NOT NULL CHECK (LENGTH(organisation_name) >= 3),
    industry VARCHAR(100) NOT NULL,
    organisation_type VARCHAR(100) DEFAULT 'Client' NOT NULL CHECK (organisation_type IN ('Client', 'SAAS', 'Internal')),
    
    -- Subscription Management
    subscription_plan_id BIGINT NOT NULL REFERENCES subscription_plan(plan_id),
    subscription_start_date TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    subscription_end_date TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL, -- NULL for active subscriptions
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'expired')),
    
    -- Usage Tracking (updated by triggers)
    current_user_count INTEGER DEFAULT 0 CHECK (current_user_count >= 0),
    current_asset_count INTEGER DEFAULT 0 CHECK (current_asset_count >= 0),
    
    -- Overage Tracking for Assets (allow exceeding limits)
    assets_over_limit INTEGER DEFAULT 0 CHECK (assets_over_limit >= 0),
    overage_start_date TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    overage_notifications_sent INTEGER DEFAULT 0 CHECK (overage_notifications_sent >= 0),
    last_overage_notification TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    
    -- Wazuh Integration Settings
    wazuh_manager_ip INET,
    wazuh_manager_port INTEGER CHECK (wazuh_manager_port > 0 AND wazuh_manager_port <= 65535),
    wazuh_indexer_ip INET,
    wazuh_indexer_port INTEGER CHECK (wazuh_indexer_port > 0 AND wazuh_indexer_port <= 65535),
    wazuh_dashboard_ip INET,
    wazuh_dashboard_port INTEGER CHECK (wazuh_dashboard_port > 0 AND wazuh_dashboard_port <= 65535),
    
    -- Legacy field (kept for backward compatibility)
    initial_assets INTEGER DEFAULT 0 CHECK (initial_assets >= 0),
    
    -- Contact Information
    emails TEXT[] CHECK (
        array_length(emails, 1) > 0
        AND (
            emails IS NULL
            OR (
                SELECT bool_and(e ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
                FROM unnest(emails) AS e
            )
        )
    ),
    phone_numbers TEXT[] CHECK (
        array_length(phone_numbers, 1) > 0
        AND (
            SELECT bool_and(p ~ '^\+?[1-9]\d{1,14}$')
            FROM unnest(phone_numbers) AS p
        )
    ),
    
    -- Organization Settings
    timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
    locale VARCHAR(10) DEFAULT 'en-IN' NOT NULL,
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD' NOT NULL,
    
    -- Status and Security
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL, -- Soft delete flag
    deleted_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    deleted_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Metadata
    other_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    updated_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT organisation_client_name_unique UNIQUE(client_name),
    CONSTRAINT check_subscription_dates CHECK (
        subscription_end_date IS NULL OR subscription_end_date > subscription_start_date
    ),
    CONSTRAINT check_trial_dates CHECK (
        trial_end_date IS NULL OR trial_end_date >= subscription_start_date
    ),
    CONSTRAINT check_soft_delete CHECK (
        (is_deleted = FALSE AND deleted_at IS NULL AND deleted_by IS NULL) OR
        (is_deleted = TRUE AND deleted_at IS NOT NULL)
    )
);

-- =========================================
-- ROLE MANAGEMENT
-- =========================================
-- Enhanced RBAC with proper hierarchy and permissions
CREATE TABLE role (
    role_id BIGSERIAL PRIMARY KEY,
    role_name CITEXT NOT NULL CHECK (LENGTH(role_name) >= 3),
    description TEXT,
    
    -- Permissions (structured JSONB)
    permissions JSONB DEFAULT '{}' NOT NULL,
    
    -- Status and Lifecycle
    status BOOLEAN DEFAULT TRUE NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    deleted_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Metadata
    other_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    updated_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    CONSTRAINT check_role_soft_delete CHECK (
        (is_deleted = FALSE AND deleted_at IS NULL AND deleted_by IS NULL) OR
        (is_deleted = TRUE AND deleted_at IS NOT NULL)
    )
);


-- =========================================
-- PERMISSION MANAGEMENT
-- =========================================
-- Granular permission system for fine-grained access control
CREATE TABLE permission (
    permission_id BIGSERIAL PRIMARY KEY,
    permission_name CITEXT NOT NULL UNIQUE CHECK (LENGTH(permission_name) >= 3),
    description TEXT,
    
    -- Permission Classification
    permission_category VARCHAR(50) DEFAULT 'general' NOT NULL,
    
    -- Status
    status BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Metadata
    other_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    updated_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT permission_resource_action_scope_unique UNIQUE(resource, action, scope)
);

-- =========================================
-- USER MANAGEMENT
-- =========================================
-- Enhanced user table with comprehensive security features
CREATE TABLE "user" (
    user_id BIGSERIAL PRIMARY KEY,
    organisation_id BIGINT NOT NULL REFERENCES organisation(organisation_id) ON DELETE CASCADE,
    
    -- Basic Information
    username CITEXT NOT NULL UNIQUE CHECK (username ~ '^[a-zA-Z][a-zA-Z0-9_]{2,49}$'),
    full_name TEXT NOT NULL CHECK (LENGTH(full_name) >= 2),
    email CITEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone_number VARCHAR(20) CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$'),
    avatar_url TEXT CHECK (avatar_url ~ '^https?://[^\s/$.?#].[^\s]*$'),
    
    -- Authentication
    password_hash TEXT NOT NULL,
    password_changed_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW(),
    password_expires_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    must_change_password BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Role Assignment
    role_id BIGINT REFERENCES role(role_id) DEFAULT NULL,
    user_type VARCHAR(20) DEFAULT 'internal' CHECK (user_type IN ('internal', 'external')),
    
    -- Account Security
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked', 'disabled', 'deleted')),
    
    -- Login Security
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL CHECK (failed_login_attempts >= 0),
    locked_until TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    last_login_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    last_login_ip INET DEFAULT NULL,
    last_activity_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW(),
    
    -- Two-Factor Authentication
    two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    two_factor_secret TEXT DEFAULT NULL, -- TOTP secret
    backup_codes TEXT[] DEFAULT NULL, -- Recovery codes
    
    -- User Preferences
    timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
    locale VARCHAR(10) DEFAULT 'en-IN' NOT NULL,
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
    
    -- Soft Delete
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    deleted_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    deletion_reason TEXT DEFAULT NULL,
    
    -- Metadata
    other_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    updated_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT check_admin_privileges CHECK (
        (can_create_users = TRUE AND user_creation_limit > 0) OR
        (can_create_users = FALSE AND user_creation_limit = 0)
    ),
    CONSTRAINT check_users_created_within_limit CHECK (users_created_count <= user_creation_limit),
    CONSTRAINT check_soft_delete CHECK (
        (is_deleted = FALSE AND deleted_at IS NULL AND deleted_by IS NULL) OR
        (is_deleted = TRUE AND deleted_at IS NOT NULL)
    ),
    CONSTRAINT check_email_verification CHECK (
        (email_verification_token IS NULL AND email_verification_expires_at IS NULL) OR
        (email_verification_token IS NOT NULL AND email_verification_expires_at IS NOT NULL)
    ),
    CONSTRAINT check_phone_verification CHECK (
        (phone_verification_code IS NULL AND phone_verification_expires_at IS NULL) OR
        (phone_verification_code IS NOT NULL AND phone_verification_expires_at IS NOT NULL)
    )
);

-- =========================================
-- SESSION MANAGEMENT
-- =========================================
-- Secure session tracking and management
CREATE TABLE user_session (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    
    -- Session Details
    session_token TEXT NOT NULL UNIQUE, -- Hashed session token
    refresh_token TEXT DEFAULT NULL UNIQUE, -- For token refresh
    device_info JSONB DEFAULT '{}', -- Device fingerprint, user agent, etc.
    
    -- Network Information
    ip_address INET NOT NULL,
    user_agent TEXT,
    
    -- Session Lifecycle
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_activity_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    
    -- Session Status
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    terminated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    termination_reason VARCHAR(50) DEFAULT NULL CHECK (
        termination_reason IS NULL OR 
        termination_reason IN ('logout', 'timeout', 'security', 'admin', 'expired', 'replaced')
    ),
    
    -- Security Flags
    is_suspicious BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Constraints
    CONSTRAINT check_session_active CHECK (
        (is_active = TRUE AND terminated_at IS NULL AND termination_reason IS NULL) OR
        (is_active = FALSE AND terminated_at IS NOT NULL)
    )
);

-- =========================================
-- PASSWORD RESET MANAGEMENT
-- =========================================
-- Secure password reset token management
CREATE TABLE password_reset (
    reset_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    
    -- Reset Token
    reset_token TEXT NOT NULL UNIQUE,
    token_hash TEXT NOT NULL, -- Hashed version for security
    
    -- Request Details
    requested_ip INET NOT NULL,
    requested_user_agent TEXT,
    
    -- Lifecycle
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    
    -- Usage
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    used_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    used_ip INET DEFAULT NULL,
    
    -- Security
    attempt_count INTEGER DEFAULT 0 CHECK (attempt_count >= 0),
    is_suspicious BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Constraints
    CONSTRAINT check_password_reset_usage CHECK (
        (is_used = FALSE AND used_at IS NULL AND used_ip IS NULL) OR
        (is_used = TRUE AND used_at IS NOT NULL AND used_ip IS NOT NULL)
    )
);

-- =========================================
-- TICKET MANAGEMENT (Enhanced)
-- =========================================
-- Comprehensive ticket system with workflow management
CREATE TABLE ticket (
    ticket_id BIGSERIAL PRIMARY KEY,
    organisation_id BIGINT NOT NULL REFERENCES organisation(organisation_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    
    -- Ticket Identification
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    title TEXT NOT NULL CHECK (LENGTH(title) >= 3),
    description TEXT,
    
    -- Classification
    severity VARCHAR(20) DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
    ticket_type VARCHAR(50) DEFAULT 'alert' NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    
    -- Status and Workflow
    ticket_status VARCHAR(50) DEFAULT 'open' CHECK (ticket_status IN ('open', 'investigating', 'resolved')),
    previous_status VARCHAR(50) DEFAULT NULL,
    status_changed_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW(),
    status_changed_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Timeline Management
    due_date TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    first_response_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    resolved_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    resolution_notes TEXT,
    
    -- Time Tracking
    estimated_hours DECIMAL(8,2) CHECK (estimated_hours > 0),
    actual_hours DECIMAL(8,2) DEFAULT 0 CHECK (actual_hours >= 0),
    
    -- Relationships
    related_asset_id BIGINT REFERENCES asset_register_management(asset_id) ON DELETE SET NULL,
    
    -- Tags and Metadata
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    
    -- SLA Tracking
    sla_breach BOOLEAN DEFAULT FALSE NOT NULL,
    sla_due_date TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
        
    -- Metadata
    other_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    updated_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT check_ticket_resolution CHECK (
        (ticket_status NOT IN ('resolved') AND resolved_at IS NULL) OR
        (ticket_status IN ('resolved') AND resolved_at IS NOT NULL)
    ),
);

-- =========================================
-- ASSIGNMENT MANAGEMENT (Enhanced)
-- =========================================
-- Detailed ticket assignment tracking with workflow
CREATE TABLE assignment (
    assignment_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES ticket(ticket_id) ON DELETE CASCADE,
    assigned_to BIGINT REFERENCES "user"(user_id) ON DELETE SET NULL,
    assigned_by BIGINT REFERENCES "user"(user_id) ON DELETE SET NULL,
    
    -- Assignment Type and Role
    assignment_type VARCHAR(50) DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'secondary', 'reviewer', 'observer', 'escalation')),
    assignment_role VARCHAR(100) DEFAULT NULL, -- Specific role in this assignment
    
    -- Assignment Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled', 'escalated')),
    previous_status VARCHAR(50) DEFAULT NULL,
    status_changed_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW(),
    
    -- Priority and Timeline
    due_date TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    
    -- Assignment Lifecycle
    accepted_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    started_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    
    -- Work Tracking
    estimated_hours DECIMAL(8,2) CHECK (estimated_hours > 0),
    actual_hours DECIMAL(8,2) DEFAULT 0 CHECK (actual_hours >= 0),
    
    -- Notes and Communication
    assignment_notes TEXT,
    completion_notes TEXT,
    work_log JSONB DEFAULT '[]', -- Detailed work log entries
    
    -- Escalation
    escalated_from BIGINT REFERENCES assignment(assignment_id) DEFAULT NULL,
    escalation_reason TEXT DEFAULT NULL,
        
    -- Metadata
    other_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    updated_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT check_assignment_timeline CHECK (
        (accepted_at IS NULL OR accepted_at >= created_at) AND
        (started_at IS NULL OR started_at >= COALESCE(accepted_at, created_at)) AND
        (completed_at IS NULL OR completed_at >= COALESCE(started_at, accepted_at, created_at))
    ),
    CONSTRAINT check_assignment_completion CHECK (
        (status != 'completed' AND completed_at IS NULL) OR
        (status = 'completed' AND completed_at IS NOT NULL)
    ),
    CONSTRAINT no_self_escalation CHECK (assignment_id != escalated_from)
);

-- =========================================
-- ASSET REGISTER MANAGEMENT (Enhanced)
-- =========================================
-- Comprehensive asset inventory with advanced features
CREATE TABLE asset_register_management (
    asset_id BIGSERIAL PRIMARY KEY,
    organisation_id BIGINT NOT NULL REFERENCES organisation(organisation_id) ON DELETE CASCADE,
    
    -- Asset Identification
    asset_tag VARCHAR(100) NOT NULL, -- Organization-specific asset identifier
    asset_name CITEXT NOT NULL CHECK (LENGTH(asset_name) >= 3),
    
    -- Asset Classification
    asset_type VARCHAR(50) DEFAULT 'endpoint' NOT NULL 
        CHECK (asset_type IN (
            'endpoint', 'server', 'network_device', 'mobile_device', 'iot_device',
            'virtual_machine', 'cloud_instance', 'container', 'application',
            'database', 'security_device', 'storage_device', 'printer', 'other'
        )),
    asset_category VARCHAR(50) DEFAULT NULL, -- Custom categorization
    
    -- Network Configuration
    ip_address INET,
    mac_address VARCHAR(17) CHECK (mac_address ~ '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})'),
    network_zone VARCHAR(50) DEFAULT 'internal', -- DMZ, internal, external, etc.
    
    -- System Information
    operating_system VARCHAR(100),
    os_version VARCHAR(50),
    os_architecture VARCHAR(20) CHECK (os_architecture IN ('x86', 'x64', 'arm', 'arm64')),
    kernel_version VARCHAR(50),
    
    -- Wazuh Integration
    wazuh_agent_id VARCHAR(10) UNIQUE CHECK (wazuh_agent_id ~ '^[0-9]+)',
    wazuh_agent_name VARCHAR(255),
    wazuh_agent_status VARCHAR(50) DEFAULT 'pending' CHECK (wazuh_agent_status IN ('pending', 'active', 'disconnected', 'never_connected', 'disabled', 'removed')),
    last_keepalive TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    
    -- Asset Status and Classification
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'quarantined', 'retired')),
    previous_status VARCHAR(50) DEFAULT NULL,
    status_changed_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW(),
    status_changed_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Risk and Security Classification
    asset_criticality VARCHAR(20) DEFAULT 'low' CHECK (asset_criticality IN ('low', 'medium', 'high', 'critical')),
    data_classification VARCHAR(20) DEFAULT 'internal' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
    
    -- Environment Information
    environment VARCHAR(20) DEFAULT 'production' CHECK (environment IN ('development', 'testing', 'staging', 'production', 'disaster_recovery')),
    
    -- Soft Delete
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NULL,
    deleted_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    deletion_reason TEXT DEFAULT NULL,
    
    -- Metadata
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    other_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    updated_by BIGINT REFERENCES "user"(user_id) DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT asset_tag_organisation_unique UNIQUE(organisation_id, asset_tag),
    CONSTRAINT check_asset_dates CHECK (
        (acquisition_date IS NULL OR acquisition_date <= CURRENT_DATE) AND
        (installation_date IS NULL OR acquisition_date IS NULL OR installation_date >= acquisition_date) AND
        (warranty_expiry_date IS NULL OR warranty_start_date IS NULL OR warranty_expiry_date > warranty_start_date) AND
        (retirement_date IS NULL OR retirement_date >= CURRENT_DATE) AND
        (disposal_date IS NULL OR disposal_date >= CURRENT_DATE)
    ),
    CONSTRAINT check_asset_soft_delete CHECK (
        (is_deleted = FALSE AND deleted_at IS NULL AND deleted_by IS NULL) OR
        (is_deleted = TRUE AND deleted_at IS NOT NULL)
    )
);

