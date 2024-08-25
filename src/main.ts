import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CLIENT_URL, // Your Next.js app origin
    credentials: true, // If you need to pass cookies or authorization headers
  });

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(8002);
}
bootstrap();
