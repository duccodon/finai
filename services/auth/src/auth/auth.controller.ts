import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { SigninDto } from 'src/dtos/signin.dto';
import { SignupDto } from 'src/dtos/signup.dto';
import type { Request, Response } from 'express';

interface RefreshTokenCookie {
  token: string;
  jti: string;
}

const COOKIE_NAME = process.env.COOKIE_NAME || 'Host-finai_rft';
const REFRESH_TTL_MS = Number(process.env.REFRESH_TTL_DAYS || '30') * 24 * 60 * 60 * 1000;

@Controller('api/auth/v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    res.cookie(COOKIE_NAME, JSON.stringify({ token: refreshPlain, jti } as RefreshTokenCookie), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none',
      maxAge: REFRESH_TTL_MS,
      path: '/', // optionally restrict to /api/auth
    });

    // respond without refresh token
    return { user, accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!raw) return { error: 'no refresh token' };

    const { token: refreshToken, jti } = JSON.parse(raw) as RefreshTokenCookie;
    const {
      accessToken,
      refreshPlain: newRefresh,
      jti: newJti,
      user,
    } = await this.authService.refresh(refreshToken, jti);

    // rotate cookie
    res.cookie(COOKIE_NAME, JSON.stringify({ token: newRefresh, jti: newJti }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none',
      maxAge: REFRESH_TTL_MS,
      path: '/', // optionally restrict to /api/auth
    });

    return { accessToken, user };
  }
}
