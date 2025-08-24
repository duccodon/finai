import { useState } from "react";
import { AuthForm } from "@/components/form/sign";
import axios from "axios";
import {
    NotificationList,
    type Notification,
} from "@/components/ui/notification";
import { useAuth } from "@/contexts/auth/auth.helper";
import { useLocation, useNavigate } from "react-router-dom";

function AuthPage() {
    const [mode, setMode] = useState<"signin" | "signup">("signin");

    const navigate = useNavigate();
    const location = useLocation();
    const { setAuth } = useAuth();

    const from = (
        location.state as
            | { from?: { pathname?: string; search?: string } }
            | undefined
    )?.from;

    // notifications
    const [notes, setNotes] = useState<Notification[]>([]);

    const pushNote = (n: Omit<Notification, "id">) => {
        const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
        const item: Notification = { id, ...n };
        setNotes((s) => [item, ...s]);
        // auto remove after 5s
        setTimeout(() => setNotes((s) => s.filter((x) => x.id !== id)), 5000);
    };

    const removeNote = (id: string) =>
        setNotes((s) => s.filter((x) => x.id !== id));

    // Vite exposes only env vars prefixed with VITE_
    const API_BASE = (import.meta.env.VITE_API_URL as string) || "";

    const handleSubmit = async (data: Record<string, string>) => {
        try {
            const endpoint =
                mode === "signin"
                    ? `${API_BASE}/api/auth/v1/signin`
                    : `${API_BASE}/api/auth/v1/signup`;

            const res = await axios.post(endpoint, data, {
                withCredentials: true,
                headers: { "Content-Type": "application/json" },
            });

            const body = res.data ?? {};

            if (mode === "signin") {
                if (body.accessToken) {
                    setAuth(body.accessToken, body.user);
                    pushNote({
                        title: "Signed in",
                        description: "Login successfully",
                        variant: "success",
                    });

                    const target = from?.pathname
                        ? `${from.pathname || "/"}${from?.search ?? ""}`
                        : "/";
                    navigate(target, { replace: true });
                } else {
                    pushNote({
                        title: "Signed in",
                        description: "No access token returned",
                        variant: "success",
                    });
                }
            } else {
                setMode("signin");
                pushNote({
                    title: "Account created",
                    description: "You can now sign in",
                    variant: "success",
                });
            }
        } catch (err: unknown) {
            let messages: string[] = ["Authentication failed"];

            if (axios.isAxiosError(err)) {
                const data = err.response?.data;
                if (Array.isArray(data?.messages)) {
                    messages = data.messages;
                } else if (typeof data?.message === "string") {
                    // single message (maybe joined by commas)
                    messages = [data.message];
                } else if (typeof err.message === "string") {
                    messages = [err.message];
                }
            } else if (err instanceof Error) {
                messages = [err.message];
            } else {
                messages = [String(err)];
            }

            // show each message (or combine)
            messages.forEach((m) =>
                pushNote({
                    title: "Authentication error",
                    description: m,
                    variant: "error",
                })
            );
        }
    };

    const toggleMode = () => {
        setMode(mode === "signin" ? "signup" : "signin");
    };

    return (
        <>
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <AuthForm
                    mode={mode}
                    onToggleMode={toggleMode}
                    onSubmit={handleSubmit}
                />
            </div>

            <NotificationList items={notes} onClose={removeNote} />
        </>
    );
}

export default AuthPage;
