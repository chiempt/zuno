import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ZaloService, ZaloMessage } from './zalo.service';

@Controller('zalo')
export class ZaloController {
  constructor(private readonly zaloService: ZaloService) {}

  @Post('qr-code')
  async getQRCode() {
    try {
      const qrData = await this.zaloService.loginQR();
      return {
        success: true,
        data: qrData,
        message: 'QR code generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate QR code',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('qr-code')
  async getQRCodeBase64() {
    const data = this.zaloService.getQRCodeBase64();
    return {
      success: true,
      data: data,
      message: 'Connection status retrieved',
    };
  }
}
