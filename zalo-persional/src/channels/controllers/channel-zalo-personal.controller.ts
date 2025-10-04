import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ChannelZaloPersonalService } from '../services/channel-zalo-personal.service';
import {
  CreateChannelZaloPersonalDto,
  UpdateChannelZaloPersonalDto,
  ChannelZaloPersonalResponseDto,
} from '../dto/channel-zalo-personal.dto';

@Controller('channels/zalo-personal')
export class ChannelZaloPersonalController {
  constructor(
    private readonly channelZaloPersonalService: ChannelZaloPersonalService,
  ) {}

  @Post()
  async create(
    @Body() createDto: CreateChannelZaloPersonalDto,
  ): Promise<ChannelZaloPersonalResponseDto> {
    return await this.channelZaloPersonalService.create(createDto);
  }

  @Get()
  async findAll(
    @Query('accountId') accountId?: string,
  ): Promise<ChannelZaloPersonalResponseDto[]> {
    const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;
    return await this.channelZaloPersonalService.findAll(accountIdNum);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ChannelZaloPersonalResponseDto> {
    return await this.channelZaloPersonalService.findOne(id);
  }

  @Get('account/:accountId')
  async findByAccountId(
    @Param('accountId', ParseIntPipe) accountId: number,
  ): Promise<ChannelZaloPersonalResponseDto[]> {
    return await this.channelZaloPersonalService.findByAccountId(accountId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateChannelZaloPersonalDto,
  ): Promise<ChannelZaloPersonalResponseDto> {
    return await this.channelZaloPersonalService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.channelZaloPersonalService.remove(id);
  }

  @Patch(':id/connection-status')
  async updateConnectionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isConnected: boolean; connectionStatus?: string },
  ): Promise<ChannelZaloPersonalResponseDto> {
    return await this.channelZaloPersonalService.updateConnectionStatus(
      id,
      body.isConnected,
      body.connectionStatus,
    );
  }

  @Patch(':id/credentials')
  async updateCredentials(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { credentials: any },
  ): Promise<ChannelZaloPersonalResponseDto> {
    return await this.channelZaloPersonalService.updateCredentials(
      id,
      body.credentials,
    );
  }

  @Patch(':id/qr-code')
  async updateQrCode(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { qrCode: string },
  ): Promise<ChannelZaloPersonalResponseDto> {
    return await this.channelZaloPersonalService.updateQrCode(id, body.qrCode);
  }

  @Post(':id/send-message')
  async sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() messageData: any,
  ): Promise<any> {
    return await this.channelZaloPersonalService.sendMessage(id, messageData);
  }
}
