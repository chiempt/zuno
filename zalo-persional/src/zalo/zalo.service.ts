import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Zalo, ThreadType, Credentials } from 'zca-js';
import { EventEmitter } from 'events';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface ZaloMessage {
  id: string;
  type: ThreadType;
  content: string;
  senderId: string;
  threadId: string;
  timestamp: Date;
  isPlainText: boolean;
}

export interface ZaloQRData {
  qrCode: string;
  sessionId: string;
  expiresAt: Date;
}

@Injectable()
export class ZaloService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ZaloService.name);
  private zalo: Zalo;
  private api: any;
  private isConnected = false;
  private qrData: ZaloQRData | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async onModuleInit() {
    this.logger.log('Initializing Zalo Service...');
    await this.initializeZalo();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Zalo Service...');
  }

  private async initializeZalo() {
    try {
      this.zalo = new Zalo();
      this.logger.log('Zalo instance created');
    } catch (error) {
      this.logger.error('Failed to initialize Zalo:', error);
      throw error;
    }
  }

  async loginQR(): Promise<Credentials> {
    try {
      this.logger.log('Starting QR login process...');

      this.api = await this.zalo.loginQR();

      const credentials: Credentials = {
        imei: '',
        userAgent: '',
        cookie: [],
      };

      this.logger.log('QR code generated successfully');

      // Set up message listener
      this.setupMessageListener();

      const context = this.api.getContext();

      credentials.imei = context.imei;
      credentials.userAgent = context.userAgent;
      credentials.cookie = context.cookie.toJSON()?.cookies;

      // Delete qr.png file after QR code is generated, if it exists
      const qrPath = join(process.cwd(), 'qr.png');
      if (existsSync(qrPath)) {
        try {
          unlinkSync(qrPath);
          this.logger.log('qr.png file deleted after QR code generation');
        } catch (err) {
          this.logger.warn('Failed to delete qr.png file:', err);
        }
      }

      return credentials;
    } catch (error) {
      this.logger.error('Failed to login with QR:', error);
      throw error;
    }
  }

  getQRCodeBase64(): string | null {
    const qrPath = join(process.cwd(), 'qr.png');
    if (!existsSync(qrPath)) return null;
    const fileBuffer = readFileSync(qrPath);
    return fileBuffer.toString('base64');
  }

  private setupMessageListener() {
    if (!this.api || !this.api.listener) {
      this.logger.warn('API or listener not available');
      return;
    }

    this.api.listener.on('message', (message: any) => {
      this.handleIncomingMessage(message);
    });

    this.api.listener.on('error', (error: any) => {
      this.logger.error('Zalo listener error:', error);
    });

    this.api.listener.on('disconnect', () => {
      this.logger.warn('Zalo listener disconnected');
      this.isConnected = false;
    });

    // Start the listener
    this.api.listener.start();
    this.isConnected = true;
    this.reconnectAttempts = 0;

    this.logger.log('Message listener started successfully');
  }

  private handleIncomingMessage(message: any) {
    try {
      const isPlainText = typeof message.data.content === 'string';

      switch (message.type) {
        case ThreadType.User:
          break;
        case ThreadType.Group:
          break;
        default:
          this.logger.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
    }
  }
}
