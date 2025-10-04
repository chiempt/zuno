import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Zalo, ThreadType, Credentials } from 'zca-js';
import { EventEmitter } from 'events';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
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
  private qrGenerated = false;
  private qrGenerationPromise: Promise<ZaloQRData> | null = null;
  private qrData: ZaloQRData | null = null;
  private channelId: number | null = null;
  private messageHandler?: (message: any) => Promise<void>;

  async onModuleInit() {
    this.logger.log('Initializing Zalo Service...');
    await this.initializeZalo();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Zalo Service...');
    this.isConnected = false;
  }

  private async initializeZalo() {
    try {
      this.zalo = new Zalo({
        selfListen: true,
        logging: true,
        polyfill: fetch,
      });
      this.logger.log('Zalo instance created');
    } catch (error) {
      this.logger.error('Failed to initialize Zalo:', error);
      throw error;
    }
  }

  private removeQrCodeFile() {
    const qrPath = join(process.cwd(), 'qr.png');
    if (existsSync(qrPath)) {
      unlinkSync(qrPath);
    }
  }

  async loginQR(): Promise<Credentials> {
    try {
      this.logger.log('Starting QR login process...');
      this.removeQrCodeFile();
      this.api = await this.zalo.loginQR();

      const credentials: Credentials = {
        imei: '',
        userAgent: '',
        cookie: [],
      };

      this.logger.log('QR code generated successfully');

      this.api.listener.start();

      // Set up message listener
      this.setupMessageListener();

      const context = this.api.getContext();
      credentials.imei = context.imei || '';
      credentials.userAgent =
        context.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';
      credentials.cookie = context.cookie?.toJSON()?.cookies || [];

      // Log credentials safely
      this.logger.log('IMEI:', credentials.imei);
      this.logger.log('UserAgent:', credentials.userAgent);

      try {
        // Create a deep clone to avoid circular references
        const safeCredentials = {
          imei: credentials.imei,
          userAgent: credentials.userAgent,
          cookie: credentials.cookie
            ? JSON.parse(JSON.stringify(credentials.cookie))
            : [],
        };

        writeFileSync(
          join(process.cwd(), 'credentials.json'),
          JSON.stringify(safeCredentials, null, 2),
        );
        this.logger.log('✅ Credentials saved successfully');
      } catch (error) {
        this.logger.error('❌ Failed to save credentials:', error);
        // Try to save without cookies if there's an issue
        try {
          const fallbackCredentials = {
            imei: credentials.imei,
            userAgent: credentials.userAgent,
            cookie: [],
          };
          writeFileSync(
            join(process.cwd(), 'credentials.json'),
            JSON.stringify(fallbackCredentials, null, 2),
          );
          this.logger.log('⚠️ Credentials saved without cookie data');
        } catch (fallbackError) {
          this.logger.error(
            '❌ Complete failure to save credentials:',
            fallbackError,
          );
        }
      }

      // Mark as connected
      this.isConnected = true;

      // Delete qr.png file after QR code is generated, if it exists
      this.removeQrCodeFile();

      return credentials;
    } catch (error) {
      this.logger.error('Failed to login with QR:', error);
      throw error;
    }
  }

  /**
   * Set channel ID for message routing
   */
  setChannelId(channelId: number): void {
    this.channelId = channelId;
    this.logger.log(`Channel ID set to: ${channelId}`);
  }

  /**
   * Get channel ID
   */
  getChannelId(): number | null {
    return this.channelId;
  }

  /**
   * Login with existing credentials (cookie-based login)
   */
  async loginWithCredentials(credentials: Credentials): Promise<any> {
    try {
      this.logger.log('Starting login with existing credentials...');

      // Use the login method from zca-js
      this.api = await this.zalo.login(credentials);

      if (this.api) {
        this.isConnected = true;
        this.logger.log('✅ Successfully logged in with existing credentials');
        return this.api;
      } else {
        throw new Error('Login failed - no API instance returned');
      }
    } catch (error) {
      this.logger.error('Failed to login with credentials:', error);
      this.isConnected = false;
      throw error;
    }
  }

  getQRCodeBase64(): string | null {
    const qrPath = join(process.cwd(), 'qr.png');
    if (!existsSync(qrPath)) return null;
    const fileBuffer = readFileSync(qrPath);
    return fileBuffer.toString('base64');
  }

  getConnectionStatus(): {
    connected: boolean;
    credentials: Credentials | null;
    accountName: string | null;
    deviceInfo: any;
  } {
    let credentials: Credentials | null = null;
    let accountName: string | null = null;
    let deviceInfo: any = null;

    if (this.isConnected && this.api) {
      try {
        const context = this.api.getContext();
        // Get cookie data safely
        let cookieData = [];
        try {
          if (context?.cookie?.toJSON?.()?.cookies) {
            cookieData = context.cookie.toJSON().cookies;
          } else if (context?.cookie?.cookies) {
            cookieData = context.cookie.cookies;
          } else if (Array.isArray(context?.cookie)) {
            cookieData = context.cookie;
          }
        } catch (error) {
          this.logger.warn('Failed to extract cookie data:', error);
        }

        credentials = {
          imei: context?.imei || '',
          userAgent:
            context?.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
          cookie: cookieData,
        };

        // Try to get account name from context
        accountName =
          context?.accountName || context?.displayName || 'Zalo Account';

        deviceInfo = {
          imei: context?.imei,
          userAgent: context?.userAgent,
          deviceInfo: context?.deviceInfo,
        };
      } catch (error) {
        this.logger.warn('Failed to get context:', error);
      }
    }

    return {
      connected: this.isConnected,
      credentials,
      accountName,
      deviceInfo,
    };
  }

  private async setupMessageListener(): Promise<void> {
    this.logger.log('Setting up message listener');
    if (!this.api || !this.api.listener) {
      this.logger.warn('API or listener not available');
      return;
    }

    this.api.listener.on('message', (message: any) => {
      this.logger.log('Received message:', message);
    });

    this.api.listener.on('error', (error: any) => {
      this.logger.error('Zalo listener error:', error);
    });

    this.api.listener.on('disconnect', () => {
      this.logger.warn('Zalo listener disconnected');
      this.isConnected = false;
    });

    // Start the listener
    this.isConnected = true;

    this.logger.log('Message listener started successfully');
  }

  // Generate HMAC signature for webhook
  // Send Outgoing Messages (from Chatwoot to Zalo)
  async sendZaloMessageToThread(
    threadId: string,
    content: string,
    messageId: string,
  ) {
    try {
      this.logger.log(
        `📤 Sending message to Zalo thread ${threadId}:`,
        content,
      );

      const result = await this.api.sendMessage(threadId, content);

      this.logger.log('✅ Message sent successfully:', result);
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Initialize Zalo with existing cookie
   */
  /**
   * Start message listener
   */
  async startMessageListener(): Promise<void> {
    try {
      this.logger.log('👂 Starting message listener...');

      if (!this.isConnected) {
        throw new Error('Not connected to Zalo');
      }

      await this.setupMessageListener();
      this.logger.log('✅ Message listener started');
    } catch (error) {
      this.logger.error('❌ Failed to start message listener:', error);
      throw error;
    }
  }

  /**
   * Set message handler (overrides the default one)
  /**
   * Get current message handler
   */
}
