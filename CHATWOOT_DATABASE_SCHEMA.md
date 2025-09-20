# 📊 CHATWOOT DATABASE SCHEMA - TỔNG QUAN

## 🎯 Giới thiệu
Tài liệu này mô tả chi tiết cấu trúc database của Chatwoot - một nền tảng customer support và live chat. Hệ thống sử dụng PostgreSQL với 89 bảng chính được tổ chức theo các nhóm chức năng.

## 🔧 **CORE SYSTEM TABLES**

### 1. **Accounts & Users**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `accounts` | Tài khoản công ty/workspace | `id`, `name`, `domain`, `support_email`, `feature_flags`, `limits`, `custom_attributes`, `settings` |
| `users` | Người dùng hệ thống | `id`, `name`, `email`, `provider`, `encrypted_password`, `availability`, `ui_settings` |
| `account_users` | Liên kết user với account | `account_id`, `user_id`, `role`, `custom_role_id`, `agent_capacity_policy_id` |
| `custom_roles` | Vai trò tùy chỉnh | `name`, `description`, `permissions[]`, `account_id` |
| `access_tokens` | Token truy cập API | `owner_type`, `owner_id`, `token` |

### 2. **Authentication & Security**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `account_saml_settings` | Cấu hình SAML SSO | `account_id`, `sso_url`, `certificate`, `role_mappings` |
| `notification_settings` | Cài đặt thông báo | `account_id`, `user_id`, `email_flags`, `push_flags` |
| `notification_subscriptions` | Đăng ký thông báo | `user_id`, `subscription_type`, `subscription_attributes` |

## 💬 **CONVERSATION MANAGEMENT**

### 3. **Conversations & Messages**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `conversations` | Cuộc hội thoại | `id`, `account_id`, `inbox_id`, `contact_id`, `status`, `assignee_id`, `display_id`, `priority` |
| `messages` | Tin nhắn trong cuộc hội thoại | `id`, `content`, `conversation_id`, `message_type`, `sender_type`, `sender_id`, `content_type` |
| `conversation_participants` | Người tham gia cuộc hội thoại | `conversation_id`, `user_id`, `account_id` |
| `attachments` | File đính kèm | `message_id`, `file_type`, `external_url`, `coordinates_lat`, `coordinates_long` |
| `mentions` | Đề cập người dùng | `user_id`, `conversation_id`, `mentioned_at` |

### 4. **Contacts & Inboxes**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `contacts` | Danh bạ khách hàng | `id`, `name`, `email`, `phone_number`, `account_id`, `contact_type`, `custom_attributes` |
| `contact_inboxes` | Liên kết contact với inbox | `contact_id`, `inbox_id`, `source_id`, `hmac_verified` |
| `inboxes` | Hộp thư đến | `id`, `channel_id`, `account_id`, `name`, `channel_type`, `enable_auto_assignment` |
| `inbox_members` | Thành viên inbox | `user_id`, `inbox_id` |
| `inbox_assignment_policies` | Chính sách phân công inbox | `inbox_id`, `assignment_policy_id` |

## 📱 **CHANNEL INTEGRATIONS**

### 5. **Communication Channels**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `channel_web_widgets` | Widget web | `website_url`, `website_token`, `widget_color`, `welcome_title` |
| `channel_email` | Email channel | `email`, `forward_to_email`, `imap_enabled`, `smtp_enabled` |
| `channel_facebook_pages` | Facebook Pages | `page_id`, `user_access_token`, `page_access_token` |
| `channel_instagram` | Instagram | `access_token`, `instagram_id`, `expires_at` |
| `channel_line` | LINE | `line_channel_id`, `line_channel_secret`, `line_channel_token` |
| `channel_sms` | SMS | `phone_number`, `provider`, `provider_config` |
| `channel_telegram` | Telegram | `bot_name`, `bot_token` |
| `channel_twilio_sms` | Twilio SMS | `phone_number`, `account_sid`, `auth_token`, `messaging_service_sid` |
| `channel_twitter_profiles` | Twitter | `profile_id`, `twitter_access_token`, `twitter_access_token_secret` |
| `channel_whatsapp` | WhatsApp | `phone_number`, `provider`, `message_templates` |
| `channel_voice` | Voice calls | `phone_number`, `provider`, `provider_config` |
| `channel_api` | API channel | `webhook_url`, `identifier`, `hmac_token` |

