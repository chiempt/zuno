# == Schema Information
#
# Table name: channel_zalo_personal
#
#  id                                                 :bigint           not null, primary key
#  cookie(Zalo authentication cookies)                :jsonb
#  imei(Device IMEI for Zalo authentication)          :string           not null
#  name(Channel display name)                         :string           not null
#  proxy(Proxy server URL for Zalo requests)          :string
#  qr_code(Base64 encoded QR code for authentication) :text
#  user_agent(User agent string for Zalo requests)    :string           not null
#  zalo_account_name                                  :string(255)
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
  self.table_name = 'channel_zalo_personal'
  EDITABLE_ATTRS = [
    :name,
    :zalo_account_name,
    :imei,
    :user_agent,
    :proxy,
    :qr_code,
    :is_connected,
    :last_login_at,
    :connection_status,
    { cookie: [] }
  ].freeze

  validates :name, presence: true
  validates :zalo_account_name, presence: true
  validates :imei, presence: true
  validates :user_agent, presence: true

  def display_name
    "#{name} (#{zalo_account_name})"
  end

  def send_message_on_zalo(message)
    # Forward to Node.js service
    Zalo::SendMessageJob.perform_later(message.id, message.outgoing_content)
  end

  def thread_id(message)
    message.conversation[:additional_attributes]['zalo_thread_id']
  end

  def zalo_user_id(message)
    message.conversation[:additional_attributes]['zalo_user_id']
  end

  def send_message(message)
    response = message_request(
      thread_id(message),
      message.outgoing_content,
      message.id
    )
    process_error(message, response) if response['error']
    response['message_id'] if response['success']
  end

  private

  def process_error(message, response)
    message.external_error = response['error']
    message.status = :failed
    message.save!
  end
end
