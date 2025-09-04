import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth/auth.helper";
import type { User } from "@/types/auth";

type Profile = {
    username: string;
    avatarUrl?: string;
    about?: string;
    location?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    company?: string;
    street?: string;
    city?: string;
    state?: string;
};

export default function ProfilePage() {
    const { user } = useAuth();

    // start with empty values; populate from user when available
    const [profile, setProfile] = useState<Profile>({
        username: "",
        avatarUrl: "",
        about: "",
        location: "",
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        company: "",
        street: "",
        city: "",
        state: "",
    });
    const [avatarPreview, setAvatarPreview] =
        useState<string>("/avatars/lewan.jpg");
    const [addingPhone, setAddingPhone] = useState(false);

    // populate profile when user from useAuth becomes available
    useEffect(() => {
        if (!user) return;

        // use Profile type from apps/src/types/auth.ts for strong typing
        const u = user as unknown as Profile;
        const avatar = (user as User).avatarUrl ?? (user as User).avatar ?? "";

        setProfile({
            username: u.username ?? "",
            avatarUrl: u.avatarUrl ? u.avatarUrl : "/avatars/lewan.jpg",
            about: u.about ?? "",
            location: u.location ?? "",
            firstName: u.firstName ?? "",
            lastName: u.lastName ?? "",
            phone: u.phone ?? "",
            email: u.email ?? "",
            company: u.company ?? "",
            street: u.street ?? "",
            city: u.city ?? "",
            state: u.state ?? "",
        });

        setAvatarPreview(String(avatar));
    }, [user]);

    // if user not loaded / not signed in, show message (or replace with spinner)
    if (!user) {
        return <div className="p-8">Not signed in</div>;
    }

    const onChange =
        (k: keyof Profile) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setProfile((prev) => ({ ...prev, [k]: e.target.value }));

    const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setAvatarPreview(url);
    };

    const saveChanges = () => {
        // replace with real API call
        console.debug("Saving profile", profile, "avatar:", avatarPreview);
        alert("Profile saved (mock). Check console for payload.");
    };

    const changePassword = () => {
        alert("Change password flow (mock)");
    };

    const changeEmail = () => {
        alert("Change email flow (mock)");
    };

    console.log("User ID current >>>", user.id);
    console.log("Profile current >>>", profile);

    return (
        <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Account settings</h2>

            {/* center the two cards and top-align their content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
                {/* Left: Information card (smaller) */}
                <div className="lg:col-span-6 bg-white border rounded-lg p-4 shadow-sm text-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-gray-800 font-semibold text-sm">
                                INFORMATION
                            </h3>
                            <p className="text-xs text-gray-500">
                                This information will be publicly displayed and
                                visible for all users.
                            </p>
                        </div>
                        <span className="text-xs bg-rose-500 text-white px-2 py-1 rounded">
                            Pro
                        </span>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="username" className="text-sm">
                                Username
                            </Label>
                            <Input
                                id="username"
                                value={profile.username}
                                onChange={onChange("username")}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div>
                            <Label className="text-sm">Avatar</Label>
                            <div className="flex items-center gap-3">
                                <img
                                    src={
                                        avatarPreview !== ""
                                            ? avatarPreview
                                            : "/avatars/lewan.jpg"
                                    }
                                    alt="avatar"
                                    className="w-20 h-20 rounded-md object-cover border"
                                />
                                <div>
                                    <input
                                        id="avatar"
                                        type="file"
                                        accept="image/*"
                                        onChange={onAvatar}
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        JPG or PNG. Max size 700KB.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="about" className="text-sm">
                                About
                            </Label>
                            <textarea
                                id="about"
                                value={profile.about}
                                onChange={onChange("about")}
                                className={cn(
                                    "w-full rounded-md border px-3 py-2 text-sm",
                                    "min-h-[6rem]"
                                )}
                            />
                        </div>

                        <div>
                            <Label htmlFor="location" className="text-sm">
                                Location
                            </Label>
                            <Input
                                id="location"
                                value={profile.location}
                                onChange={onChange("location")}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="text-right">
                            <Button
                                onClick={saveChanges}
                                className="py-2 px-4 text-sm">
                                Save changes
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right: Private details (wider + taller) */}
                <div className="lg:col-span-6 bg-white border rounded-lg p-8 shadow-sm min-h-[40rem]">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-gray-800 font-semibold text-sm">
                                PRIVATE DETAILS
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                This information will not be publicly displayed.
                            </p>
                        </div>
                        <div className="w-10" />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm">Password</Label>
                            </div>
                            <div>
                                <Button
                                    onClick={changePassword}
                                    variant="secondary"
                                    className="text-sm py-2">
                                    Change password
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="firstName" className="text-sm">
                                    First name
                                </Label>
                                <Input
                                    id="firstName"
                                    value={profile.firstName}
                                    onChange={onChange("firstName")}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName" className="text-sm">
                                    Last name
                                </Label>
                                <Input
                                    id="lastName"
                                    value={profile.lastName}
                                    onChange={onChange("lastName")}
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <Label htmlFor="phone" className="text-sm">
                                    Phone
                                </Label>
                                <Input
                                    id="phone"
                                    value={profile.phone}
                                    onChange={onChange("phone")}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="pt-6">
                                <Button
                                    onClick={() => setAddingPhone(true)}
                                    variant="outline"
                                    className="text-sm py-2">
                                    + Add phone number
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <Label htmlFor="email" className="text-sm">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    value={profile.email}
                                    onChange={onChange("email")}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="pt-6">
                                <Button
                                    onClick={changeEmail}
                                    variant="outline"
                                    className="text-sm py-2">
                                    + Change email
                                </Button>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="company" className="text-sm">
                                Company
                            </Label>
                            <Input
                                id="company"
                                value={profile.company}
                                onChange={onChange("company")}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div>
                            <Label htmlFor="street" className="text-sm">
                                Street
                            </Label>
                            <Input
                                id="street"
                                value={profile.street}
                                onChange={onChange("street")}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div>
                            <Label htmlFor="city" className="text-sm">
                                City
                            </Label>
                            <Input
                                id="city"
                                value={profile.city}
                                onChange={onChange("city")}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div>
                            <Label htmlFor="state" className="text-sm">
                                State/Region
                            </Label>
                            <Input
                                id="state"
                                value={profile.state}
                                onChange={onChange("state")}
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* optional small phone input modal / inline quick add */}
            {addingPhone && (
                <div className="fixed inset-0 grid place-items-center bg-black/40">
                    <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                        <h4 className="font-semibold mb-3">Add phone number</h4>
                        <Input
                            placeholder="Phone"
                            onChange={(e) =>
                                setProfile((p) => ({
                                    ...p,
                                    phone: e.target.value,
                                }))
                            }
                        />
                        <div className="mt-4 text-right">
                            <Button
                                variant="ghost"
                                onClick={() => setAddingPhone(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="ml-2"
                                onClick={() => {
                                    setAddingPhone(false);
                                    saveChanges();
                                }}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
