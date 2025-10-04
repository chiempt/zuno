import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with comprehensive settings (NO CREDENTIALS)
  app.enableCors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Access-Control-Headers',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers',
      'Cache-Control',
      'Pragma',
      'X-CSRF-Token',
      'Referrer-Policy',
    ],
    credentials: false, // No credentials to avoid CORS issues
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Add explicit middleware to set CORS headers manually
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Set CORS headers (NO CREDENTIALS)
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
    );
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Credentials', 'false'); // No credentials
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.header('Access-Control-Expose-Headers', '*');

    // Override referrer policy
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      console.log('🔄 Handling OPTIONS preflight request from:', origin);
      res.status(204).end();
      return;
    }

    console.log(
      `📡 ${req.method} ${req.url} from origin: ${origin || 'unknown'}`,
    );
    next();
  });

  await app.listen(3001);
  console.log('🚀 Zalo Personal Service running on http://localhost:3001');
  console.log('🌍 CORS enabled for all origins with explicit middleware');
  console.log('🔓 Referrer Policy set to no-referrer-when-downgrade');
}
bootstrap();
