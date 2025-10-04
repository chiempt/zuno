import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ZaloService } from './zalo.service';
import { ZaloController } from './zalo.controller';
import { ChatwootApiService } from '../services/chatwoot-api.service';
import { ZaloMessageHandlerService } from '../services/zalo-message-handler.service';
import { ChannelZaloPersonalModule } from '../channels/channel-zalo-personal.module';

@Module({
  imports: [EventEmitterModule.forRoot(), ChannelZaloPersonalModule],
  providers: [ZaloService, ChatwootApiService, ZaloMessageHandlerService],
  controllers: [ZaloController],
  exports: [ZaloService],
})
export class ZaloModule {}
