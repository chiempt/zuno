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
