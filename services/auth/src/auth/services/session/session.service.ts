import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RefreshTokenStrategy } from './refresh-token.strategy';
import { ResetTokenStrategy } from './reset-token.strategy';
@Injectable()
export class SessionService {
  private redis: Redis;
  private refreshStrategy: RefreshTokenStrategy;
  private resetStrategy: ResetTokenStrategy;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.redis = new Redis(redisUrl as string);
    this.refreshStrategy = new RefreshTokenStrategy(this.redis);
    this.resetStrategy = new ResetTokenStrategy(this.redis);
  }

  // Session for Refresh Token
  async create(userId: string, refreshHash: string, ttlSeconds: number) {
    return this.refreshStrategy.store(userId, refreshHash, ttlSeconds);
  }

  async get(jti: string) {
    return this.refreshStrategy.get(jti);
  }

  async revoke(jti: string) {
    return this.refreshStrategy.delete(jti);
  }

  async rotate(oldJti: string, newHash: string, ttlSeconds: number) {
    const old = await this.refreshStrategy.get(oldJti);
    if (!old) throw new Error('Invalid refresh');
    await this.refreshStrategy.delete(oldJti);
    // Corrected: Use refreshStrategy for refresh token rotation
    const newJti = await this.refreshStrategy.store(old.userId, newHash, ttlSeconds);
    return newJti;
  }

  // Session for Refresh Token
  async createResetSession(userId: string, resetHash: string, ttlSeconds: number) {
    return this.resetStrategy.store(userId, resetHash, ttlSeconds);
  }

  // Reset Token Methods (new)
  async storeResetToken(userId: string, resetToken: string, ttlSeconds: number) {
    return this.resetStrategy.store(userId, resetToken, ttlSeconds);
  }

  async getResetToken(tokenId: string) {
    return this.resetStrategy.get(tokenId);
  }

  async deleteResetToken(tokenId: string) {
    return this.resetStrategy.delete(tokenId);
  }
}