## 🤖 **AI & AUTOMATION**

### 6. **AI Features**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `captain_assistants` | AI Assistant | `name`, `description`, `config`, `response_guidelines`, `guardrails` |
| `captain_assistant_responses` | Phản hồi AI | `question`, `answer`, `embedding`, `assistant_id`, `status` |
| `captain_documents` | Tài liệu AI | `name`, `external_link`, `content`, `assistant_id`, `status` |
| `captain_inboxes` | Liên kết AI với inbox | `captain_assistant_id`, `inbox_id` |
| `captain_scenarios` | Kịch bản AI | `title`, `description`, `instruction`, `tools`, `enabled` |

### 7. **Automation & Bots**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `agent_bots` | Bot agents | `name`, `description`, `outgoing_url`, `bot_type`, `bot_config` |
| `agent_bot_inboxes` | Liên kết bot với inbox | `inbox_id`, `agent_bot_id`, `status` |
| `automation_rules` | Quy tắc tự động | `name`, `event_name`, `conditions`, `actions`, `active` |
| `macros` | Macro tự động | `name`, `visibility`, `actions`, `created_by_id` |

## 📚 **KNOWLEDGE BASE**

### 8. **Help Center & Articles**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `portals` | Portal hỗ trợ | `name`, `slug`, `custom_domain`, `color`, `config` |
| `portals_members` | Thành viên portal | `portal_id`, `user_id` |
| `articles` | Bài viết | `title`, `description`, `content`, `status`, `slug`, `locale` |
| `categories` | Danh mục | `name`, `description`, `slug`, `locale`, `parent_category_id` |
| `folders` | Thư mục | `name`, `category_id` |
| `article_embeddings` | Vector embeddings | `article_id`, `term`, `embedding` |
| `related_categories` | Danh mục liên quan | `category_id`, `related_category_id` |

## 🏷️ **ORGANIZATION & TAGGING**

### 9. **Teams & Labels**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `teams` | Nhóm làm việc | `name`, `description`, `allow_auto_assign`, `account_id` |
| `team_members` | Thành viên nhóm | `team_id`, `user_id` |
| `labels` | Nhãn | `title`, `description`, `color`, `show_on_sidebar` |
| `taggings` | Gắn nhãn | `tag_id`, `taggable_type`, `taggable_id` |
| `tags` | Thẻ | `name`, `taggings_count` |

## 📊 **ANALYTICS & REPORTING**

### 10. **Reports & Events**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `reporting_events` | Sự kiện báo cáo | `name`, `value`, `account_id`, `inbox_id`, `user_id` |
| `csat_survey_responses` | Phản hồi CSAT | `conversation_id`, `rating`, `feedback_message`, `contact_id` |
| `audits` | Audit log | `auditable_type`, `auditable_id`, `action`, `audited_changes` |

## ⚙️ **CONFIGURATION & SETTINGS**

### 11. **System Configuration**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `installation_configs` | Cấu hình cài đặt | `name`, `serialized_value`, `locked` |
| `custom_attribute_definitions` | Định nghĩa thuộc tính tùy chỉnh | `attribute_key`, `attribute_display_name`, `attribute_display_type` |
| `custom_filters` | Bộ lọc tùy chỉnh | `name`, `filter_type`, `query` |
| `email_templates` | Template email | `name`, `body`, `template_type`, `locale` |
| `canned_responses` | Phản hồi có sẵn | `short_code`, `content` |

## 🎯 **CAMPAIGNS & MARKETING**

### 12. **Campaigns**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `campaigns` | Chiến dịch | `title`, `message`, `campaign_type`, `campaign_status`, `audience` |
| `data_imports` | Import dữ liệu | `data_type`, `status`, `total_records`, `processed_records` |

