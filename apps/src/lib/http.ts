// http.ts
import axios, {
  type InternalAxiosRequestConfig,
  type AxiosRequestHeaders,
  type AxiosError,
  type AxiosRequestConfig,
} from 'axios';

// Instance chính cho toàn app
const http = axios.create({
  baseURL: '/api',
  timeout: 5000,
  withCredentials: true,
});

// Instance riêng cho refresh (không interceptor để tránh vòng lặp)
// Nếu refresh qua domain/port khác với FE, bật withCredentials ở đây.
export const refreshHttp = axios.create({
  baseURL: '/api',
  timeout: 5000,
  withCredentials: true,
});

// ---- Refresh lock & queue để tránh refresh song song ----
let isRefreshing = false;
let waitQueue: Array<(t: string | null) => void> = [];
const enqueue = (cb: (t: string | null) => void) => waitQueue.push(cb);
const flushQueue = (token: string | null) => {
  waitQueue.forEach((cb) => cb(token));
  waitQueue = [];
};

// ---- TOKEN TRONG BỘ NHỚ (KHÔNG ĐỘNG VÀO axios.defaults) ----
let accessToken: string | null = null;
export const setAccessTokenForHTTP = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

// ---- Request interceptor ----
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Nếu lo sợ lỡ dùng http cho URL tuyệt đối bên ngoài, có thể guard:
  if (config.url?.startsWith('http')) return config;

  if (accessToken) {
    const headers: AxiosRequestHeaders = (config.headers ??=
      {} as AxiosRequestHeaders);
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---- RESPONSE INTERCEPTOR ----
http.interceptors.response.use(
  (res) => res.data, // unwrap data
  async (error) => {
    const original = error.config;
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }
    // nếu chính là /auth/v1/refresh → không tự refresh nữa (tránh loop)
    if (original?.url?.includes('/auth/v1/refresh')) {
      return Promise.reject(error); // FE nên clearAuth() + chuyển login
    }

    // Tránh retry vô hạn
    if (original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    // Nếu đang refresh → xếp hàng đợi
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        enqueue((newToken) => {
          if (newToken) {
            original.headers = {
              ...(original.headers || {}),
              Authorization: `Bearer ${newToken}`,
            };
            resolve(http.request(original));
          } else {
            reject(error);
          }
        });
      });
    }

    // Bắt đầu refresh
    isRefreshing = true;
    try {
      // Gọi refresh bằng instance KHÔNG interceptor
      const r = await refreshHttp.post('/auth/v1/refresh');
      const newAccessToken = r.data?.accessToken as string | undefined;

      if (!newAccessToken) {
        flushQueue(null);
        throw error;
      }

      // Cập nhật mặc định cho các request sau
      setAccessTokenForHTTP(newAccessToken);
      const headers: AxiosRequestHeaders = (original.headers ??=
        {} as AxiosRequestHeaders);
      headers.Authorization = `Bearer ${newAccessToken}`;
      // Đánh thức hàng đợi
      flushQueue(newAccessToken);

      // Retry request gốc
      original.headers = {
        ...(original.headers || {}),
        Authorization: `Bearer ${newAccessToken}`,
      };
      return http.request(original);
    } catch (e) {
      flushQueue(null);
      return Promise.reject(e); // FE nên xử lý logout
    } finally {
      isRefreshing = false;
    }
  }
);

// 👉 ép kiểu instance để post/get trả Promise<T> thay vì AxiosResponse<T>
export default http as {
  get<T = any>(url: string, config?: any): Promise<T>;
  post<T = any>(url: string, data?: any, config?: any): Promise<T>;
  put<T = any>(url: string, data?: any, config?: any): Promise<T>;
  delete<T = any>(url: string, config?: any): Promise<T>;
};
