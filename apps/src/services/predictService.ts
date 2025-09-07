// src/services/predict.ts
import http from '@/lib/http';

const API_URL = '/predict/run';

type PredictBody = {
  symbol: string;
  interval: string;
  seq_len?: number;
  force_train?: boolean;
};

// giả lập fetch Response
export async function runPredict(body: PredictBody) {
  try {
    const data = await http.post<string>(API_URL, {
      seq_len: 100,
      force_train: false,
      ...body,
    });

    const raw = typeof data === 'string' ? data : JSON.stringify(data);

    return {
      ok: true,
      status: 200,
      text: async () => raw,
    };
  } catch (err: any) {
    const raw = err?.response?.data ?? '';
    const status = err?.response?.status ?? 500;

    return {
      ok: false,
      status,
      text: async () => (typeof raw === 'string' ? raw : JSON.stringify(raw)),
    };
  }
}
