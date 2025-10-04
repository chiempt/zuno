import { Controller, Get, Header, Post, Options } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Get()
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Credentials', 'true')
  async testGet() {
    console.log('✅ Test GET endpoint called');
    return {
      success: true,
      message: 'GET endpoint working',
      timestamp: new Date().toISOString(),
      cors: 'enabled',
    };
  }

  @Post()
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Credentials', 'true')
  async testPost() {
    console.log('✅ Test POST endpoint called');
    return {
      success: true,
      message: 'POST endpoint working',
      timestamp: new Date().toISOString(),
      cors: 'enabled',
    };
  }

  @Options()
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  @Header('Access-Control-Allow-Headers', '*')
  @Header('Access-Control-Allow-Credentials', 'true')
  async testOptions() {
    console.log('✅ Test OPTIONS endpoint called');
    return {};
  }
}
