import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // срезать поля, не описанные в DTO
      forbidNonWhitelisted: true,  // 400 при наличии лишних полей
      transform: true,             // преобразовывать payload в экземпляры DTO
      transformOptions: {
        enableImplicitConversion: true, // string → number/boolean по типу DTO
      },
    }),
  );
  app.use(cookieParser());
  app.enableCors();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3030);

  await app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
}
bootstrap();
