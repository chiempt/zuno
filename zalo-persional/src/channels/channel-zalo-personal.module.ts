import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelZaloPersonal } from './entities/channel-zalo-personal.entity';
import { ChannelZaloPersonalService } from './services/channel-zalo-personal.service';
import { ChannelZaloPersonalController } from './controllers/channel-zalo-personal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelZaloPersonal])],
  controllers: [ChannelZaloPersonalController],
  providers: [ChannelZaloPersonalService],
  exports: [ChannelZaloPersonalService],
})
export class ChannelZaloPersonalModule {}
