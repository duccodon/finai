// src/services/newsService.ts
import http from '@/lib/http';

// Giống cấu trúc đang dùng trong component
export type SentimentLabel = 'positive' | 'neutral' | 'negative' | string;

export type Sentiment = {
  compound_score: number;
  label: SentimentLabel;
  details: { neg: number; neu: number; pos: number; compound: number };
};

// Bài báo do API trả về (không có symbol/timestamp)
export type ApiNewsArticle = {
  source: string;
  title: string;
  link: string;
  published: string;
  summary: string;
  cleanText: string;
  sentiment: Sentiment;
};

export type ApiResponse = {
  symbols: Record<string, ApiNewsArticle>;
};

// Gọi API: GET /api/news/:symbol (http đã có baseURL .../api)
export function getNewsBySymbol(symbol: string) {
  return http.get<ApiResponse>(`/v1/news/${symbol}`);
}
