import { useEffect, useState } from "react";
import { AuthForm } from "@/components/form/sign";
import axios from "axios";
import { NotificationList } from "@/components/ui/notification";
import { useAuth } from "@/contexts/auth/auth.helper";
import { useLocation, useNavigate } from "react-router-dom";
import * as authService from "@/services/authService";
import { useNotifications } from "@/hooks/push-notes";
import { ForgotPasswordForm } from "@/components/form/forgot-password";

function AuthPage() {
    const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");

    const navigate = useNavigate();
    const location = useLocation();
    const { accessToken, setAuth } = useAuth();

    const from = (
        location.state as
            | { from?: { pathname?: string; search?: string } }
            | undefined
    )?.from;

    // notifications
    const { notes, pushNote, removeNote } = useNotifications();

    const handleSubmit = async (data: Record<string, string>) => {
        try {
            if (mode === "signin") {
                const res = await authService.signin({
                    email: data.email,
                    password: data.password,
                });

                if (res.accessToken) {
                    setAuth(res.accessToken, res.user);
                    pushNote({
                        title: "Signed in",
                        description: "Login successfully",
                        variant: "success",
                    });
                    const target = from?.pathname
                        ? `${from.pathname || "/"}${from?.search ?? ""}`
                        : "/";
                    navigate(target, { replace: true });
                }
            } else if (mode === "forgot") {
                // Handle forgot password submission
                await authService.forgotPassword(data.email);
                pushNote({
                    title: "Reset email sent",
                    description:
                        "Check your email for password reset instructions",
                    variant: "success",
                });
                setMode("signin"); // Return to signin after successful submission
            } else {
                // signup mode
                await authService.signup({
                    email: data.email,
                    password: data.password,
                    confirmPassword: data.confirmPassword,
                    phone: data?.phone,
                    username: data?.username,
                });
                setMode("signin");
                pushNote({
                    title: "Account created successfully",
                    description: "Now, you can sign in",
                    variant: "success",
                });
            }
        } catch (err: unknown) {
            let messages: string[] = ["Authentication failed"];
            if (axios.isAxiosError(err)) {
                const data = err.response?.data;
                if (Array.isArray(data?.messages)) messages = data.messages;
                else if (typeof data?.message === "string")
                    messages = [data.message];
                else if (typeof err.message === "string")
                    messages = [err.message];
            } else if (err instanceof Error) messages = [err.message];
            else messages = [String(err)];
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

    const handleForgotPassword = (email: string) => {
        // This is called from ForgotPasswordForm
        handleSubmit({ email });
    };

    useEffect(() => {
        if (accessToken) {
            navigate("/", { replace: true });
        }
    }, [accessToken]);

    return (
        <>
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                {mode === "forgot" ? (
                    <ForgotPasswordForm
                        onSubmit={handleForgotPassword}
                        onBack={() => setMode("signin")}
                    />
                ) : (
                    <AuthForm
                        mode={mode}
                        onToggleMode={toggleMode}
                        onSubmit={handleSubmit}
                        onForgotPassword={() => setMode("forgot")}
                    />
                )}
            </div>

            <NotificationList items={notes} onClose={removeNote} />
        </>
    );
}

export default AuthPage;
