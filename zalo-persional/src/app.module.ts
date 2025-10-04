import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ZaloModule } from './zalo/zalo.module';
import { CorsInterceptor } from './cors.interceptor';
import { BootstrapService } from './bootstrap.service';
import { ChannelZaloPersonalModule } from './channels/channel-zalo-personal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.CHATWOOT_DB_HOST || 'localhost',
      port: parseInt(process.env.CHATWOOT_DB_PORT || '5432'),
      database: process.env.CHATWOOT_DB_NAME || 'chatwoot_dev',
      username: process.env.CHATWOOT_DB_USER || 'postgres',
      password: process.env.CHATWOOT_DB_PASSWORD || 'password',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Don't auto-sync in production
      logging: process.env.NODE_ENV === 'development',
    }),
    ZaloModule,
    ChannelZaloPersonalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    BootstrapService,
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
