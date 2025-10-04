import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ZaloModule } from './zalo/zalo.module';
import { CorsInterceptor } from './cors.interceptor';
import { TestController } from './test.controller';
import { MultiAccountManager } from './zalo/multi-account.manager';
import { DatabaseService } from './core/database.service';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [ZaloModule],
  controllers: [AppController, TestController],
  providers: [
    AppService,
    BootstrapService,
    MultiAccountManager,
    DatabaseService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CorsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply().exclude('health', 'metrics').forRoutes('*');
  }
}
