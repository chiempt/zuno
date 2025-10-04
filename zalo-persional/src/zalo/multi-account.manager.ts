import { Injectable, Logger } from '@nestjs/common';
import { ZaloService } from './zalo.service';
import { DatabaseService, ZaloChannel } from '../core/database.service';

export interface ZaloAccount {
  channel: ZaloChannel;
  service: ZaloService;
  isConnected: boolean;
  lastSeen: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

@Injectable()
export class MultiAccountManager {
  private readonly logger = new Logger(MultiAccountManager.name);
  private readonly accounts = new Map<number, ZaloAccount>();
  private readonly reconnectInterval = 30000; // 30 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Initialize all Zalo accounts on startup
   */
  async initializeAllAccounts(): Promise<void> {
    try {
      this.logger.log('🚀 Initializing all Zalo accounts...');

      const channels = await this.databaseService.getAllZaloChannels();

      if (channels.length === 0) {
        this.logger.warn('⚠️ No valid Zalo channels found');
        return;
      }

      this.logger.log(
        `📱 Found ${channels.length} Zalo channels to initialize`,
      );

      // Initialize accounts concurrently (with limit)
      const batches = this.chunkArray(channels, 3); // Process 3 accounts at a time

      this.logger.log(`📦 Processing ${batches.length} batches of accounts`);

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map((channel) => this.initializeAccount(channel)),
        );

        // Small delay between batches
        if (batches.length > 1) {
          await this.sleep(2000);
        }
      }

      this.startReconnectMonitoring();

      this.logger.log(
        `✅ Initialized ${this.getConnectedCount()} connected accounts`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to initialize accounts:', error);
    }
  }

