import { Injectable, Logger } from '@nestjs/common';
import { MultiAccountManager } from './zalo/multi-account.manager';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly multiAccountManager: MultiAccountManager) {}

  getHello(): string {
    return 'Hello from Zalo Multi-Account Service!';
  }

  /**
   * Initialize all accounts (call this manually)
   */
  async initializeAccounts() {
    this.logger.log('🚀 Initializing Zalo Multi-Account Service...');

    try {
      await this.multiAccountManager.initializeAllAccounts();
      this.logger.log('✅ Multi-Account initialization completed');
    } catch (error) {
      this.logger.error('❌ Failed to initialize multi-account:', error);
    }
  }

  /**
   * Shutdown all accounts
   */
  async shutdownAccounts() {
    this.logger.log('🔄 Shutting down Multi-Account Service...');
    await this.multiAccountManager.shutdown();
  }

  /**
   * Get all accounts status
   */
  getAccountsStatus() {
    return this.multiAccountManager.getAllAccountsStatus();
  }

  /**
   * Get connected accounts count
   */
  getConnectedCount(): number {
    return this.multiAccountManager.getConnectedCount();
  }

  /**
   * Send message to specific channel
   */
  async sendMessage(channelId: number, messageData: any) {
    return await this.multiAccountManager.sendMessage(channelId, messageData);
  }
}
