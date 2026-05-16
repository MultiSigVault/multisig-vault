import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX', '/api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Validation pipe with detailed errors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (error) => `${error.property} - ${Object.values(error.constraints).join(', ')}`
        );
        return new BadRequestException(messages);
      },
    }),
  );

  // CORS
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Wallet-Address'],
    exposedHeaders: ['X-Total-Count'],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('MultiSig Vault API')
    .setDescription(`
      Multi-signature treasury vault API for Stellar Soroban.
      
      ## Features
      - Multi-signature transaction approvals
      - Spending policies with daily/weekly/monthly limits
      - Time-locked withdrawals
      - Scheduled recurring payments
      - Social recovery with guardians
      - IPFS-backed audit logging
      
      ## Authentication
      This API uses JWT tokens. Obtain a token via the /api/v1/users/auth/login endpoint.
    `)
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('vaults', 'Vault management endpoints')
    .addTag('transactions', 'Transaction submission and approval')
    .addTag('users', 'User authentication and management')
    .addTag('policies', 'Spending policy configuration')
    .addTag('recovery', 'Social recovery management')
    .addTag('schedules', 'Scheduled payments')
    .addTag('audit', 'Audit log and compliance')
    .addTag('stats', 'Statistics and analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MultiSig Vault API Documentation',
  });

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: configService.get('NODE_ENV'),
      version: '1.0.0',
    });
  });

  // Readiness probe
  app.getHttpAdapter().get('/ready', (req, res) => {
    res.status(200).json({ status: 'ready' });
  });

  const port = configService.get('PORT', 3001);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}${apiPrefix}/docs`);
  logger.log(`❤️ Health Check: http://localhost:${port}/health`);
}

bootstrap();