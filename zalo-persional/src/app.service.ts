import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    return 'Hello from Zalo Multi-Account Service!';
  }

  /**
   * Initialize all accounts (call this manually)
   */
  async initializeAccounts() {
    try {
      this.logger.log('🔍 Initializing all accounts...');
    } catch (error) {
      this.logger.error('❌ Failed to initialize accounts:', error);
    }
  }
}
