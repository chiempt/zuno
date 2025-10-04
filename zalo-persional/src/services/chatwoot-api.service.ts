import { Injectable, Logger } from '@nestjs/common';

export interface ChatwootContactInbox {
  id: number;
  contact_id: number;
  inbox_id: number;
  source_id: string;
}

export interface ChatwootContact {
  id?: number;
  name?: string;
  email?: string;
  phone_number?: string;
  identifier?: string;
  additional_attributes?: any;
  custom_attributes?: any;
  contact_inboxes?: ChatwootContactInbox[];
}

export interface ChatwootConversation {
  id?: number;
  account_id: number;
  inbox_id: number;
  contact_id: number;
  contact_inbox_id: number;
  status?: 'open' | 'resolved';
  additional_attributes?: any;
  custom_attributes?: any;
}

export interface ChatwootMessage {
  content: string;
  message_type: 'incoming' | 'outgoing';
  sender_type: 'contact' | 'user' | 'agent_bot';
  sender?: {
    id: number;
    type: 'Contact';
  };
  source_id?: string;
  additional_attributes?: any;
}

export interface ChatwootApiResponse<T = any> {
  data?: T;
  error?: string;
  meta?: any;
}

@Injectable()
export class ChatwootApiService {
  private readonly logger = new Logger(ChatwootApiService.name);
  private readonly baseUrl =
    process.env.CHATWOOT_API_URL || 'http://localhost:3000/api/v1';
  private readonly accessToken = 'yz88eFumuSmYGrGefsVs9bEe'; // Admin token provided by user

  // Account and inbox configuration
  private readonly defaultAccountId = parseInt(
    process.env.CHATWOOT_ACCOUNT_ID || '1',
  );
  private readonly defaultInboxId = parseInt(
    process.env.CHATWOOT_INBOX_ID || '24',
  ); // From curl example

  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ChatwootApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'access-token': this.accessToken,
      api_access_token: this.accessToken,
      ...options.headers,
    };

    this.logger.log(`Making request to: ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Check content type first
      const contentType = response.headers.get('content-type');
      this.logger.log(`Response content-type: ${contentType}`);
      this.logger.log(`Response status: ${response.status}`);

      if (!response.ok) {
        // Try to get text response first to see what's wrong
        const errorText = await response.text();
        this.logger.error(`API Error: ${response.status}`);
        this.logger.error(`Error Response: ${errorText.substring(0, 500)}`);
        return {
          error: `API Error: ${response.status} - ${errorText.substring(0, 100)}`,
        };
      }

      // Only parse as JSON if content type is JSON
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return { data };
      } else {
        const textData = await response.text();
        this.logger.error(`Non-JSON response: ${textData.substring(0, 500)}`);
        return { error: 'Non-JSON response received' };
      }
    } catch (error) {
      this.logger.error(`Network Error:`, error);
      return { error: 'Network Error' };
    }
  }

  /**
   * Create or find contact for Zalo user
   */
  async createOrFindContact(
    accountId: number = this.defaultAccountId,
    inboxId: number = this.defaultInboxId,
    zaloUserId: string,
    contactInfo: Partial<ChatwootContact> = {},
  ): Promise<ChatwootApiResponse<ChatwootContact>> {
    const contact = await this.makeRequest<ChatwootContact>(
      `/accounts/${accountId}/contacts`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: contactInfo.name || `Zalo User ${zaloUserId}`,
          phone_number: contactInfo.phone_number || zaloUserId,
          identifier: zaloUserId,
          inbox_id: inboxId,
          source_id: zaloUserId,
          additional_attributes: {
            zalo_user_id: zaloUserId,
            platform: 'zalo',
            ...contactInfo.additional_attributes,
          },
          custom_attributes: {
            ...contactInfo.custom_attributes,
          },
        }),
      },
    );

    if (!contact.error) {
      this.logger.log(`Created/found contact: ${contact.data?.id}`);
    }

    return contact;
  }

  /**
   * Create contact inbox for the contact
   */
  async createContactInbox(
    accountId: number = this.defaultAccountId,
    contactId: number,
    inboxId: number = this.defaultInboxId,
    sourceId: string,
  ): Promise<ChatwootApiResponse<any>> {
    return this.makeRequest(
      `/accounts/${accountId}/contacts/${contactId}/contact_inboxes`,
      {
        method: 'POST',
        body: JSON.stringify({
          inbox_id: inboxId,
          source_id: sourceId,
        }),
      },
    );
  }

  /**
   * Create or find conversation
   */
  async createOrFindConversation(
    accountId: number = this.defaultAccountId,
    inboxId: number = this.defaultInboxId,
    contactId: number,
    contactInboxId: number,
    additionalAttributes?: any,
  ): Promise<ChatwootApiResponse<ChatwootConversation>> {
    // First try to find existing conversation
    const existingConvs = await this.makeRequest<any[]>(
      `/accounts/${accountId}/conversations`,
      {
        method: 'GET',
      },
    );

    // Find conversation for this contact inbox
    let conversation: ChatwootConversation | undefined;
    if (!existingConvs.error && existingConvs.data) {
      conversation = existingConvs.data.find(
        (conv: any) =>
          conv.contact_inbox_id === contactInboxId &&
          conv.status !== 'resolved',
      );
    }

    // If no conversation found, create new one using conversation creation endpoint
    if (!conversation) {
      const newConv = await this.makeRequest<ChatwootConversation>(
        `/accounts/${accountId}/conversations`,
        {
          method: 'POST',
          body: JSON.stringify({
            inbox_id: inboxId,
            contact_id: contactId,
            source_id: additionalAttributes?.thread_id || Date.now().toString(),
            status: 'open',
          }),
        },
      );

      if (!newConv.error) {
        this.logger.log(`Created new conversation: ${newConv.data?.id}`);
        return newConv;
      }
      return newConv;
    }

    this.logger.log(`Found existing conversation: ${conversation.id}`);
    return { data: conversation };
  }

  /**
   * Create message in conversation
   */
  async createMessage(
    accountId: number,
    conversationId: number,
    message: ChatwootMessage,
  ): Promise<ChatwootApiResponse<any>> {
    const result = await this.makeRequest(
      `/accounts/${accountId}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(message),
      },
    );

    if (!result.error) {
      this.logger.log(`Created message in conversation ${conversationId}`);
    }

    return result;
  }

  /**
   * Get inbox by channel
   */
  async getInboxByChannel(
    channelId: number,
  ): Promise<ChatwootApiResponse<any>> {
    return this.makeRequest(`/accounts/inboxes?channel_id=${channelId}`);
  }

  /**
   * Test authentication with simple endpoint
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try simple endpoint first
      const response = await this.makeRequest(`/accounts`);
      this.logger.log(`Authentication test: ${JSON.stringify(response)}`);
      return !response.error;
    } catch (error) {
      this.logger.error(`Connection test failed:`, error);
      return false;
    }
  }
}
