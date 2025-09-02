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

interface ForgotPasswordFormProps {
    className?: string;
    onSubmit: (email: string) => void;
    onBack: () => void;
    isLoading?: boolean;
}

export function ForgotPasswordForm({
    className,
    onSubmit,
    onBack,
    isLoading = false,
}: ForgotPasswordFormProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        if (email) {
            onSubmit(email);
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Forgot Password</CardTitle>
                    <CardDescription>
                        Enter your email address and we'll send you a link to
                        reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-6">
                            <div className="grid gap-3">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}>
                                {isLoading ? "Sending..." : "Send Reset Link"}
                            </Button>

                            <div className="text-center text-sm">
                                Remember your password?{" "}
                                <button
                                    type="button"
                                    onClick={onBack}
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
    );
}
