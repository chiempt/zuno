import { Module } from '@nestjs/common';
import { ZaloService } from './zalo.service';
import { ZaloController } from './zalo.controller';

@Module({
  providers: [ZaloService],
  controllers: [ZaloController],
  exports: [ZaloService],
})
export class ZaloModule {}
