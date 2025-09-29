# lib/zalo_ruby_client.rb
require 'net/http'
require 'json'
require 'base64'
require 'securerandom'
require 'digest'
require 'openssl'
require 'uri'

class ZaloRubyClient
  BASE_URL = 'https://chat.zalo.me'
  ID_BASE_URL = 'https://id.zalo.me'
  
  def initialize(user_agent: nil, language: 'vi')
    @user_agent = user_agent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    @language = language
    @imei = generate_imei
    @cookie_jar = {}
    @http_client = nil
  end

  def generate_qr_code
    begin
      # Step 1: Load login page để lấy cookies và version (theo zca-js flow)
      login_version = load_login_page
      return { success: false, error: 'Cannot get API login version' } unless login_version
      
      Rails.logger.info "Got login version: #{login_version}"
      
      # Step 2: Get login info với version
      login_info = get_login_info(login_version)
      return { success: false, error: login_info[:error] } unless login_info[:success]
      
      # Step 3: Verify client
      verify_result = verify_client(login_version)
      return { success: false, error: verify_result[:error] } unless verify_result[:success]
      
      # Step 4: Generate QR code với version
      qr_response = generate_qr_with_version(login_version)
      
      if qr_response['error_code'] == 0 && qr_response['data']
        qr_data = qr_response['data']
        
        {
          success: true,
          qr_code: qr_data['image'],
          qr_data: qr_data
        }
      else
        {
          success: false,
          error: qr_response['error_message'] || 'Failed to generate QR code'
        }
      end
    rescue StandardError => e
      Rails.logger.error "ZaloRubyClient error: #{e.message}"
      {
        success: false,
        error: e.message
      }
    end
  end

  private

  def make_request(uri, request, include_cookies: true)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    
    # Add cookies if available
    if include_cookies && !@cookie_jar.empty?
      cookie_string = @cookie_jar.map { |name, value| "#{name}=#{value}" }.join('; ')
      request['Cookie'] = cookie_string
      Rails.logger.info "Adding cookies: #{cookie_string}"
    end
    
    Rails.logger.info "Making request to: #{uri}"
    Rails.logger.info "Request headers: #{request.to_hash}"
    Rails.logger.info "Request body: #{request.body}" if request.body
    
    response = http.request(request)
    
    Rails.logger.info "Response code: #{response.code}"
    Rails.logger.info "Response headers: #{response.to_hash}"
    Rails.logger.info "Response body: #{response.body[0..500]}..." if response.body && response.body.length > 500
    
    # Extract cookies from response
    if response['Set-Cookie']
      cookies = response['Set-Cookie'].split(',')
      cookies.each do |cookie|
        cookie_parts = cookie.strip.split(';')[0].split('=', 2)
        if cookie_parts.length == 2
          @cookie_jar[cookie_parts[0]] = cookie_parts[1]
        end
      end
      Rails.logger.info "Updated cookies: #{@cookie_jar}"
    end
    
    response
  end

  def load_login_page
    uri = URI("#{ID_BASE_URL}/account?continue=https%3A%2F%2Fchat.zalo.me%2F")
    
    request = Net::HTTP::Get.new(uri)
    
    # Headers theo zca-js
    request['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
    request['Accept-Language'] = 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5'
    request['Cache-Control'] = 'max-age=0'
    request['User-Agent'] = @user_agent
    request['Sec-Ch-Ua'] = '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"'
    request['Sec-Ch-Ua-Mobile'] = '?0'
    request['Sec-Ch-Ua-Platform'] = '"Windows"'
    request['Sec-Fetch-Dest'] = 'document'
    request['Sec-Fetch-Mode'] = 'navigate'
    request['Sec-Fetch-Site'] = 'same-origin'
    request['Upgrade-Insecure-Requests'] = '1'
    request['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    Rails.logger.info "Loading login page from: #{uri}"
    
    response = make_request(uri, request, include_cookies: false)
    
    if response.code == '200'
      # Extract version từ HTML response
      version = extract_version_from_html(response.body)
      Rails.logger.info "Extracted version: #{version}"
      version
    else
      Rails.logger.error "Failed to load login page: #{response.code}"
      nil
    end
  rescue StandardError => e
    Rails.logger.error "Load login page error: #{e.message}"
    nil
  end

  def get_login_info(version)
    uri = URI("#{ID_BASE_URL}/account/logininfo")
    
    request = Net::HTTP::Post.new(uri)
    
    # Headers theo zca-js
    request['Accept'] = '*/*'
    request['Accept-Language'] = 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5'
    request['Content-Type'] = 'application/x-www-form-urlencoded'
    request['User-Agent'] = @user_agent
    request['Sec-Ch-Ua'] = '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"'
    request['Sec-Ch-Ua-Mobile'] = '?0'
    request['Sec-Ch-Ua-Platform'] = '"Windows"'
    request['Sec-Fetch-Dest'] = 'empty'
    request['Sec-Fetch-Mode'] = 'cors'
    request['Sec-Fetch-Site'] = 'same-origin'
    request['Referer'] = 'https://id.zalo.me/account?continue=https%3A%2F%2Fzalo.me%2Fpc'
    request['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Form data theo zca-js với version thực tế
    form_data = URI.encode_www_form({
      'continue' => 'https://zalo.me/pc',
      'v' => version
    })
    
    request.body = form_data
    
    Rails.logger.info "Getting login info with version #{version} from: #{uri}"
    
    response = make_request(uri, request)

    Rails.logger.info "Login info response: #{response.body}"
    
    if response.code == '200'
      data = JSON.parse(response.body)
      
      {
        success: true,
        data: data
      }
    else
      {
        success: false,
        error: "HTTP #{response.code}: #{response.message}"
      }
    end
  rescue StandardError => e
    Rails.logger.error "Login info error: #{e.message}"
    {
      success: false,
      error: e.message
    }
  end

  def verify_client(version)
    uri = URI("#{ID_BASE_URL}/account/verify-client")
    
    request = Net::HTTP::Post.new(uri)
    
    # Headers theo zca-js
    request['Accept'] = '*/*'
    request['Accept-Language'] = 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5'
    request['Content-Type'] = 'application/x-www-form-urlencoded'
    request['User-Agent'] = @user_agent
    request['Sec-Ch-Ua'] = '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"'
    request['Sec-Ch-Ua-Mobile'] = '?0'
    request['Sec-Ch-Ua-Platform'] = '"Windows"'
    request['Sec-Fetch-Dest'] = 'empty'
    request['Sec-Fetch-Mode'] = 'cors'
    request['Sec-Fetch-Site'] = 'same-origin'
    request['Referer'] = 'https://id.zalo.me/account?continue=https%3A%2F%2Fzalo.me%2Fpc'
    request['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Form data theo zca-js
    form_data = URI.encode_www_form({
      'type' => 'device',
      'continue' => 'https://zalo.me/pc',
      'v' => version
    })
    
    request.body = form_data
    
    Rails.logger.info "Verifying client with version #{version} from: #{uri}"
    
    response = make_request(uri, request)
    
    if response.code == '200'
      data = JSON.parse(response.body)
      
      {
        success: true,
        data: data
      }
    else
      {
        success: false,
        error: "HTTP #{response.code}: #{response.message}"
      }
    end
  rescue StandardError => e
    Rails.logger.error "Verify client error: #{e.message}"
    {
      success: false,
      error: e.message
    }
  end

  def generate_qr_with_version(version)
    uri = URI("#{ID_BASE_URL}/account/authen/qr/generate")
    
    request = Net::HTTP::Post.new(uri)
    
    # Headers theo zca-js
    request['Accept'] = '*/*'
    request['Accept-Language'] = 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5'
    request['Content-Type'] = 'application/x-www-form-urlencoded'
    request['User-Agent'] = @user_agent
    request['Sec-Ch-Ua'] = '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"'
    request['Sec-Ch-Ua-Mobile'] = '?0'
    request['Sec-Ch-Ua-Platform'] = '"Windows"'
    request['Sec-Fetch-Dest'] = 'empty'
    request['Sec-Fetch-Mode'] = 'cors'
    request['Sec-Fetch-Site'] = 'same-origin'
    request['Referer'] = 'https://id.zalo.me/account?continue=https%3A%2F%2Fzalo.me%2Fpc'
    request['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Form data theo zca-js với version thực tế
    form_data = URI.encode_www_form({
      'continue' => 'https://zalo.me/pc',
      'v' => version
    })
    
    request.body = form_data
    
    Rails.logger.info "Generating QR with version #{version} from: #{uri}"
    
    response = make_request(uri, request)
    
    if response.code == '200'
      JSON.parse(response.body)
    else
      {
        error_code: -1,
        error_message: "HTTP #{response.code}: #{response.message}",
        data: nil
      }
    end
  rescue StandardError => e
    Rails.logger.error "QR generation error: #{e.message}"
    {
      error_code: -1,
      error_message: e.message,
      data: nil
    }
  end

  def generate_imei
    '35' + SecureRandom.random_number(10**13).to_s.rjust(13, '0')
  end

  def extract_version_from_html(html_body)
    Rails.logger.info "Extracting version from HTML body length: #{html_body.length}"
    
    # Extract version từ HTML theo zca-js logic
    # Tìm nhiều pattern khác nhau
    patterns = [
      /"version":\s*"(\d+\.\d+\.\d+)"/,
      /version:\s*"(\d+\.\d+\.\d+)"/,
      /v:\s*"(\d+\.\d+\.\d+)"/,
      /"v":\s*"(\d+\.\d+\.\d+)"/,
      /version\s*=\s*"(\d+\.\d+\.\d+)"/,
      /v\s*=\s*"(\d+\.\d+\.\d+)"/
    ]
    
    patterns.each_with_index do |pattern, index|
      match = html_body.match(pattern)
      if match
        Rails.logger.info "Found version with pattern #{index}: #{match[1]}"
        return match[1]
      end
    end
    
    # Log một phần HTML để debug
    Rails.logger.info "HTML sample: #{html_body[0..1000]}"
    
    # Fallback version
    Rails.logger.info "Using fallback version: 5.5.7"
    '5.5.7'
  end

  # Convert từ zca-js: getSignKey function
  def get_sign_key(type, params)
    sorted_keys = params.keys.sort
    sign_string = "zsecure#{type}"
    
    sorted_keys.each do |key|
      sign_string += params[key].to_s
    end
    
    Digest::MD5.hexdigest(sign_string)
  end

  # Convert từ zca-js: encodeAES function
  def encode_aes(secret_key, data, retries = 0)
    begin
      key = Base64.decode64(secret_key)
      cipher = OpenSSL::Cipher.new('AES-128-CBC')
      cipher.encrypt
      cipher.key = key
      cipher.iv = "\x00" * 16  # IV với 16 bytes zero
      
      encrypted = cipher.update(data) + cipher.final
      Base64.strict_encode64(encrypted)
    rescue => e
      Rails.logger.error "AES encode error: #{e.message}"
      return nil if retries >= 3
      encode_aes(secret_key, data, retries + 1)
    end
  end

  # Convert từ zca-js: decodeAES function  
  def decode_aes(secret_key, data, retries = 0)
    begin
      data = URI.decode_www_form_component(data)
      key = Base64.decode64(secret_key)
      cipher = OpenSSL::Cipher.new('AES-128-CBC')
      cipher.decrypt
      cipher.key = key
      cipher.iv = "\x00" * 16  # IV với 16 bytes zero
      
      decoded_data = Base64.decode64(data)
      decrypted = cipher.update(decoded_data) + cipher.final
      decrypted.force_encoding('UTF-8')
    rescue => e
      Rails.logger.error "AES decode error: #{e.message}"
      return nil if retries >= 3
      decode_aes(secret_key, data, retries + 1)
    end
  end

  # Convert từ zca-js: generateZaloUUID function
  def generate_zalo_uuid(user_agent)
    # Simplified UUID generation based on user agent
    Digest::MD5.hexdigest(user_agent + Time.now.to_i.to_s)
  end

  def convert_qr_to_base64(qr_image_data)
    # If qr_image_data is already base64, return it
    return qr_image_data if qr_image_data.is_a?(String) && qr_image_data.match?(/\A[A-Za-z0-9+\/]*={0,2}\z/)
    
    # If it's binary data, convert to base64
    Base64.strict_encode64(qr_image_data)
  end
end
