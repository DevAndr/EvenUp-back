import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  async telegramAuth(
    @Headers('authorization') authHeader: string,
  ): Promise<{ token: string }> {
    if (!authHeader?.startsWith('TgWebApp ')) {
      throw new UnauthorizedException(
        'Authorization header must be: TgWebApp <initData>',
      );
    }

    const initData = authHeader.slice('TgWebApp '.length);
    return this.authService.authenticateViaTelegram(initData);
  }
}
