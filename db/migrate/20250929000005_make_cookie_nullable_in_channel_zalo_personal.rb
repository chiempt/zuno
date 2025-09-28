class MakeCookieNullableInChannelZaloPersonal < ActiveRecord::Migration[7.1]
  def change
    change_column_null :channel_zalo_personal, :cookie, true
  end
end
