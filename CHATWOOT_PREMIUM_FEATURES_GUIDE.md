# 🚀 Chatwoot Premium Features - Complete Setup Guide

## 📋 Tổng Quan

Hướng dẫn chi tiết để bật tất cả tính năng premium trong Chatwoot self-hosted, bao gồm Captain AI, SLA, Audit Logs, Custom Roles và các tính năng khác.

## 🎯 Danh Sách Tính Năng Premium

### 1. **Captain AI** - Trợ lý AI thông minh
- **Mô tả**: AI assistant giúp tạo responses, tìm kiếm tài liệu, hỗ trợ agents
- **Feature Flag**: `captain_integration`, `captain_integration_v2`
- **Database**: Bảng `accounts` - cột `feature_flags`

### 2. **SLA (Service Level Agreement)** - Quản lý thời gian phản hồi
- **Mô tả**: Thiết lập và theo dõi thời gian phản hồi cho conversations
- **Feature Flag**: `sla`
- **Database**: Bảng `accounts` - cột `feature_flags`

### 3. **Audit Logs** - Theo dõi hoạt động hệ thống
- **Mô tả**: Ghi lại tất cả hoạt động của users và system
- **Feature Flag**: `audit_logs`
- **Database**: Bảng `accounts` - cột `feature_flags`

### 4. **Custom Roles** - Tạo vai trò tùy chỉnh
- **Mô tả**: Tạo và quản lý các vai trò với quyền hạn khác nhau
- **Feature Flag**: `custom_roles`
- **Database**: Bảng `accounts` - cột `feature_flags`

### 5. **Advanced Search** - Tìm kiếm nâng cao
- **Mô tả**: Tìm kiếm conversations và messages với các bộ lọc phức tạp
- **Feature Flag**: `advanced_search`
- **Database**: Bảng `accounts` - cột `feature_flags`

### 6. **SAML SSO** - Đăng nhập đơn lẻ
- **Mô tả**: Tích hợp với SAML identity providers
- **Feature Flag**: `saml`
- **Database**: Bảng `accounts` - cột `feature_flags`

### 7. **Disable Branding** - Ẩn logo Chatwoot
- **Mô tả**: Loại bỏ branding Chatwoot khỏi widget và emails
- **Feature Flag**: `disable_branding`
- **Database**: Bảng `accounts` - cột `feature_flags`

### 8. **Help Center AI Search** - Tìm kiếm AI trong help center
- **Mô tả**: Tìm kiếm thông minh trong help center articles
- **Feature Flag**: `help_center_embedding_search`
- **Database**: Bảng `accounts` - cột `feature_flags`

## 🛠️ Cách Bật Tính Năng Premium

### Phương Pháp 1: Sử dụng Script Tự Động (Khuyến nghị)

#### Bước 1: Tạo Script Enable Premium Features

```bash
cd /path/to/chatwoot
cat > enable_premium_features.rb << 'SCRIPT_EOF'
#!/usr/bin/env ruby
# Script to enable all premium features for Chatwoot accounts
# Usage: rails runner enable_premium_features.rb

puts "🚀 Enabling all premium features for Chatwoot accounts..."

# Get all accounts
accounts = Account.all

if accounts.empty?
  puts "❌ No accounts found. Please create an account first."
  exit 1
end

puts "📊 Found #{accounts.count} account(s)"

# List of all premium features
premium_features = [
  'sla',                           # Service Level Agreement
  'audit_logs',                   # Audit Logs
  'custom_roles',                 # Custom Roles
  'captain_integration',          # AI Assistant (Captain)
  'disable_branding',             # Remove Chatwoot branding
  'advanced_search',              # Advanced Search
  'saml',                         # SAML SSO
  'help_center_embedding_search', # Help Center AI Search
  'captain_integration_v2'        # Captain V2
]

accounts.each_with_index do |account, index|
  puts "\n#{index + 1}. Processing Account: #{account.name} (ID: #{account.id})"
  
  # Enable all premium features
  premium_features.each do |feature|
    if account.feature_enabled?(feature)
      puts "   ✅ #{feature} is already enabled"
    else
      begin
        account.enable_features!(feature)
        puts "   🎉 #{feature} enabled successfully"
      rescue => e
        puts "   ⚠️  Failed to enable #{feature}: #{e.message}"
      end
    end
  end
  
  # Show all enabled features
  enabled_features = account.enabled_features.keys
  premium_enabled = enabled_features & premium_features
  puts "   📋 Premium features enabled: #{premium_enabled.join(', ')}"
  puts "   Total features enabled: #{enabled_features.count}"
end

puts "\n🎯 All premium features have been enabled!"
puts "💡 You can now access premium features in the dashboard:"
puts "   - SLA: Settings > SLA"
puts "   - Audit Logs: Settings > Audit Logs" 
puts "   - Custom Roles: Settings > Roles"
puts "   - Captain AI: Settings > Captain"
puts "   - Advanced Search: Available in search"
puts "   - SAML: Settings > SAML"
SCRIPT_EOF
```

