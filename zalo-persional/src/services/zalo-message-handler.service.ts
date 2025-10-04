import { Injectable, Logger } from '@nestjs/common';
import { ChannelZaloPersonalService } from '../channels/services/channel-zalo-personal.service';
import { ChatwootApiService } from './chatwoot-api.service';

export interface ZaloIncomingMessage {
  senderId: string;
  threadId: string;
  content: string;
  messageId?: string;
  timestamp: Date;
  channelId: number;
  messageType?: string;
}

@Injectable()
export class ZaloMessageHandlerService {
  private readonly logger = new Logger(ZaloMessageHandlerService.name);

  constructor(
    private readonly channelService: ChannelZaloPersonalService,
    private readonly chatwootApi: ChatwootApiService,
  ) {}

  /**
   * Handle incoming message from Zalo
   * This will:
   * 1. Get the channel configuration
   * 2. Create or find contact in Chatwoot
   * 3. Create or find conversation
   * 4. Create message in conversation
   */
  async handleIncomingMessage(message: ZaloIncomingMessage): Promise<void> {
    try {
      this.logger.log(
        `Processing incoming message from Zalo user: ${message.senderId}`,
      );

      // Test Chatwoot connection first
      const connectionOk = await this.chatwootApi.testConnection();
      if (!connectionOk) {
        this.logger.error(
          'Chatwoot connection test failed. Aborting message processing.',
        );
        return;
      }
      this.logger.log('Chatwoot connection test successful');

      // 1. Get channel configuration
      const channel = await this.channelService.findOne(message.channelId);
      if (!channel) {
        this.logger.error(`Channel ${message.channelId} not found`);
        return;
      }

      // 2. Create or find contact in Chatwoot
      const contact = await this.chatwootApi.createOrFindContact(
        channel.accountId,
        undefined, // Will use default inbox ID
        message.senderId,
        {
          name: `Zalo User ${message.senderId}`,
          phone_number: message.senderId,
          additional_attributes: {
            zalo_user_id: message.senderId,
            platform: 'zalo',
            thread_id: message.threadId,
          },
        },
      );

      if (contact.error || !contact.data) {
        this.logger.error(`Failed to create contact: ${contact.error}`);
        return;
      }

      // 3. Get contact_inboxes (created automatically when contact is created with inbox_id)
      // We need to get the contact_inbox ID for creating conversation
      let contactInboxId: number;

      if (
        contact.data?.contact_inboxes &&
        contact.data.contact_inboxes.length > 0
      ) {
        contactInboxId = contact.data.contact_inboxes[0].id;
      } else {
        // Try to create contact inbox if it wasn't created automatically
        const contactInbox = await this.chatwootApi.createContactInbox(
          channel.accountId,
          contact.data.id!,
          undefined,
          message.senderId,
        );

        if (contactInbox.error || !contactInbox.data) {
          this.logger.error(
            `Failed to create contact inbox: ${contactInbox.error}`,
          );
          return;
        }

        contactInboxId = contactInbox.data.id;
      }

      // 4. Create or find conversation
      const conversation = await this.chatwootApi.createOrFindConversation(
        channel.accountId,
        undefined, // Will use default inbox ID
        contact.data.id!,
        contactInboxId,
        {
          thread_id: message.threadId,
          zalo_user_id: message.senderId,
          platform: 'zalo',
        },
      );

      if (conversation.error || !conversation.data) {
        this.logger.error(
          `Failed to create conversation: ${conversation.error}`,
        );
        return;
      }

      // 5. Create message in conversation
      const messageResult = await this.chatwootApi.createMessage(
        channel.accountId,
        conversation.data.id!,
        {
          content: message.content,
          message_type: 'incoming',
          sender_type: 'contact',
          sender: {
            id: contact.data.id!,
            type: 'Contact',
          },
          source_id: message.messageId || Date.now().toString(),
          additional_attributes: {
            zalo_message_id: message.messageId,
            zalo_thread_id: message.threadId,
            zalo_user_id: message.senderId,
            platform: 'zalo',
            timestamp: message.timestamp.toISOString(),
            message_type: message.messageType || 'text',
          },
        },
      );

      if (messageResult.error) {
        this.logger.error(`Failed to create message: ${messageResult.error}`);
      } else {
        this.logger.log(
          `Successfully processed Zalo message and created Chatwoot conversation/message`,
        );
      }
    } catch (error) {
      this.logger.error(`Error processing Zalo message:`, error);
    }
  }

  /**
   * Helper method to extract conversation ID by thread ID
   */
  async findConversationByThreadId(
    accountId: number,
    threadId: string,
  ): Promise<number | null> {
    try {
      const conversations = await this.chatwootApi.makeRequest<any[]>(
        `/accounts/${accountId}/conversations`,
      );

      if (conversations.error || !conversations.data) {
        return null;
      }

      const conversation = conversations.data.find(
        (conv) => conv.additional_attributes?.zalo_thread_id === threadId,
      );

      return conversation?.id || null;
    } catch (error) {
      this.logger.error(`Error finding conversation by thread ID:`, error);
      return null;
    }
  }

  /**
   * Method to be called when Zalo service receives a message
   * This integrates with the Zalo service message handler
   */
  async onZaloMessageReceived(messageData: any): Promise<void> {
    try {
      // Transform Zalo message format to our internal format
      const incomingMessage: ZaloIncomingMessage = {
        senderId: messageData.senderId || messageData.userId,
        threadId: messageData.threadId,
        content: messageData.content,
        messageId: messageData.id,
        timestamp: new Date(),
        channelId: messageData.channelId || 1, // Default to first channel
        messageType: messageData.messageType || 'text',
      };

      await this.handleIncomingMessage(incomingMessage);
    } catch (error) {
      this.logger.error(`Error in onZaloMessageReceived:`, error);
    }
  }
}
