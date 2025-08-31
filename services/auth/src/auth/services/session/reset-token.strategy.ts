import { Injectable } from '@nestjs/common';
import { TokenStrategy } from './token-interface.strategy';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResetTokenStrategy implements TokenStrategy {
  constructor(private redis: Redis) {}

  async store(userId: string, resetToken: string, ttlSeconds: number): Promise<string> {
    const tokenId = uuidv4();
    const payload = { userId, resetToken };
    await this.redis.set(this.getKey(tokenId), JSON.stringify(payload), 'EX', ttlSeconds);
    return tokenId;
  }

  async get(tokenId: string): Promise<{ userId: string; token: string } | null> {
    const raw = await this.redis.get(this.getKey(tokenId));
    return raw ? (JSON.parse(raw) as { userId: string; token: string }) : null;
  }

  async delete(tokenId: string): Promise<void> {
    await this.redis.del(this.getKey(tokenId));
  }

  getKey(tokenId: string): string {
    return `reset:${tokenId}`;
  }
}
