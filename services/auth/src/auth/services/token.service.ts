import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async signToken(payload: Record<string, unknown>) {
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

  async verifyToken(
    token: string,
  ): Promise<{ isValid: boolean; payload?: Record<string, string>; error?: string }> {
    try {
      const secret = process.env.JWT_SECRET || 'jwt-secret';

      // Verify and decode the JWT token
      const payload = (await this.jwtService.verifyAsync(token, { secret })) as
        | Record<string, string>
        | undefined;

      return {
        isValid: true,
        payload,
      };
    } catch (error: unknown) {
      // Handle different JWT errors
      if (error instanceof Error) {
        let errorMessage = 'Invalid token';

        // Check specific JWT error types
        if (error.name === 'TokenExpiredError') {
          errorMessage = 'Token has expired';
        } else if (error.name === 'JsonWebTokenError') {
          errorMessage = 'Invalid token format';
        } else if (error.name === 'NotBeforeError') {
          errorMessage = 'Token not active yet';
        }

        return {
          isValid: false,
          error: errorMessage,
        };
      }

      return {
        isValid: false,
        error: 'Unknown token verification error',
      };
    }
  }
}
