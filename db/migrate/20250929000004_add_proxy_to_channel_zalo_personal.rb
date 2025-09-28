class AddProxyToChannelZaloPersonal < ActiveRecord::Migration[7.1]
  def change
    add_column :channel_zalo_personal, :proxy, :string, comment: 'Proxy server URL for Zalo requests'
    add_index :channel_zalo_personal, :proxy
  end
end
