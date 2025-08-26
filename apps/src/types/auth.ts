export type SigninRequest = {
    email: string;
    password: string;
};

export type SignupRequest = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
};

export type AuthResponse<User = Record<string, string | number>> = {
    accessToken: string;
    user?: User;
};
