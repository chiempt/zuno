import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppService } from './app.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);
  private readonly appService: AppService;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    appService: AppService,
  ) {
    this.appService = appService;
  }

  async onModuleInit(): Promise<void> {
    try {
      // Setup global error handlers
      this.setupGlobalErrorHandlers();

      // Setup application lifecycle events
      this.setupLifecycleEvents();

      // Initialize accounts
      await this.appService.initializeAccounts();

      //

      this.logger.log('✅ Bootstrap completed successfully');
    } catch (error) {
      this.logger.error('❌ Bootstrap failed:', error);
      throw error;
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('🚨 Uncaught Exception:', error);
      this.eventEmitter.emit('app.critical.error', { error, type: 'uncaught' });
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error(
        '🚨 Unhandled Rejection at:',
        promise,
        'reason:',
        reason,
      );
      this.eventEmitter.emit('app.critical.error', {
        error: reason,
        type: 'unhandled_rejection',
      });
    });

    // Handle SIGTERM for graceful shutdown
    process.on('SIGTERM', async () => {
      this.logger.log('📤 SIGTERM received, shutting down gracefully...');
      await this.handleGracefulShutdown();
    });

    // Handle SIGINT for graceful shutdown
    process.on('SIGINT', async () => {
      this.logger.log('📤 SIGINT received, shutting down gracefully...');
      await this.handleGracefulShutdown();
    });
  }

  private setupLifecycleEvents(): void {
    // Account manager events
    this.eventEmitter.on('zalo.account.connected', (event) => {
      this.logger.log(`✅ Account ${event.accountId} connected successfully`);
    });

    this.eventEmitter.on('zalo.account.disconnected', (event) => {
      this.logger.warn(`🔌 Account ${event.accountId} disconnected`);
    });

    this.eventEmitter.on('zalo.account.error', (event) => {
      this.logger.error(`❌ Account ${event.accountId} error:`, event.error);
    });

    // Critical application errors
    this.eventEmitter.on('app.critical.error', (event) => {
      this.logger.error('🚨 Critical application error:', event);
      // Here you could add alerting, crash reporting, etc.
    });

    // Health check events
    this.eventEmitter.on('app.health.check', (data) => {
      this.logger.debug('Health check:', data);
    });
  }

  private async handleGracefulShutdown(): Promise<void> {
    try {
      this.logger.log('🔄 Starting graceful shutdown...');

      // Here you could add any cleanup logic
      // The AccountManager will handle its own cleanup via onModuleDestroy

      this.logger.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('❌ Graceful shutdown failed:', error);
      process.exit(1);
    }
  }
}
