#!/usr/bin/env ruby

require_relative 'lib/zalo_ruby_client'

# Test ZaloRubyClient
puts "Testing ZaloRubyClient..."

client = ZaloRubyClient.new(
  user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
)

puts "Testing login info..."
login_info = client.send(:get_login_info)
puts "Login info result: #{login_info}"

if login_info[:success]
  puts "Testing QR generation with version: #{login_info[:version]}"
  qr_result = client.send(:generate_qr_with_version, login_info[:version])
  puts "QR generation result: #{qr_result}"
else
  puts "Login info failed: #{login_info[:error]}"
end

puts "Testing full QR generation..."
result = client.generate_qr_code
puts "Full QR generation result: #{result}"
