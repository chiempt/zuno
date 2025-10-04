import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { AppService } from './app.service';

@Injectable()
export class BootstrapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly appService: AppService) {}

  async onModuleInit() {
    this.logger.log('🚀 BootstrapService: Starting initialization...');
    
    // Initialize multi-account after module init
    setTimeout(async () => {
      try {
        await this.appService.initializeAccounts();
      } catch (error) {
        this.logger.error('❌ BootstrapService: Failed to initialize accounts:', error.message);
        this.logger.warn('⚠️ Service will continue with limited functionality');
      }
    }, 2000); // Small delay to ensure all modules are ready
  }

  async onModuleDestroy() {
    await this.appService.shutdownAccounts();
  }
}
