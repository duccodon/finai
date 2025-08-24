import axios from 'axios';

// Tạo instance chung cho toàn app
const http = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

// Thêm interceptor nếu cần token
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Xử lý response / error
http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(error);
  }
);

// 👉 ép kiểu instance để post/get trả Promise<T> thay vì AxiosResponse<T>
export default http as {
  get<T = any>(url: string, config?: any): Promise<T>;
  post<T = any>(url: string, data?: any, config?: any): Promise<T>;
  put<T = any>(url: string, data?: any, config?: any): Promise<T>;
  delete<T = any>(url: string, config?: any): Promise<T>;
};
