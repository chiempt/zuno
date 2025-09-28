class EnableChannelZaloPersonalFeature < ActiveRecord::Migration[7.1]
  def up
    # Enable channel_zalo_personal feature for all existing accounts
    # channel_zalo_personal is at position 4 in features.yml, so bit position = 4
    # We need to set bit 4 to 1 (2^3 = 8)
    execute <<-SQL
      UPDATE accounts#{' '}
      SET feature_flags = feature_flags | 8#{' '}
      WHERE feature_flags & 8 = 0;
    SQL
  end

  def down
    # Disable channel_zalo_personal feature for all accounts
    execute <<-SQL
      UPDATE accounts#{' '}
      SET feature_flags = feature_flags & ~8#{' '}
      WHERE feature_flags & 8 = 1;
    SQL
  end
end
