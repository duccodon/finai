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

    // additional profile fields from the signup form
    avatarUrl?: string;
    firstName?: string;
    lastName?: string;
    dob?: string; // ISO date string (yyyy-mm-dd)
    location?: string;
    company?: string;
    street?: string;
    city?: string;
    state?: string; // state / region
    about?: string;
};

export type Profile = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;

    // additional profile fields from the signup form
    avatarUrl?: string;
    firstName?: string;
    lastName?: string;
    dob?: string; // ISO date string (yyyy-mm-dd)
    location?: string;
    company?: string;
    street?: string;
    city?: string;
    state?: string; // state / region
    about?: string;
};

export type User = Record<string, string | number>;

export type AuthResponse<User = Record<string, string | number>> = {
    accessToken: string;
    user?: User;
};
