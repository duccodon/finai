import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/push-notes";
import axios from "axios";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as authService from "@/services/authService";

function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { pushNote } = useNotifications();
    const [isLoading, setIsLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const resetSessionId = searchParams.get("resetSessionId");

    useEffect(() => {
        if (!resetSessionId) {
            pushNote({
                title: "Invalid Link",
                description: "The reset link is invalid or expired",
                variant: "error",
            });
            navigate("/auth", { replace: true });
        }
    }, [resetSessionId, navigate, pushNote]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            pushNote({
                title: "Password Mismatch",
                description: "Passwords do not match",
                variant: "error",
            });
            return;
        }

        if (newPassword.length < 6) {
            pushNote({
                title: "Password Too Short",
                description: "Password must be at least 6 characters long",
                variant: "error",
            });
            return;
        }

        setIsLoading(true);

        try {
            await authService.resetPassword(
                resetSessionId as string,
                newPassword
            );

            pushNote({
                title: "Password Reset Successful",
                description:
                    "Your password has been reset. Please sign in with your new password.",
                variant: "success",
            });

            navigate("/auth", { replace: true });
        } catch (error) {
            let errorMessage = "Failed to reset password";
            if (axios.isAxiosError(error)) {
                const data = error.response?.data;
                if (typeof data?.message === "string") {
                    errorMessage = data.message;
                }
            }

            pushNote({
                title: "Reset Failed",
                description: errorMessage,
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!resetSessionId) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className={cn("flex flex-col gap-6", "w-full max-w-md")}>
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">
                            Reset Your Password
                        </CardTitle>
                        <CardDescription>
                            Enter your new password below
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-6">
                                <div className="grid gap-3">
                                    <Label htmlFor="newPassword">
                                        New Password
                                    </Label>
                                    <Input
                                        id="newPassword"
                                        name="newPassword"
                                        type="password"
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) =>
                                            setNewPassword(e.target.value)
                                        }
                                        required
                                        disabled={isLoading}
                                        minLength={6}
                                    />
                                </div>

                                <div className="grid gap-3">
                                    <Label htmlFor="confirmPassword">
                                        Confirm New Password
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        required
                                        disabled={isLoading}
                                        minLength={6}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading}>
                                    {isLoading
                                        ? "Resetting..."
                                        : "Reset Password"}
                                </Button>

                                <div className="text-center text-sm">
                                    Remember your password?{" "}
                                    <button
                                        type="button"
                                        onClick={() => navigate("/auth")}
                                        className="text-primary underline-offset-4 hover:underline"
                                        disabled={isLoading}>
                                        Back to sign in
                                    </button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
                    By clicking continue, you agree to our{" "}
                    <a href="#">Terms of Service</a> and{" "}
                    <a href="#">Privacy Policy</a>.
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
