// Simple DTO interfaces without validation decorators

export interface CreateChannelZaloPersonalDto {
  name: string;
  zaloAccountName: string;
  imei?: string;
  userAgent?: string;
  proxy?: string;
  qrCode?: string;
  isConnected?: boolean;
  lastLoginAt?: Date;
  connectionStatus?: string;
  credentials?: any;
  accountId: number;
}

export interface UpdateChannelZaloPersonalDto {
  name?: string;
  zaloAccountName?: string;
  imei?: string;
  userAgent?: string;
  proxy?: string;
  qrCode?: string;
  isConnected?: boolean;
  lastLoginAt?: Date;
  connectionStatus?: string;
  credentials?: any;
  accountId?: number;
}

export interface ChannelZaloPersonalResponseDto {
  id: number;
  name: string;
  zaloAccountName: string;
  imei?: string;
  userAgent?: string;
  proxy?: string;
  qrCode?: string;
  isConnected?: boolean;
  lastLoginAt?: Date;
  connectionStatus?: string;
  credentials?: any;
  accountId: number;
  createdAt: Date;
  updatedAt: Date;
  displayName?: string;
}
