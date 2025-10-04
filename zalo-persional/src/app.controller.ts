import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'zalo-persional',
      version: '0.0.1',
      uptime: process.uptime(),
      connected_accounts: this.appService.getConnectedCount(),
    };
  }

  @Get('accounts/status')
  getAccountsStatus() {
    return this.appService.getAccountsStatus();
  }

  @Post('send-message')
  async sendMessage(@Body() body: { channel_id: number; message: any }) {
    return await this.appService.sendMessage(body.channel_id, body.message);
  }
}
