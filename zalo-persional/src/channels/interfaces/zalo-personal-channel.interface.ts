export interface ZaloPersonalChannelConfig {
  name: string;
  zaloAccountName: string;
  imei: string;
  userAgent: string;
  proxy?: string;
  credentials?: {
    cookie?: any[];
    [key: string]: any;
  };
}

export interface ZaloPersonalCredentials {
  cookie?: any[];
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  [key: string]: any;
}

export interface ZaloConnectionStatus {
  isConnected: boolean;
  connectionStatus: string;
  lastLoginAt?: Date;
  qrCode?: string;
}

export interface ZaloMessageData {
  threadId: string;
  zaloUserId: string;
  content: string;
  messageId?: string;
  messageType?: 'text' | 'image' | 'file' | 'audio' | 'video';
}

export interface ZaloMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  data?: any;
}

export interface ZaloWebhookData {
  event: string;
  data: any;
  timestamp: Date;
  channelId: number;
}

export interface ZaloSendMessageRequest {
  channelId: number;
  threadId: string;
  content: string;
  messageType?: string;
}

export interface ZaloPersonalChannelEditableAttrs {
  name?: string;
  zaloAccountName?: string;
  imei?: string;
  userAgent?: string;
  proxy?: string;
  qrCode?: string;
  isConnected?: boolean;
  lastLoginAt?: Date;
  connectionStatus?: string;
  credentials?: ZaloPersonalCredentials;
}
