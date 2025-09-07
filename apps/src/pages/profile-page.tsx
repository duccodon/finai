import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth/auth.helper';
import type { User as AnyUser } from '@/types/auth';

import {
  updateMe,
  type UpdateUserDto,
  type PublicUser,
} from '@/services/userService';

type Profile = {
  username: string;
  avatarUrl?: string | null;
  about?: string | null;
  location?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // form state
  const [profile, setProfile] = useState<Profile>({
    username: '',
    avatarUrl: '',
    about: '',
    location: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    street: '',
    city: '',
    state: '',
  });

  // lưu bản gốc để so sánh
  const [initialProfile, setInitialProfile] = useState<Profile | null>(null);

  const [avatarPreview, setAvatarPreview] =
    useState<string>('/avatars/lewan.jpg');
  const [addingPhone, setAddingPhone] = useState(false);

  // change password modal state & inputs
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // populate profile khi user có sẵn
  useEffect(() => {
    if (!user) return;

    const u = user as unknown as Record<string, unknown>;
    const avatar =
      (u['avatarUrl'] as string) ??
      (u['avatar'] as string) ??
      '/avatars/lewan.jpg';

    const next: Profile = {
      username: (u['username'] as string) ?? '',
      avatarUrl: (u['avatarUrl'] as string) ?? '/avatars/lewan.jpg',
      about: (u['about'] as string) ?? '',
      location: (u['location'] as string) ?? '',
      firstName: (u['firstName'] as string) ?? '',
      lastName: (u['lastName'] as string) ?? '',
      phone: (u['phone'] as string) ?? '',
      email: (u['email'] as string) ?? '',
      company: (u['company'] as string) ?? '',
      street: (u['street'] as string) ?? '',
      city: (u['city'] as string) ?? '',
      state: (u['state'] as string) ?? '',
    };

    setProfile(next);
    setInitialProfile(next);
    setAvatarPreview(String(avatar));
  }, [user]);

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
    // Nếu sau này có upload thật, bạn upload file tại đây, nhận URL => set profile.avatarUrl = URL tuyệt đối
  };

  // Tạo patch chỉ gồm field thay đổi; bỏ qua avatarUrl nếu preview chỉ là blob local
  function buildPatch(
    current: Profile,
    baseline: Profile | null,
    previewUrl: string
  ): UpdateUserDto {
    const patch: UpdateUserDto = {};

    const keys: (keyof Profile)[] = [
      'username',
      'about',
      'location',
      'firstName',
      'lastName',
      'phone',
      'email',
      'company',
      'street',
      'city',
      'state',
      'avatarUrl',
    ];

    for (const k of keys) {
      const cur = (current[k] ?? null) as string | null;
      const base = (baseline ? baseline[k] : undefined) ?? null;

      if (cur !== base) {
        patch[k] = cur as any;
      }
    }

    if (previewUrl?.startsWith('blob:')) {
      delete patch.avatarUrl;
    }

    return patch;
  }

  const saveChanges = async () => {
    // user từ context có type rộng; ép lấy id an toàn
    const userId = (user as unknown as Record<string, unknown>)?.['id'] as
      | string
      | undefined;

    if (!userId) {
      alert('User not found');
      return;
    }

    try {
      setSaving(true);

      const patch = buildPatch(profile, initialProfile, avatarPreview);

      if (Object.keys(patch).length === 0) {
        alert('Nothing to update');
        return;
      }

      const updated = await updateMe(userId, patch);

      // Đồng bộ lại form theo dữ liệu server
      const normalized: Profile = {
        username: updated.username ?? '',
        avatarUrl: updated.avatarUrl ?? '/avatars/lewan.jpg',
        about: updated.about ?? '',
        location: updated.location ?? '',
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        phone: updated.phone ?? '',
        email: updated.email ?? '',
        company: updated.company ?? '',
        street: updated.street ?? '',
        city: updated.city ?? '',
        state: updated.state ?? '',
      };

      setProfile(normalized);
      setInitialProfile(normalized);
      if (updated.avatarUrl) setAvatarPreview(updated.avatarUrl);

      alert('Profile saved successfully');
      console.debug('Updated user >>>', updated);
    } catch (err) {
      console.error(err);
      const msg =
        (err as any)?.response?.data?.message ??
        (err as any)?.message ??
        'Failed to save profile';
      alert(msg);
    } finally {
      setOldPassword('');
      setNewPassword('');
      setNewPassword('');
      setSaving(false);
    }
  };

  // open change password modal
  const openChangePassword = () => {
    setChangePasswordOpen(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // handle change password save
  const handleChangePassword = async () => {
    // simple client-side validation
    if (!oldPassword) {
      alert('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    // new password must be different from current password
    if (oldPassword === newPassword) {
      alert('New password must be different from current password');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      alert('New password and confirmation do not match');
      return;
    }

    const userId = (user as unknown as Record<string, unknown>)?.['id'] as
      | string
      | undefined;

    if (!userId) {
      alert('User not found');
      return;
    }

    try {
      setChangingPassword(true);
      // Note: backend updateMe here does not verify oldPassword in this example.
      // If your backend requires old password verification, call the appropriate endpoint.
      const result = await updateMe(userId, {
        password: newPassword,
        oldPassword: oldPassword,
      });
      alert('Password changed successfully');
      setChangePasswordOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      console.error(err);
      const msg =
        (err as any)?.response?.data?.message ??
        (err as any)?.message ??
        'Failed to change password';
      alert(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const changeEmail = () => {
    alert('Change email flow (mock)');
  };

  console.log('User ID current >>>', (user as any)?.id);
  console.log('Profile current >>>', profile);

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
                This information will be publicly displayed and visible for all
                users.
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
                onChange={onChange('username')}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-sm">Avatar</Label>
              <div className="flex items-center gap-3">
                <img
                  src={
                    avatarPreview !== '' ? avatarPreview : '/avatars/lewan.jpg'
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
                value={profile.about ?? ''}
                onChange={onChange('about')}
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-sm',
                  'min-h-[6rem]'
                )}
              />
            </div>

            <div>
              <Label htmlFor="location" className="text-sm">
                Location
              </Label>
              <Input
                id="location"
                value={profile.location ?? ''}
                onChange={onChange('location')}
                className="h-9 text-sm"
              />
            </div>

            <div className="text-right">
              <Button
                onClick={saveChanges}
                className="py-2 px-4 text-sm"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save changes'}
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
                  onClick={openChangePassword}
                  variant="secondary"
                  className="text-sm py-2"
                >
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
                  value={profile.firstName ?? ''}
                  onChange={onChange('firstName')}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm">
                  Last name
                </Label>
                <Input
                  id="lastName"
                  value={profile.lastName ?? ''}
                  onChange={onChange('lastName')}
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
                  value={profile.phone ?? ''}
                  onChange={onChange('phone')}
                  className="h-9 text-sm"
                />
              </div>
              <div className="pt-6">
                <Button
                  onClick={() => setAddingPhone(true)}
                  variant="outline"
                  className="text-sm py-2"
                >
                  + Add phone number
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                value={profile.email ?? ''}
                onChange={onChange('email')}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="company" className="text-sm">
                Company
              </Label>
              <Input
                id="company"
                value={profile.company ?? ''}
                onChange={onChange('company')}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="street" className="text-sm">
                Street
              </Label>
              <Input
                id="street"
                value={profile.street ?? ''}
                onChange={onChange('street')}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="city" className="text-sm">
                City
              </Label>
              <Input
                id="city"
                value={profile.city ?? ''}
                onChange={onChange('city')}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="state" className="text-sm">
                State/Region
              </Label>
              <Input
                id="state"
                value={profile.state ?? ''}
                onChange={onChange('state')}
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
              <Button variant="ghost" onClick={() => setAddingPhone(false)}>
                Cancel
              </Button>
              <Button
                className="ml-2"
                onClick={() => {
                  setAddingPhone(false);
                  void saveChanges();
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* change password modal */}
      {changePasswordOpen && (
        <div className="fixed inset-0 grid place-items-center bg-black/40">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h4 className="font-semibold mb-3">Change password</h4>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
            <div className="mt-4 text-right">
              <Button
                variant="ghost"
                onClick={() => {
                  setChangePasswordOpen(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="ml-2"
                onClick={() => {
                  void handleChangePassword();
                }}
                disabled={changingPassword}
              >
                {changingPassword ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
