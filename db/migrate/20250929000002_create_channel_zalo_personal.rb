class CreateChannelZaloPersonal < ActiveRecord::Migration[7.1]
  def change
    create_table :channel_zalo_personal do |t|
      # Core associations
      t.references :account, null: false, foreign_key: true, index: true

      # Channel identification
      t.string :name, null: false, comment: 'Channel display name'

      # Zalo authentication data
      t.jsonb :cookie, default: [], null: false, comment: 'Zalo authentication cookies'
      t.string :imei, null: false, comment: 'Device IMEI for Zalo authentication'
      t.string :user_agent, null: false, comment: 'User agent string for Zalo requests'

      # QR Code for authentication
      t.text :qr_code, comment: 'Base64 encoded QR code for authentication'

      t.timestamps
    end

    # Add indexes
    add_index :channel_zalo_personal, :imei, unique: true
    add_index :channel_zalo_personal, :name
    add_index :channel_zalo_personal, [:account_id, :name]
  end
end
