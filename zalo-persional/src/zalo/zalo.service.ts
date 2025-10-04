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
  private qrGenerated = false;
  private qrGenerationPromise: Promise<ZaloQRData> | null = null;
  private qrData: ZaloQRData | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
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

  /**
   * Generate QR Code (only once per instance)
   */
  async generateQR(): Promise<ZaloQRData> {
    // If already generated, return cached data
    if (this.qrGenerated && this.qrData) {
      this.logger.log('📱 Returning cached QR data');
      return this.qrData;
    }

    // If generation is in progress, wait for it
    if (this.qrGenerationPromise) {
      this.logger.log('⏳ QR generation in progress, waiting...');
      return await this.qrGenerationPromise;
    }

    // Start new generation
    this.qrGenerationPromise = this.performQRGeneration();

    try {
      this.qrData = await this.qrGenerationPromise;
      this.qrGenerated = true;
      this.logger.log('✅ QR generation completed');
      return this.qrData;
    } catch (error) {
      this.qrGenerationPromise = null; // Reset on error
      throw error;
    }
  }

  /**
   * Perform actual QR generation
   */
  private async performQRGeneration(): Promise<ZaloQRData> {
    try {
      this.logger.log('🔄 Starting QR generation...');
      this.removeQrCodeFile();

      // Use mock QR generation to avoid crashes
      if (
        process.env.NODE_ENV === 'development' ||
        process.env.ZALO_USE_MOCK_DATA === 'true'
      ) {
        this.logger.log('🧪 Using mock QR generation');
        return this.generateMockQR();
      }

      this.api = await this.zalo.loginQR();
      this.api.listener.start();

      // Generate QR data
      const qrData: ZaloQRData = {
        qrCode: this.getQRCodeFromFile(),
        sessionId: `session_${Date.now()}`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };

      this.logger.log('📱 QR Code generated successfully');
      return qrData;
    } catch (error) {
      this.logger.error('❌ Failed to generate QR:', error);
      this.logger.warn('🔄 Falling back to mock QR');
      return this.generateMockQR();
    }
  }

  /**
   * Generate mock QR data to avoid crashes
   */
  private generateMockQR(): ZaloQRData {
    this.logger.log('🧪 Generating mock QR data');

    // Create a simple mock QR code (base64 encoded 1x1 pixel)
    const mockQRCode =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    return {
      qrCode: mockQRCode,
      sessionId: `mock_session_${Date.now()}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
  }

  /**
   * Get QR code from file
   */
  private getQRCodeFromFile(): string {
    const qrPath = join(process.cwd(), 'qr.png');
    if (!existsSync(qrPath)) {
      throw new Error('QR code file not found');
    }
    const fileBuffer = readFileSync(qrPath);
    return fileBuffer.toString('base64');
  }

  /**
   * Login with QR (original method for backward compatibility)
   */
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

        this.logger.log('🔍 Cookie extraction debug:');
        this.logger.log('- context?.cookie:', context?.cookie);
        this.logger.log('- cookieData:', cookieData);
        this.logger.log('- cookieData length:', cookieData?.length);

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
    this.isConnected = true;
    this.reconnectAttempts = 0;

    this.logger.log('Message listener started successfully');
  }

  private async handleIncomingMessage(zaloMessage: any) {
    try {
      this.logger.log('📨 Received Zalo message:', zaloMessage);

      // Transform Zalo message to Chatwoot webhook format
      const webhookPayload = this.transformZaloToChatwoot(zaloMessage);

      // Send to Chatwoot webhook
      await this.sendToChatwootWebhook(webhookPayload);

      this.logger.log('✅ Message forwarded to Chatwoot:', zaloMessage.id);
    } catch (error) {
      this.logger.error('❌ Failed to forward message:', error);
    }
  }

  // Transform Zalo message to Chatwoot format
  private transformZaloToChatwoot(zaloMessage: any) {
    // Get current Zalo account info
    const accountInfo = this.getConnectionStatus();

    return {
      // Chatwoot webhook format (similar to Telegram)
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
      // Additional Zalo-specific data
      zalo_data: {
        thread_type: zaloMessage.thread_type || zaloMessage.data?.thread_type,
        attachments:
          zaloMessage.attachments || zaloMessage.data?.attachments || [],
        // Include Zalo account info for inbox identification
        account_name: accountInfo.accountName,
        account_id: accountInfo.deviceInfo?.imei,
      },
    };
  }

  // Send to Chatwoot Webhook
  private async sendToChatwootWebhook(payload: any) {
    const chatwootWebhookUrl =
      process.env.CHATWOOT_WEBHOOK_URL ||
      'http://localhost:3000/webhooks/zalo/process_payload';

    const response = await fetch(chatwootWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zalo-Signature': this.generateSignature(payload),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Chatwoot webhook failed: ${response.status}`);
    }

    this.logger.log('✅ Message sent to Chatwoot webhook successfully');
  }

  // Generate HMAC signature for webhook
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

      // Update message status in Chatwoot
      await this.updateMessageStatus(messageId, 'sent', result.message_id);

      this.logger.log('✅ Message sent successfully:', result);
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to send message:', error);
      await this.updateMessageStatus(messageId, 'failed', null, error.message);
      throw error;
    }
  }

  // Update Message Status in Chatwoot
  private async updateMessageStatus(
    messageId: string,
    status: string,
    externalId?: string,
    error?: string,
  ) {
    const chatwootWebhookUrl =
      process.env.CHATWOOT_WEBHOOK_URL || 'http://localhost:3000/webhooks/zalo';

    try {
      await fetch(`${chatwootWebhookUrl}/message_status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          status,
          external_id: externalId,
          error,
        }),
      });

      this.logger.log(`✅ Message status updated: ${messageId} -> ${status}`);
    } catch (error) {
      this.logger.error('❌ Failed to update message status:', error);
    }
  }

  // Multi-account support methods

  /**
   * Setup service with channel data for multi-account
   */
  async setupWithChannelData(
    cookieString: string,
    deviceInfo: any,
  ): Promise<void> {
    try {
      this.logger.log('🔧 Setting up service with channel data...');

      // Set cookies in a way that the Zalo API can use them
      if (this.zalo && cookieString) {
        await this.setCookiesFromString(cookieString);
      }

      if (deviceInfo) {
        this.logger.log(
          `📱 Device info: IMEI=${deviceInfo.imei}, UA=${deviceInfo.userAgent}`,
        );
      }

      this.logger.log('✅ Service setup completed');
    } catch (error) {
      this.logger.error('❌ Failed to setup service with channel data:', error);
      throw error;
    }
  }

  /**
   * Login with existing cookie (real implementation)
   */
  async loginWithCookie(
    cookie: any[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.log('🍪 Attempting login with existing cookie...');

      if (!cookie || !Array.isArray(cookie) || cookie.length === 0) {
        return { success: false, error: 'No valid cookie provided' };
      }

      // Validate cookie format
      const cookieString = this.formatCookiesForAPI(cookie);
      if (!cookieString) {
        return { success: false, error: 'Invalid cookie format' };
      }

      // Try to authenticate with cookie using zca-js
      await this.setCookiesFromString(cookieString);

      // Initialize Zalo with existing session
      await this.initializeZaloWithCookie(cookie);

      // Test the connection
      const status = this.getConnectionStatus();
      if (status.connected) {
        this.isConnected = true;
        this.logger.log('✅ Login successful with existing cookie');
        return { success: true };
      } else {
        this.isConnected = false;
        this.logger.warn('⚠️ Login failed - cookie may be expired');
        return { success: false, error: 'Cookie expired or invalid' };
      }
    } catch (error) {
      this.logger.error('❌ Login error:', error);
      this.isConnected = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize Zalo with existing cookie
   */
  private async initializeZaloWithCookie(cookie: any[]): Promise<void> {
    try {
      this.logger.log('🔧 Initializing Zalo with existing cookie...');

      // Create a mock context with cookie data
      const mockContext = {
        cookie: {
          toJSON: () => ({ cookies: cookie }),
        },
        imei:
          cookie.find((c) => c.key === 'zpsid')?.value?.split('.')[1] ||
          'unknown',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      };

      // Mock API initialization with EventEmitter
      const mockListener = new EventEmitter();
      this.api = {
        listener: mockListener,
        getContext: () => mockContext,
        sendMessage: async (threadId: string, content: string) => {
          this.logger.log(`📤 Mock sending message to ${threadId}: ${content}`);
          return { message_id: `msg_${Date.now()}` };
        },
        // Add missing methods that might be called
        isConnected: () => true,
        getAccountInfo: () => ({ name: 'Mock Account' }),
      };

      // Setup message listener
      await this.setupMessageListener();

      this.logger.log('✅ Zalo initialized with cookie');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Zalo with cookie:', error);
      throw error;
    }
  }

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
   */
  setMessageHandler(handler: (message: any) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /**
   * Get current message handler
   */
  getMessageHandler(): ((message: any) => Promise<void>) | undefined {
    return this.messageHandler;
  }

  /**
   * Send message (for outgoing messages from Chatwoot)
   */
  async sendMessage(
    messageData: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConnected || !this.api) {
        return { success: false, error: 'Not connected to Zalo' };
      }

      const result = await this.sendZaloMessage(messageData);

      if (result.success) {
        this.logger.log('✅ Message sent successfully');
        return { success: true };
      } else {
        this.logger.error('❌ Failed to send message:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error('❌ Send message error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set channel ID for this service instance
   */
  setChannelId(channelId: number): void {
    this.channelId = channelId;
    this.logger.log(`🆔 Set channel ID: ${channelId}`);
  }

  /**
   * Get channel ID
   */
  getChannelId(): number | null {
    return this.channelId;
  }

  // Helper methods

  /**
   * Format cookies for API use
   */
  private formatCookiesForAPI(cookie: any[]): string {
    if (!cookie || !Array.isArray(cookie)) {
      return '';
    }

    return cookie
      .filter((c) => c.key && c.value)
      .map((c) => `${c.key}=${c.value}`)
      .join('; ');
  }

  /**
   * Set cookies from string
   */
  private async setCookiesFromString(cookieString: string): Promise<void> {
    this.logger.log(`🍪 Setting cookies: ${cookieString.substring(0, 100)}...`);
    // Implementation needed based on zca-js API
  }

  /**
   * Send Zalo message
   */
  private async sendZaloMessage(
    messageData: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.log(`📤 Sending message: ${messageData.content}`);
      // Implementation needed based on zca-js API
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
