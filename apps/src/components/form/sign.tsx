// ...existing code...
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

interface AuthFormProps {
    className?: string;
    mode: "signin" | "signup" | "forgot";
    onToggleMode: () => void;
    onSubmit: (data: Record<string, string>) => void;
    onForgotPassword?: () => void;
}

export function AuthForm({
    className,
    mode,
    onToggleMode,
    onSubmit,
    onForgotPassword,
}: AuthFormProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData) as Record<string, string>;
        onSubmit(data);
    };

    return (
        <div className={cn("flex flex-col gap-6", className)}>
            {/* Expand the card only for signup mode */}
            <Card
                className={cn(
                    mode === "signup" ? "max-w-4xl w-full mx-auto" : ""
                )}>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">
                        {mode === "signin"
                            ? "Welcome back"
                            : mode === "signup"
                            ? "Create an account"
                            : "Forgot Password"}
                    </CardTitle>
                    <CardDescription>
                        {mode === "signin"
                            ? "Login with your Apple or Google account"
                            : mode === "signup"
                            ? "Sign up with your email or social account"
                            : "Enter your email to receive a reset link"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-6">
                            {/* Social login buttons - hide in forgot mode */}
                            {mode !== "forgot" && (
                                <>{/* ...existing code... */}</>
                            )}

                            {/* For signup, split into two columns to avoid vertical overflow.
                                On other modes keep single-column layout. */}
                            {mode === "signup" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left column */}
                                    <div className="flex flex-col gap-6">
                                        <div className="grid gap-3">
                                            <Label htmlFor="username">
                                                Username
                                            </Label>
                                            <Input
                                                id="username"
                                                name="username"
                                                type="text"
                                                placeholder="Enter your username"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="grid gap-3">
                                                <Label htmlFor="firstName">
                                                    First name
                                                </Label>
                                                <Input
                                                    id="firstName"
                                                    name="firstName"
                                                    type="text"
                                                    placeholder="First name"
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-3">
                                                <Label htmlFor="lastName">
                                                    Last name
                                                </Label>
                                                <Input
                                                    id="lastName"
                                                    name="lastName"
                                                    type="text"
                                                    placeholder="Last name"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-3">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="m@example.com"
                                                required
                                            />
                                        </div>

                                        <div className="grid gap-3">
                                            <Label htmlFor="dob">
                                                Date of Birth *
                                            </Label>
                                            <Input
                                                id="dob"
                                                name="dob"
                                                type="date"
                                                required
                                            />
                                        </div>

                                        <div className="grid gap-3">
                                            <Label htmlFor="phone">
                                                Phone Number
                                            </Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                placeholder="Enter your phone number"
                                                required
                                            />
                                        </div>

                                        <div className="grid gap-3">
                                            <div className="flex items-center">
                                                <Label htmlFor="password">
                                                    Password
                                                </Label>
                                            </div>
                                            <Input
                                                id="password"
                                                name="password"
                                                type="password"
                                                required
                                            />
                                        </div>

                                        <div className="grid gap-3">
                                            <div className="flex items-center">
                                                <Label htmlFor="confirmPassword">
                                                    Confirm Password *
                                                </Label>
                                            </div>
                                            <Input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type="password"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Right column */}
                                    <div className="flex flex-col gap-6">
                                        <div className="grid gap-3">
                                            <Label htmlFor="location">
                                                Location
                                            </Label>
                                            <Input
                                                id="location"
                                                name="location"
                                                type="text"
                                                placeholder="Country / Region"
                                            />
                                        </div>

                                        <div className="grid gap-3">
                                            <Label htmlFor="company">
                                                Company
                                            </Label>
                                            <Input
                                                id="company"
                                                name="company"
                                                type="text"
                                                placeholder="Company"
                                            />
                                        </div>

                                        <div className="grid gap-3">
                                            <Label htmlFor="street">
                                                Street
                                            </Label>
                                            <Input
                                                id="street"
                                                name="street"
                                                type="text"
                                                placeholder="Street address"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="grid gap-3">
                                                <Label htmlFor="city">
                                                    City
                                                </Label>
                                                <Input
                                                    id="city"
                                                    name="city"
                                                    type="text"
                                                    placeholder="City"
                                                />
                                            </div>
                                            <div className="grid gap-3">
                                                <Label htmlFor="state">
                                                    State / Region
                                                </Label>
                                                <Input
                                                    id="state"
                                                    name="state"
                                                    type="text"
                                                    placeholder="State or region"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-3">
                                            <Label htmlFor="about">About</Label>
                                            <textarea
                                                id="about"
                                                name="about"
                                                placeholder="Tell us a bit about yourself"
                                                className="w-full rounded-md border bg-transparent px-3 py-2 min-h-[13rem] text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Submit button spans both columns */}
                                    <div className="md:col-span-2">
                                        <Button
                                            type="submit"
                                            className="w-full">
                                            Create account
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // Non-signup modes: keep original single-column layout
                                <div className="grid gap-6">
                                    {/* Email field - for all modes */}
                                    <div className="grid gap-3">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="m@example.com"
                                            required
                                        />
                                    </div>

                                    {/* Password fields - hide in forgot mode */}
                                    {mode !== "forgot" && (
                                        <>
                                            <div className="grid gap-3">
                                                <div className="flex items-center">
                                                    <Label htmlFor="password">
                                                        Password
                                                    </Label>
                                                    {mode === "signin" &&
                                                        onForgotPassword && (
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    onForgotPassword
                                                                }
                                                                className="ml-auto text-sm underline-offset-4 hover:underline">
                                                                Forgot your
                                                                password?
                                                            </button>
                                                        )}
                                                </div>
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    required
                                                />
                                            </div>

                                            {mode === "signin" && (
                                                <Button
                                                    type="submit"
                                                    className="w-full">
                                                    Login
                                                </Button>
                                            )}
                                        </>
                                    )}

                                    {mode === "forgot" && (
                                        <Button
                                            type="submit"
                                            className="w-full">
                                            Send Reset Link
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Toggle mode - hide in forgot mode */}
                            {mode !== "forgot" && mode !== "signup" && (
                                <div className="text-center text-sm">
                                    {mode === "signin"
                                        ? "Don't have an account?"
                                        : "Already have an account?"}{" "}
                                    <button
                                        type="button"
                                        onClick={onToggleMode}
                                        className="text-primary underline-offset-4 hover:underline">
                                        {mode === "signin"
                                            ? "Sign up"
                                            : "Sign in"}
                                    </button>
                                </div>
                            )}

                            {/* For signup, show toggle below the columns */}
                            {mode === "signup" && (
                                <div className="text-center text-sm md:col-span-2">
                                    Already have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={onToggleMode}
                                        className="text-primary underline-offset-4 hover:underline">
                                        Sign in
                                    </button>
                                </div>
                            )}
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
//
