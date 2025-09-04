// src/services/user.ts
import http from "@/lib/http";

// PublicUser trả về từ backend (tuỳ bạn đã có type chưa)
// Tối thiểu nên có id + các field public có thể hiển thị
export type PublicUser = {
    id: string;
    username?: string;
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    location?: string | null;
    company?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    about?: string | null;
    avatarUrl?: string | null;
    dob?: string | null; // ISO string phía FE
};

// Khớp với UpdateUserDto phía BE (tất cả optional)
export type UpdateUserDto = Partial<{
    username: string | null;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    location: string | null;
    company: string | null;
    street: string | null;
    city: string | null;
    state: string | null;
    about: string | null;
    avatarUrl: string | null;
    // các field xử lý đặc biệt
    dob: string | null; // gửi string ISO hoặc null để clear
    password: string; // nếu đổi mật khẩu
    oldPassword: string; // check old Pass in BE
}>;

/**
 * GET /api/user/v1/me?userId=<id>
 */
export function getMe(userId: string) {
    return http.get<PublicUser>("/user/v1/me", {
        params: { userId },
    });
}

/**
 * PUT /api/user/v1?userId=<id>
 * Body: UpdateUserDto (partial)
 */
export function updateMe(userId: string, body: UpdateUserDto) {
    return http.put<PublicUser>("/user/v1", body, {
        params: { userId },
    });
}
