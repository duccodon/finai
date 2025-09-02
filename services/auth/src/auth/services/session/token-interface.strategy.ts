export interface TokenStrategy {
  store(userId: string, token: string, ttlSeconds: number): Promise<string>;
  get(id: string): Promise<{ userId: string; token: string } | null>;
  delete(id: string): Promise<void>;
  getKey(id: string): string;
}