#### Bước 2: Tạo Script Fix Captain AI Paywall

```bash
cat > fix_captain_paywall.rb << 'PAYWALL_EOF'
#!/usr/bin/env ruby
# Script to fix Captain AI paywall by setting enterprise plan
# Usage: rails runner fix_captain_paywall.rb

puts "🚀 Fixing Captain AI paywall by setting enterprise plan..."

# Set enterprise pricing plan
pricing_plan_config = InstallationConfig.find_or_create_by(name: 'INSTALLATION_PRICING_PLAN')
pricing_plan_config.value = 'enterprise'
pricing_plan_config.save!

puts "✅ Set INSTALLATION_PRICING_PLAN to 'enterprise'"

# Set deployment environment to self-hosted
deployment_env_config = InstallationConfig.find_or_create_by(name: 'DEPLOYMENT_ENV')
deployment_env_config.value = 'self-hosted'
deployment_env_config.save!

puts "✅ Set DEPLOYMENT_ENV to 'self-hosted'"

# Clear cache
GlobalConfig.clear_cache
puts "✅ Cleared configuration cache"

# Verify settings
puts "\n📊 Current configuration:"
puts "   Pricing Plan: #{ChatwootHub.pricing_plan}"
puts "   Enterprise?: #{ChatwootApp.enterprise?}"
puts "   Chatwoot Cloud?: #{ChatwootApp.chatwoot_cloud?}"

# Enable Captain features for all accounts
accounts = Account.all
puts "\n🎯 Enabling Captain features for #{accounts.count} account(s):"

captain_features = ['captain_integration', 'captain_integration_v2']

accounts.each do |account|
  captain_features.each do |feature|
    unless account.feature_enabled?(feature)
      account.enable_features!(feature)
      puts "   🎉 Enabled #{feature} for #{account.name}"
    end
  end
end

puts "\n🎉 Captain AI paywall has been fixed!"
puts "💡 You can now access Captain AI without paywall restrictions."
puts "🔗 Visit: http://localhost:3000/app/accounts/{account_id}/settings/captain"
PAYWALL_EOF
```

#### Bước 3: Chạy Scripts

```bash
# Set environment variables
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DATABASE=chatwoot_dev
export POSTGRES_USERNAME=postgres
export POSTGRES_PASSWORD=
export REDIS_URL=redis://localhost:6379
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

# Run the scripts
bundle exec rails runner enable_premium_features.rb
bundle exec rails runner fix_captain_paywall.rb
```

### Phương Pháp 2: Sử dụng Rails Console

#### Bước 1: Mở Rails Console

```bash
bundle exec rails console
```

#### Bước 2: Enable Premium Features

```ruby
# Enable all premium features for all accounts
premium_features = ['sla', 'audit_logs', 'custom_roles', 'captain_integration', 'disable_branding', 'advanced_search', 'saml', 'help_center_embedding_search', 'captain_integration_v2']

Account.all.each do |account|
  account.enable_features!(*premium_features)
  puts "Enabled premium features for: #{account.name}"
end

# Fix Captain AI paywall
pricing_plan_config = InstallationConfig.find_or_create_by(name: 'INSTALLATION_PRICING_PLAN')
pricing_plan_config.value = 'enterprise'
pricing_plan_config.save!

deployment_env_config = InstallationConfig.find_or_create_by(name: 'DEPLOYMENT_ENV')
deployment_env_config.value = 'self-hosted'
deployment_env_config.save!

GlobalConfig.clear_cache
```

### Phương Pháp 3: Sửa Trực Tiếp Database

#### Bước 1: Kết nối PostgreSQL

```bash
psql -h localhost -U postgres -d chatwoot_dev
```

#### Bước 2: Enable Premium Features