  /**
   * Initialize a single account
   */
  private async initializeAccount(channel: ZaloChannel): Promise<void> {
    try {
      this.logger.log(
        `🔍 Initializing account: ${channel.name} (${channel.zalo_account_name})`,
      );

      const service = new ZaloService();

      // Setup the service with channel data
      await this.setupServiceWithChannelData(service, channel);

      // Try to login with existing cookie
      const loginResult = await this.loginWithExistingCookie(service, channel);

      const account: ZaloAccount = {
        channel,
        service,
        isConnected: loginResult.success,
        lastSeen: new Date(),
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
      };

      this.accounts.set(channel.id, account);

      if (loginResult.success) {
        this.logger.log(`✅ Account ${channel.name} connected successfully`);
        await this.databaseService.updateChannelStatus(
          channel.id,
          true,
          new Date(),
        );

        // Start message listener
        await this.startMessageListener(account);
      } else {
        this.logger.warn(
          `⚠️ Account ${channel.name} failed to connect: ${loginResult.error}`,
        );
        await this.databaseService.updateChannelStatus(channel.id, false);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to initialize account ${channel.name}:`,
        error,
      );
    }
  }

  /**
   * Setup service with channel data
   */
  private async setupServiceWithChannelData(
    service: ZaloService,
    channel: ZaloChannel,
  ): Promise<void> {
    // Mock the service setup with channel data
    // This would need to be implemented based on your ZaloService structure
    try {
      // Set cookies
      const cookieString = this.formatCookiesForZalo(channel.cookie);

      // Set device info
      const deviceInfo = {
        imei: channel.imei,
        userAgent: channel.user_agent,
        proxy: channel.proxy,
      };

      // Mock setup - you'll need to implement this in ZaloService
      await service.setupWithChannelData(cookieString, deviceInfo);
    } catch (error) {
      this.logger.error(
        `❌ Failed to setup service for ${channel.name}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Login with existing cookie
   */
  private async loginWithExistingCookie(
    service: ZaloService,
    channel: ZaloChannel,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to authenticate with existing cookie
      const result = await service.loginWithCookie(channel.cookie);

      this.logger.log(
        `🔐 Login result for ${channel.name}: ${result.success ? 'SUCCESS' : 'FAILED'}`,
      );

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Start message listener for account
   */
  private async startMessageListener(account: ZaloAccount): Promise<void> {
    try {
      await account.service.startMessageListener();

      // Override message handler to include channel info
      const originalHandler = account.service.getMessageHandler();
      account.service.setMessageHandler(async (message: any) => {
        try {
          // Add channel info to message
          const enrichedMessage = {
            ...message,
            channel_id: account.channel.id,
            channel_name: account.channel.name,
            zalo_account_name: account.channel.zalo_account_name,
          };

          await this.handleIncomingMessage(enrichedMessage);
          account.lastSeen = new Date();
        } catch (error) {
          this.logger.error(
            `❌ Failed to handle message for ${account.channel.name}:`,
            error,
          );
        }
      });
    } catch (error) {
      this.logger.error(
        `❌ Failed to start message listener for ${account.channel.name}:`,
        error,
      );
    }
  }

  /**
   * Handle incoming message from any account
   */
  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      // Get account info
      const account = this.accounts.get(message.channel_id);
      if (!account) {
        this.logger.warn(
          `⚠️ No account found for channel ${message.channel_id}`,
        );
        return;
      }

      // Transform and send to Chatwoot via webhook
      await this.sendToChatwootWebhook(message);
    } catch (error) {
      this.logger.error('❌ Failed to handle incoming message:', error);
    }
  }

  /**
   * Send message to Chatwoot webhook
   */
  private async sendToChatwootWebhook(message: any): Promise<void> {
    try {
      const chatwootWebhookUrl =
        process.env.CHATWOOT_WEBHOOK_URL ||
        'http://localhost:3000/webhooks/zalo';

      // Transform message to Chatwoot format
      const chatwootMessage = this.transformZaloToChatwoot(message);

      // Generate signature
      const signature = this.generateSignature(chatwootMessage);

      const response = await fetch(`${chatwootWebhookUrl}/process_payload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zalo-Signature': signature,
        },
        body: JSON.stringify(chatwootMessage),
      });

      if (!response.ok) {
        throw new Error(`Chatwoot webhook failed: ${response.status}`);
      }

      this.logger.log('✅ Message sent being to Chatwoot');
    } catch (error) {
      this.logger.error('❌ Failed to send message to Chatwoot:', error);
      throw error;
    }
  }

  /**
   * Transform Zalo message to Chatwoot format
   */
  private transformZaloToChatwoot(zaloMessage: any) {
    return {
      message: {
        id: zaloMessage.id,
        content: zaloMessage.content || zaloMessage.data?.content,
        message_type: 'incoming',
        sender: {
          id: zaloMessage.sender_id || zaloMessage.data?.sender_id,
          name: zaloMessage.sender_name || zaloMessage.data?.sender_name,
          avatar: zaloMessage.sender_avatar || zaloMessage.data?.sender_avatar,
          phone_number:
            zaloMessage.sender_phone || zaloMessage.data?.sender_phone,
        },
        thread_id: zaloMessage.thread_id || zaloMessage.data?.thread_id,
        created_at:
          zaloMessage.timestamp ||
          zaloMessage.data?.timestamp ||
          new Date().toISOString(),
      },
      zalo_data: {
        thread_type: zaloMessage.thread_type || zaloMessage.data?.thread_type,
        attachments:
          zaloMessage.attachments || zaloMessage.data?.attachments || [],
        account_name: zaloMessage.zalo_account_name,
        account_id: zaloMessage.channel_id,
      },
    };
  }

  /**
   * Generate HMAC signature for webhook
   */
  private generateSignature(payload: any): string {
    const crypto = require('crypto');
    const secret =
      process.env.ZALO_WEBHOOK_SECRET || 'default_secret_for_development';
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Send message from Chatwoot to specific Zalo account
   */
  async sendMessage(
    channelId: number,
    messageData: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const account = this.accounts.get(channelId);
      if (!account || !account.isConnected) {
        return { success: false, error: `Account ${channelId} not connected` };
      }

      const result = await account.service.sendMessage(messageData);

      if (result.success) {
        account.lastSeen = new Date();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Start reconnect monitoring
   */
  private startReconnectMonitoring(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
    }

    this.reconnectTimer = setInterval(async () => {
      await this.checkAndReconnectAccounts();
    }, this.reconnectInterval);

    this.logger.log('🔄 Started reconnect monitoring');
  }

  /**
   * Check and reconnect disconnected accounts
   */
  private async checkAndReconnectAccounts(): Promise<void> {
    for (const [channelId, account] of this.accounts.entries()) {
      if (
        !account.isConnected &&
        account.reconnectAttempts < account.maxReconnectAttempts
      ) {
        this.logger.log(
          `🔄 Attempting to reconnect ${account.channel.name} (attempt ${account.reconnectAttempts + 1})`,
        );

        try {
          const result = await this.loginWithExistingCookie(
            account.service,
            account.channel,
          );

          if (result.success) {
            account.isConnected = true;
            account.reconnectAttempts = 0;
            await this.startMessageListener(account);
            await this.databaseService.updateChannelStatus(channelId, true);
            this.logger.log(`✅ Reconnected ${account.channel.name}`);
          } else {
            account.reconnectAttempts++;
            this.logger.warn(
              `⚠️ Reconnect failed for ${account.channel.name}: ${result.error}`,
            );
          }
        } catch (error) {
          account.reconnectAttempts++;
          this.logger.error(
            `❌ Reconnect error for ${account.channel.name}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Format cookies for Zalo API
   */
  private formatCookiesForZalo(cookie: any[]): string {
    if (!cookie || !Array.isArray(cookie)) {
      return '';
    }

    return cookie
      .filter((c) => c.key && c.value)
      .map((c) => `${c.key}=${c.value}`)
      .join('; ');
  }

  /**
   * Get connected accounts count
   */
  getConnectedCount(): number {
    return Array.from(this.accounts.values()).filter(
      (account) => account.isConnected,
    ).length;
  }

  /**
   * Get all accounts status
   */
  getAllAccountsStatus(): Array<{
    channel: ZaloChannel;
    isConnected: boolean;
    lastSeen: Date;
  }> {
    return Array.from(this.accounts.values()).map((account) => ({
      channel: account.channel,
      isConnected: account.isConnected,
      lastSeen: account.lastSeen,
    }));
  }

  /**
   * Utility methods
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.log('🔄 Shutting down MultiAccountManager...');

    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Disconnect all accounts
    for (const account of this.accounts.values()) {
      try {
        if (account.isConnected) {
          await this.databaseService.updateChannelStatus(
            account.channel.id,
            false,
          );
        }
      } catch (error) {
        this.logger.error(
          `❌ Error disconnecting ${account.channel.name}:`,
          error,
        );
      }
    }

    this.accounts.clear();
    this.logger.log('✅ MultiAccountManager shutdown complete');
  }
}
