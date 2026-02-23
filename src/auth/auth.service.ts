import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async authenticateViaTelegram(initData: string): Promise<{ token: string }> {
    const params = new URLSearchParams(initData);

    const hash = params.get('hash');
    if (!hash) {
      throw new BadRequestException('Missing hash in initData');
    }

    // Строим data-check-string по документации Telegram
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // HMAC-SHA256: key = HMAC("WebAppData", botToken)
    const botToken =
      this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== hash) {
      throw new UnauthorizedException('Invalid initData signature');
    }

    // Проверяем свежесть (не старше 24 часов)
    const authDate = Number(params.get('auth_date'));
    if (!authDate || Date.now() / 1000 - authDate > 86400) {
      throw new UnauthorizedException('initData has expired');
    }

    const userJson = params.get('user');
    if (!userJson) {
      throw new BadRequestException('Missing user in initData');
    }

    const tgUser = JSON.parse(userJson) as {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };

    const name = [tgUser.first_name, tgUser.last_name]
      .filter(Boolean)
      .join(' ');

    const user = await this.prisma.user.upsert({
      where: { telegramId: BigInt(tgUser.id) },
      create: {
        telegramId: BigInt(tgUser.id),
        name,
        username: tgUser.username ?? null,
      },
      update: {
        name,
        username: tgUser.username ?? null,
      },
    });

    const token = this.jwtService.sign({ sub: user.id });
    return { token };
  }
}
