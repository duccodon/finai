import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionService {
  private redis: Redis;
  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.redis = new Redis(redisUrl as string);
  }

  private key(jti: string) {
    return `rt:${jti}`;
  }

  // Create a session for user with multiple devices
  async create(
    userId: string,
    refreshHash: string,
    ttlSeconds: number,
    meta: Record<string, unknown> = {},
  ) {
    const jti = uuidv4();
    const payload = { userId, refreshHash, meta };
    await this.redis.set(this.key(jti), JSON.stringify(payload), 'EX', ttlSeconds);
    await this.redis.sadd(`user:${userId}:rts`, jti);
    await this.redis.expire(`user:${userId}:rts`, ttlSeconds);
    return jti;
  }

  // Get session of user
  async get(jti: string) {
    const raw = await this.redis.get(this.key(jti));
    return raw
      ? (JSON.parse(raw) as { userId: string; refreshHash: string; meta?: Record<string, unknown> })
      : null;
  }

  async revoke(jti: string) {
    const data = await this.get(jti);
    if (!data) return;
    await this.redis.del(this.key(jti)); // remove rft from redis with jti
    await this.redis.srem(`user:${data.userId}:rts`, jti); // revoke refresh token from set of user's refresh tokens with multiple devices
  }

  async rotate(oldJti: string, newJti: string, newHash: string, ttlSeconds: number) {
    const old = await this.get(oldJti);
    if (!old) throw new Error('invalid refresh');
    await this.revoke(oldJti);
    await this.redis.set(
      this.key(newJti),
      JSON.stringify({ userId: old.userId, refreshHash: newHash, meta: old.meta || {} }),
      'EX',
      ttlSeconds,
    );
    await this.redis.sadd(`user:${old.userId}:rts`, newJti);
    await this.redis.expire(`user:${old.userId}:rts`, ttlSeconds);
    return newJti;
  }
}
