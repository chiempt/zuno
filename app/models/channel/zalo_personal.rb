# == Schema Information
#
# Table name: channel_zalo_personal
#
#  id                                                 :bigint           not null, primary key
#  cookie(Zalo authentication cookies)                :jsonb            default([])
#  imei(Device IMEI for Zalo authentication)          :string           not null
#  name(Channel display name)                         :string           not null
#  qr_code(Base64 encoded QR code for authentication) :text
#  user_agent(User agent string for Zalo requests)    :string           not null
#  proxy(Proxy server URL for Zalo requests)          :string
#  created_at                                         :datetime         not null
#  updated_at                                         :datetime         not null
#  account_id                                         :bigint           not null
#
# Indexes
#
#  index_channel_zalo_personal_on_account_id           (account_id)
#  index_channel_zalo_personal_on_account_id_and_name  (account_id,name)
#  index_channel_zalo_personal_on_imei                 (imei) UNIQUE
#  index_channel_zalo_personal_on_name                 (name)
#  index_channel_zalo_personal_on_proxy                (proxy)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#

class Channel::ZaloPersonal < ApplicationRecord
  include Channelable
  include Reauthorizable

  self.table_name = 'channel_zalo_personal'
  EDITABLE_ATTRS = [:name, :imei, :user_agent, :qr_code, :proxy].freeze

  # Validations
  validates :name, presence: true
  validates :imei, presence: true, uniqueness: true
  validates :user_agent, presence: true
  # Cookie validation removed - it will be set after QR code authentication

  # Callbacks
  before_validation :ensure_default_values

  def channel_name
    name || 'Zalo Personal'
  end

  def is_connected?
    cookie.present? && cookie.is_a?(Array) && cookie.any?
  end

  private

  def ensure_default_values
    self.user_agent ||= 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  end
end
