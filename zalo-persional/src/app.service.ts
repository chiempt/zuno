import { Injectable, Logger } from '@nestjs/common';
import { ChannelZaloPersonalService } from './channels/services/channel-zalo-personal.service';
import { ZaloService } from './zalo/zalo.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly channelZaloPersonalService: ChannelZaloPersonalService;
  private readonly zaloService: ZaloService;

  constructor(
    channelZaloPersonalService: ChannelZaloPersonalService,
    zaloService: ZaloService,
  ) {
    this.channelZaloPersonalService = channelZaloPersonalService;
    this.zaloService = zaloService;
  }

  getHello(): string {
    return 'Hello from Zalo Multi-Account Service!';
  }

  /**
   * Initialize all accounts (call this manually)
   */
  async initializeAccounts() {
    try {
      const accounts =
        await this.channelZaloPersonalService.getAllZaloInActiveAccount();
      for (const account of accounts) {
        this.logger.log(`🔍 Initializing account: ${account.id}`);
        await this.zaloService.loginWithCredentials(account);
      }

      this.logger.log('🔍 Initializing all accounts...');
    } catch (error) {
      this.logger.error('❌ Failed to initialize accounts:', error);
    }
  }
}
