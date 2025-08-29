import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        // collect readable messages
        const msgs = errors.flatMap((err) => Object.values(err.constraints ?? {}));
        return new BadRequestException({ messages: msgs });
      },
    }),
  );

  // Allow all origins
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  console.log('PORT >>>', process.env.PORT);
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
