class Api::V1::Accounts::ZaloPersonalController < Api::V1::Accounts::BaseController
  # Tạm thời skip authentication để test
  skip_before_action :authenticate_user!, only: [:generate_qr, :check_status]
  
  def generate_qr
    begin
      # Lấy user agent từ request headers hoặc params
      user_agent = request.user_agent || params[:user_agent] || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      
      Rails.logger.info "Request user agent: #{request.user_agent}"
      Rails.logger.info "Params user agent: #{params[:user_agent]}"
      Rails.logger.info "Final user agent: #{user_agent}"
      
      zalo_client = ZaloRubyClient.new(user_agent: user_agent)
      qr_data = zalo_client.generate_qr_code

      Rails.logger.info "QR data: #{qr_data}"
      
      if qr_data[:success]
        render json: { 
          success: true, 
          qr_code: qr_data[:qr_code],
          expires_at: 5.minutes.from_now.iso8601,
          message: 'QR code generated successfully' 
        }
      else
        render json: { 
          success: false, 
          error: qr_data[:error] || 'Unknown error occurred' 
        }, status: :unprocessable_entity
      end
    rescue StandardError => e
      Rails.logger.error "Zalo QR generation error: #{e.message}"
      render json: { 
        success: false, 
        error: e.message 
      }, status: :internal_server_error
    end
  end

  def check_status
    render json: {
      is_connected: false,
      has_qr_code: false
    }
  end

  def update_settings
    begin
      inbox_id = params[:inbox_id]
      inbox = Current.account.inboxes.find(inbox_id)
      
      # Update channel settings
      channel_params = params[:channel] || {}
      
      if channel_params[:user_agent].present?
        inbox.channel.update!(user_agent: channel_params[:user_agent])
      end
      
      if channel_params[:proxy].present?
        inbox.channel.update!(proxy: channel_params[:proxy])
      end
      
      if channel_params[:qr_code].present?
        inbox.channel.update!(qr_code: channel_params[:qr_code])
      end
      
      render json: {
        success: true,
        message: 'Zalo settings updated successfully'
      }
    rescue StandardError => e
      Rails.logger.error "Zalo settings update error: #{e.message}"
      render json: {
        success: false,
        error: e.message
      }, status: :internal_server_error
    end
  end
end
