# app/controllers/api/v1/zalo_qr_controller.rb
class Api::V1::ZaloQrController < ApplicationController
  before_action :authenticate_user!

  def generate
    Rails.logger.info "Generating QR code with parameters: #{params.inspect}"

    begin
      # Create a temporary channel object for the service
      temp_channel = OpenStruct.new(
        id: 'temp',
        imei: params[:imei],
        user_agent: params[:user_agent],
        proxy: params[:proxy]
      )

      # Generate QR code using Zalo service
      result = ZaloService.new(temp_channel).generate_qr_code

      render json: {
        success: true,
        qr_code: result['qr_code'],
        expires_at: result['expires_at'],
        message: 'QR code generated successfully'
      }

    rescue ZaloServiceError => e
      Rails.logger.error "Failed to generate QR code: #{e.message}"

      render json: {
        success: false,
        error: e.message,
        message: 'Failed to generate QR code'
      }, status: :unprocessable_entity

    rescue StandardError => e
      Rails.logger.error "Unexpected error generating QR code: #{e.message}"

      render json: {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      }, status: :internal_server_error
    end
  end
end