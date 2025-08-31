import { Body, Controller, HttpCode, HttpStatus, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { SigninDto } from 'src/dtos/signin.dto';
import { SignupDto } from 'src/dtos/signup.dto';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
interface RefreshTokenCookie {
  token: string;
  jti: string;
}

// fallback defaults (used only if ConfigService/.env missing)
const DEFAULT_COOKIE_NAME = 'Host-finai_rft';
const DEFAULT_REFRESH_TTL_DAYS = 30;

@Controller('api/auth/v1')
export class AuthController {
  private readonly cookieName: string;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {
    // load from configService first, then env, then default
    this.cookieName =
      this.configService.get<string>('COOKIE_NAME') ??
      process.env.COOKIE_NAME ??
      DEFAULT_COOKIE_NAME;

    const ttlDaysStr =
      this.configService.get<string>('REFRESH_TTL_DAYS') ??
      process.env.REFRESH_TTL_DAYS ??
      String(DEFAULT_REFRESH_TTL_DAYS);

    const ttlDays = Number(ttlDaysStr) || DEFAULT_REFRESH_TTL_DAYS;
    this.refreshTtlMs = ttlDays * 24 * 60 * 60 * 1000;
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signin(@Body() dto: SigninDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshPlain, jti } = await this.authService.signin(dto);
    // set httpOnly secure cookie (client won't see the token in response body)
    res.cookie(
      this.cookieName,
      JSON.stringify({ token: refreshPlain, jti } as RefreshTokenCookie),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: this.refreshTtlMs,
        path: '/', // optionally restrict to /api/auth
      },
    );

    // respond without refresh token
    return { user, accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[this.cookieName] as string | undefined;

    if (!raw) return { error: 'no refresh token' };

    const { token: refreshToken, jti } = JSON.parse(raw) as RefreshTokenCookie;
    const {
      accessToken,
      refreshPlain: newRefresh,
      jti: newJti,
      user,
    } = await this.authService.refresh(refreshToken, jti);

    // rotate cookie
    res.cookie(this.cookieName, JSON.stringify({ token: newRefresh, jti: newJti }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: this.refreshTtlMs,
      path: '/', // optionally restrict to /api/auth
    });

    return { accessToken, user };
  }
  @Get('verify')
  async verify(@Req() req: Request, @Res() res: Response) {
    const authHeader = req.headers['authorization'];

    // Nếu không có header Authorization → reject
    if (!authHeader) {
      return res.status(HttpStatus.UNAUTHORIZED).send();
    }
    console.log('authHeader:', authHeader);

    const token = authHeader.split(' ')[1]; // Bỏ "Bearer"
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = await this.tokenService.verifyToken(token);
      if (payload) {
        return res.status(HttpStatus.OK).send();
      } else {
        return res.status(HttpStatus.UNAUTHORIZED).send();
      }
    } catch (err) {
      console.error(err);
      return res.status(HttpStatus.UNAUTHORIZED).send();
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawCookieData = req.cookies?.[this.cookieName] as string | undefined;

    if (rawCookieData) {
      try {
        const { token: refreshToken, jti } = JSON.parse(rawCookieData) as RefreshTokenCookie;
        await this.authService.logout(refreshToken, jti);
      } catch (error) {
        console.error(error);
      }
    }

    // clear cookie data
    res.cookie(this.cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 0,
      path: '/',
    });

    return { message: 'Logged out successfully!' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: { email: string }) {
    return this.authService.forgotPassword(dto.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: { resetSessionId: string; newPassword: string }) {
    return this.authService.resetPassword(dto.resetSessionId, dto.newPassword);
  }
}