```sql
-- Enable tất cả premium features (bit flags)
UPDATE accounts 
SET feature_flags = feature_flags | (
  (1 << 25) |  -- sla (bit 26)
  (1 << 24) |  -- audit_logs (bit 25)
  (1 << 23) |  -- custom_roles (bit 24)
  (1 << 22) |  -- captain_integration (bit 23)
  (1 << 21) |  -- disable_branding (bit 22)
  (1 << 20) |  -- advanced_search (bit 21)
  (1 << 19) |  -- saml (bit 20)
  (1 << 18) |  -- help_center_embedding_search (bit 19)
  (1 << 17)    -- captain_integration_v2 (bit 18)
);

-- Set enterprise pricing plan
INSERT INTO installation_configs (name, value, created_at, updated_at) 
VALUES ('INSTALLATION_PRICING_PLAN', 'enterprise', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET value = 'enterprise', updated_at = NOW();

-- Set deployment environment
INSERT INTO installation_configs (name, value, created_at, updated_at) 
VALUES ('DEPLOYMENT_ENV', 'self-hosted', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET value = 'self-hosted', updated_at = NOW();
```

## 📊 Cấu Trúc Database

### Bảng `accounts`
- **Cột**: `feature_flags` (bigint)
- **Mô tả**: Bit flags để lưu trữ trạng thái các features
- **Bit mapping**:
  - Bit 26: `sla`
  - Bit 25: `audit_logs`
  - Bit 24: `custom_roles`
  - Bit 23: `captain_integration`
  - Bit 22: `disable_branding`
  - Bit 21: `advanced_search`
  - Bit 20: `saml`
  - Bit 19: `help_center_embedding_search`
  - Bit 18: `captain_integration_v2`

### Bảng `installation_configs`
- **Cột**: `name`, `value`
- **Configs cần thiết**:
  - `INSTALLATION_PRICING_PLAN`: `enterprise`
  - `DEPLOYMENT_ENV`: `self-hosted`

## 🔧 Troubleshooting

### Vấn đề 1: Captain AI vẫn hiện paywall
**Nguyên nhân**: `INSTALLATION_PRICING_PLAN` chưa được set đúng
**Giải pháp**:
```ruby
# Trong Rails console
InstallationConfig.find_or_create_by(name: 'INSTALLATION_PRICING_PLAN').update!(value: 'enterprise')
GlobalConfig.clear_cache
```

### Vấn đề 2: Features không hiện trong UI
**Nguyên nhân**: Cache chưa được clear
**Giải pháp**:
```ruby
# Trong Rails console
GlobalConfig.clear_cache
# Hoặc restart Rails server
```

### Vấn đề 3: Feature flags không được enable
**Nguyên nhân**: Account chưa có feature flags được set
**Giải pháp**:
```ruby
# Trong Rails console
account = Account.find(account_id)
account.enable_features!('feature_name')
```

## 🎯 Kiểm Tra Sau Khi Enable

### 1. Kiểm tra trong Rails Console
```ruby
account = Account.first
account.enabled_features.keys
# Should include: sla, audit_logs, custom_roles, captain_integration, etc.
```

### 2. Kiểm tra trong UI
- **SLA**: Settings > SLA
- **Audit Logs**: Settings > Audit Logs
- **Custom Roles**: Settings > Roles
- **Captain AI**: Settings > Captain
- **Advanced Search**: Available in search box
- **SAML**: Settings > SAML

### 3. Kiểm tra Configuration
```ruby
# Trong Rails console
ChatwootHub.pricing_plan  # Should return 'enterprise'
ChatwootApp.enterprise?   # Should return true
```

## 📝 Lưu Ý Quan Trọng

1. **Backup Database** trước khi thực hiện
2. **Test trong môi trường development** trước
3. **Restart Rails server** sau khi thay đổi configuration
4. **Clear cache** sau mỗi lần thay đổi
5. **Kiểm tra logs** nếu có lỗi

## 🚀 Kết Quả Mong Đợi

Sau khi thực hiện thành công:
- ✅ Tất cả tính năng premium được bật
- ✅ Captain AI hoạt động không bị paywall
- ✅ Có thể truy cập tất cả settings premium
- ✅ UI hiển thị đầy đủ các tính năng

## 📞 Hỗ Trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Rails logs: `tail -f log/development.log`
2. Database connection
3. Feature flags trong database
4. Installation configs
5. Cache status

---
*Tài liệu này được tạo để hỗ trợ việc enable premium features trong Chatwoot self-hosted.*
