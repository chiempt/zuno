import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ZaloService } from './zalo/zalo.service';
@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly zaloService: ZaloService) {}

  async onModuleInit() {
    // Set up message forwarding from Zalo to Chatwoot
    this.zaloService.on('message', async (zaloMessage) => {
      this.logger.log('Forwarding Zalo message to Chatwoot:', {
        messageId: zaloMessage.id,
        senderId: zaloMessage.senderId,
        threadId: zaloMessage.threadId,
      });
    });

    this.logger.log(
      'App service initialized with Zalo and Chatwoot integration',
    );
  }

  getHello(): string {
    return 'Zalo Personal Service - Internal API with Chatwoot Integration';
  }

 
  async getQrcode(body: any): Promise<object> {
    this.logger.log('Getting QR code', { body });

    try {
      const qrData = await this.zaloService.loginQR();

      return {
        status: 'generated',
        timestamp: new Date().toISOString(),
        message: 'QR code generated successfully',
        data: qrData,
      };
    } catch (error) {
      this.logger.error('QR code generation error:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'QR code generation failed',
        error: error.message,
      };
    }
  }

  getConnectionStatus(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      data: 1,
    };
  }
}