## 🔔 **NOTIFICATIONS & COMMUNICATION**

### 13. **Notifications**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `notifications` | Thông báo | `notification_type`, `primary_actor_type`, `primary_actor_id`, `read_at` |
| `webhooks` | Webhook | `url`, `webhook_type`, `subscriptions` |
| `integrations_hooks` | Hook tích hợp | `app_id`, `hook_type`, `reference_id`, `access_token` |

## 📋 **SLA & WORKFLOW**

### 14. **SLA Management**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `sla_policies` | Chính sách SLA | `name`, `first_response_time_threshold`, `resolution_time_threshold` |
| `applied_slas` | SLA đã áp dụng | `sla_policy_id`, `conversation_id`, `sla_status` |
| `sla_events` | Sự kiện SLA | `applied_sla_id`, `event_type`, `meta` |

### 15. **Assignment & Capacity**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `assignment_policies` | Chính sách phân công | `name`, `assignment_order`, `conversation_priority`, `enabled` |
| `agent_capacity_policies` | Chính sách năng lực agent | `name`, `exclusion_rules` |
| `inbox_capacity_limits` | Giới hạn năng lực inbox | `conversation_limit` |
| `leaves` | Nghỉ phép | `start_date`, `end_date`, `leave_type`, `status` |

## 🎨 **UI & DASHBOARD**

### 16. **Dashboard & Apps**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `dashboard_apps` | Ứng dụng dashboard | `title`, `content`, `account_id`, `user_id` |
| `working_hours` | Giờ làm việc | `day_of_week`, `open_hour`, `close_hour`, `closed_all_day` |

## 🤖 **COPILOT & AI CHAT**

### 17. **Copilot Features**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `copilot_threads` | Thread Copilot | `title`, `user_id`, `assistant_id` |
| `copilot_messages` | Tin nhắn Copilot | `copilot_thread_id`, `message`, `message_type` |

## 📝 **NOTES & ADDITIONAL**

### 18. **Notes & Platform Apps**
| Bảng | Mô tả | Các trường quan trọng |
|------|-------|---------------------|
| `notes` | Ghi chú | `content`, `contact_id`, `user_id` |
| `platform_apps` | Ứng dụng nền tảng | `name` |
| `platform_app_permissibles` | Quyền ứng dụng | `platform_app_id`, `permissible_type`, `permissible_id` |

## 🔗 **RELATIONSHIPS CHÍNH**

### Core Relationships:
- `accounts` → `users` (through `account_users`)
- `accounts` → `conversations` → `messages`
- `contacts` → `conversations` (through `contact_inboxes`)
- `inboxes` → `conversations` → `messages`
- `users` → `conversations` (as assignee or participant)

### Channel Relationships:
- `inboxes` → `channel_*` tables (polymorphic)
- `conversations` → `inboxes` → `channels`

### AI Relationships:
- `captain_assistants` → `captain_documents`
- `captain_assistants` → `captain_assistant_responses`
- `captain_assistants` → `captain_inboxes`

## 📈 **INDEXES QUAN TRỌNG**

### Performance Indexes:
- `conversations`: `(account_id, inbox_id, status, assignee_id)`
- `messages`: `(conversation_id, account_id, message_type, created_at)`
- `contacts`: `(account_id, email, phone_number, identifier)`
- `notifications`: `(user_id, account_id, snoozed_until, read_at)`

### Search Indexes:
- `messages.content` (GIN trigram)
- `contacts` (GIN trigram on name, email, phone)
- `tags.name` (GIN trigram)

## 🚀 **EXTENSIONS & FEATURES**

### PostgreSQL Extensions:
- `pg_stat_statements` - Query statistics
- `pg_trgm` - Trigram matching for search
- `pgcrypto` - Cryptographic functions
- `plpgsql` - Procedural language
- `vector` - Vector similarity search for AI

### Triggers:
- Auto-increment `display_id` for conversations
- Auto-increment `display_id` for campaigns
- Sequence creation for new accounts

---

*Tài liệu này được tạo tự động từ schema.rb của Chatwoot. Cập nhật lần cuối: $(date)*
