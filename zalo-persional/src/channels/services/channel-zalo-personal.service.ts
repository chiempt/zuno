import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelZaloPersonal } from '../entities/channel-zalo-personal.entity';
import {
  CreateChannelZaloPersonalDto,
  UpdateChannelZaloPersonalDto,
} from '../dto/channel-zalo-personal.dto';

@Injectable()
export class ChannelZaloPersonalService {
  constructor(
    @InjectRepository(ChannelZaloPersonal)
    private readonly channelZaloPersonalRepository: Repository<ChannelZaloPersonal>,
  ) {}

  async create(
    createDto: CreateChannelZaloPersonalDto,
  ): Promise<ChannelZaloPersonal> {
    try {
      const channel = this.channelZaloPersonalRepository.create(createDto);
      return await this.channelZaloPersonalRepository.save(channel);
    } catch (error) {
      throw new BadRequestException(
        'Failed to create Zalo Personal channel',
        error.message,
      );
    }
  }

  async findAll(accountId?: number): Promise<ChannelZaloPersonal[]> {
    const queryBuilder =
      this.channelZaloPersonalRepository.createQueryBuilder('channel');

    if (accountId) {
      queryBuilder.where('channel.accountId = :accountId', { accountId });
    }

    return await queryBuilder.getMany();
  }

  async getAllZaloInActiveAccount(): Promise<ChannelZaloPersonal[]> {
    const queryBuilder =
      this.channelZaloPersonalRepository.createQueryBuilder('channel');

    // Find channels where cookie is a non-empty array (jsonb type, default [])
    queryBuilder.where('jsonb_array_length(channel.cookie) > 0');

    return await queryBuilder.getMany();
  }

  async findOne(id: number): Promise<ChannelZaloPersonal> {
    const channel = await this.channelZaloPersonalRepository.findOne({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException(
        `Zalo Personal channel with ID ${id} not found`,
      );
    }

    return channel;
  }

  async findByAccountId(accountId: number): Promise<ChannelZaloPersonal[]> {
    return await this.channelZaloPersonalRepository.find({
      where: { accountId },
    });
  }

  async update(
    id: number,
    updateDto: UpdateChannelZaloPersonalDto,
  ): Promise<ChannelZaloPersonal> {
    const channel = await this.findOne(id);

    Object.assign(channel, updateDto);

    try {
      return await this.channelZaloPersonalRepository.save(channel);
    } catch (error) {
      throw new BadRequestException(
        'Failed to update Zalo Personal channel',
        error.message,
      );
    }
  }

  async remove(id: number): Promise<void> {
    const channel = await this.findOne(id);

    try {
      await this.channelZaloPersonalRepository.remove(channel);
    } catch (error) {
      throw new BadRequestException(
        'Failed to delete Zalo Personal channel',
        error.message,
      );
    }
  }

  async updateConnectionStatus(
    id: number,
    isConnected: boolean,
    connectionStatus?: string,
  ): Promise<ChannelZaloPersonal> {
    const updateData: UpdateChannelZaloPersonalDto = {
      isConnected,
      connectionStatus,
      lastLoginAt: isConnected ? new Date() : undefined,
    };

    return await this.update(id, updateData);
  }

  async updateCredentials(
    id: number,
    credentials: any,
  ): Promise<ChannelZaloPersonal> {
    const updateData: UpdateChannelZaloPersonalDto = {
      credentials,
    };

    return await this.update(id, updateData);
  }

  async updateQrCode(id: number, qrCode: string): Promise<ChannelZaloPersonal> {
    const updateData: UpdateChannelZaloPersonalDto = {
      qrCode,
    };

    return await this.update(id, updateData);
  }

  // Business logic methods
  async sendMessage(channelId: number, messageData: any): Promise<any> {
    const channel = await this.findOne(channelId);

    // Implement message sending logic here
    // This would integrate with Chatwoot's message service
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      channelId: channel.id,
    };
  }

  async extractThreadId(conversationAttributes: any): Promise<string | null> {
    return conversationAttributes?.['zalo_thread_id'] || null;
  }

  async extractZaloUserId(conversationAttributes: any): Promise<string | null> {
    return conversationAttributes?.['zalo_user_id'] || null;
  }
}
