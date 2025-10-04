import { Injectable, Logger } from '@nestjs/common';

export interface ZaloChannel {
  id: number;
  name: string;
  zalo_account_name: string;
  cookie: any[];
  imei: string;
  user_agent: string;
  proxy?: string;
  account_id: number;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {}

  /**
   * Fetch all ZaloPersonal channels with valid cookies
   */
  async getAllZaloChannels(): Promise<ZaloChannel[]> {
    try {
      this.logger.log('🔍 Fetching all ZaloPersonal channels...');

      // Check if we should use mock data
      if (this.shouldUseMockData()) {
        this.logger.log('🧪 Using mock data mode');
        return this.getMockChannels();
      }

      // First try to connect to Chatwoot API
      const chatwootUrl =
        process.env.CHATWOOT_API_URL || 'http://localhost:3000';
      const apiToken = process.env.CHATWOOT_API_TOKEN || 'internal_token';

      this.logger.log(`🌐 Connecting to Chatwoot: ${chatwootUrl}`);

      // Query Chatwoot database for ZaloPersonal channels
      const response = await fetch(`${chatwootUrl}/internal/zalo/channels`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        // Add timeout and retry
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(
          `Chatwoot API responded with ${response.status}: ${response.statusText}`,
        );
      }

      const channels: ZaloChannel[] = await response.json();

      this.logger.log(`✅ Found ${channels.length} ZaloPersonal channels`);

      // Filter channels with valid cookies
      const validChannels = channels.filter((channel) =>
        this.hasValidCookie(channel.cookie),
      );

      this.logger.log(`📱 ${validChannels.length} channels have valid cookies`);

      return validChannels;
    } catch (error) {
      this.logger.error('❌ Failed to fetch Zalo channels:', error.message);
      this.logger.warn('🔄 Falling back to mock channel data for testing');

      // Return mock data for testing when Chatwoot is not available
      return this.getMockChannels();
    }
  }

  /**
   * Get mock channels for testing when Chatwoot is not available
   */
  private getMockChannels(): ZaloChannel[] {
    this.logger.log('📋 Using mock channels for testing');

    return [
      {
        id: 1,
        name: 'Test Zalo Account 1',
        zalo_account_name: 'Test Account 1',
        cookie: [
          {
            key: 'zpsid',
            value: 'mock.zpsid.value.1',
            domain: 'zalo.me',
            path: '/',
            secure: true,
            httpOnly: true,
            maxAge: 31536000,
            creation: new Date().toISOString(),
          },
          {
            key: 'zpw_sek',
            value: 'mock.zpw.sek.value.1',
            domain: 'chat.zalo.me',
            path: '/',
            secure: true,
            httpOnly: true,
            maxAge: 7776000,
            creation: new Date().toISOString(),
          },
        ],
        imei: 'mock_imei_1',
        user_agent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        proxy: '',
        account_id: 1,
      },
      {
        id: 2,
        name: 'Test Zalo Account 2',
        zalo_account_name: 'Test Account 2',
        cookie: [
          {
            key: 'zpsid',
            value: 'mock.zpsid.value.2',
            domain: 'zalo.me',
            path: '/',
            secure: true,
            httpOnly: true,
            maxAge: 31536000,
            creation: new Date().toISOString(),
          },
          {
            key: 'zpw_sek',
            value: 'mock.zpw.sek.value.2',
            domain: 'chat.zalo.me',
            path: '/',
            secure: true,
            httpOnly: true,
            maxAge: 7776000,
            creation: new Date().toISOString(),
          },
        ],
        imei: 'mock_imei_2',
        user_agent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        proxy: '',
        account_id: 1,
      },
    ];
  }

  /**
   * Update channel login status
   */
  async updateChannelStatus(
    channelId: number,
    isConnected: boolean,
    lastLoginAt?: Date,
  ): Promise<void> {
    try {
      const chatwootUrl =
        process.env.CHATWOOT_API_URL || 'http://localhost:3000';
      const apiToken = process.env.CHATWOOT_API_TOKEN || 'internal_token';

      await fetch(`${chatwootUrl}/internal/zalo/channels/${channelId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          is_connected: isConnected,
          last_login_at: lastLoginAt?.toISOString(),
        }),
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      this.logger.log(
        `✅ Updated channel ${channelId} status: ${isConnected ? 'connected' : 'disconnected'}`,
      );
    } catch (error) {
      this.logger.warn(
        `⚠️ Failed to update channel ${channelId} status: ${error.message}`,
      );
      // Don't throw error, just log warning - service should continue working
    }
  }

  /**
   * Check if cookie is valid and not expired
   */
  private hasValidCookie(cookie: any[]): boolean {
    if (!cookie || !Array.isArray(cookie) || cookie.length === 0) {
      return false;
    }

    // Check for essential Zalo cookies
    const hasZpsid = cookie.some(
      (c) => c.key === 'zpsid' && c.value && c.value.length > 10,
    );
    const hasZpwSek = cookie.some(
      (c) => c.key === 'zpw_sek' && c.value && c.value.length > 10,
    );

    // Check if cookies are not expired (basic check)
    const now = new Date();
    const hasValidCookie = cookie.some((c) => {
      if (!c.maxAge && !c.creation) return true; // No expiration info

      if (c.maxAge) {
        const creationTime = new Date(c.creation || now);
        const expirationTime = new Date(
          creationTime.getTime() + c.maxAge * 1000,
        );
        return expirationTime > now;
      }

      return true;
    });

    return hasZpsid && hasZpwSek && hasValidCookie;
  }

  /**
   * Check if we're in development mode and should use mock data
   */
  private shouldUseMockData(): boolean {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const mockMode = process.env.ZALO_USE_MOCK_DATA === 'true';

    return nodeEnv === 'development' || nodeEnv === 'test' || mockMode;
  }
}
