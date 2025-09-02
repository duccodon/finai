import { Injectable } from '@nestjs/common';
import { TokenStrategy } from './token-interface.strategy';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefreshTokenStrategy implements TokenStrategy {
  constructor(private redis: Redis) {}

  async store(userId: string, token: string, ttlSeconds: number): Promise<string> {
    const jti = uuidv4();
    const payload = { userId, token };
    await this.redis.set(this.getKey(jti), JSON.stringify(payload), 'EX', ttlSeconds);
    await this.redis.sadd(`user:${userId}:rts`, jti);
    await this.redis.expire(`user:${userId}:rts`, ttlSeconds);
    return jti;
  }

  async get(jti: string): Promise<{ userId: string; token: string } | null> {
    const raw = await this.redis.get(this.getKey(jti));
    return raw ? (JSON.parse(raw) as { userId: string; token: string }) : null;
  }

  async delete(jti: string): Promise<void> {
    const data = await this.get(jti);
    if (!data) return;
    await this.redis.del(this.getKey(jti));
    await this.redis.srem(`user:${data.userId}:rts`, jti);
  }

  getKey(jti: string): string {
    return `rt:${jti}`;
  }
}
