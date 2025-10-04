import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ZaloService } from './zalo.service';
import { ZaloController } from './zalo.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [ZaloService],
  controllers: [ZaloController],
  exports: [ZaloService],
})
export class ZaloModule {}
