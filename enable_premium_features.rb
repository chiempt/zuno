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