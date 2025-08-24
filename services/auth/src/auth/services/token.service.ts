import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async signAccess(payload: Record<string, unknown>) {
    const secret = process.env.JWT_SECRET || 'jwt-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
    return this.jwtService.signAsync(payload, { secret, expiresIn });
  }

  generateRefreshPlain(): string {
    return randomBytes(32).toString('base64url'); // 256-bit opaque token
  }

  hashRefresh(refreshPlain: string): string {
    return createHash('sha256').update(refreshPlain).digest('hex');
  }
}
