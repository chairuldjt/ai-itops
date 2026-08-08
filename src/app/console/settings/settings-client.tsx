"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/motion";
import { updateUser, changePassword, useSession } from "@/lib/auth/client";
import {
  UserIcon,
  ShieldIcon,
  UploadIcon,
  Trash2Icon,
  Loader2,
} from "lucide-react";

type Props = {
  user: { name: string; email: string; image: string };
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

export function SettingsClient({ user }: Props) {
  const router = useRouter();
  const { data: session } = useSession();

  const [name, setName] = React.useState(user.name);
  const [savingProfile, setSavingProfile] = React.useState(false);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  // Prefer the live session image (updates after upload), fall back to prop.
  const liveImage =
    ((session?.user as { image?: string } | undefined)?.image as string) ?? user.image;

  const initials = (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSavingProfile(true);
    const res = await updateUser({ name: name.trim() });
    setSavingProfile(false);
    if (res.error) {
      toast.error(res.error.message ?? "Could not update profile");
      return;
    }
    toast.success("Profile saved");
    router.refresh();
  };

  const onPickAvatar = () => fileInputRef.current?.click();

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploadingAvatar(true);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }).catch(() => null);

    if (!dataUrl) {
      setUploadingAvatar(false);
      toast.error("Could not read the image");
      return;
    }

    const res = await updateUser({ image: dataUrl });
    setUploadingAvatar(false);
    if (res.error) {
      toast.error(res.error.message ?? "Could not update avatar");
      return;
    }
    toast.success("Avatar updated");
    router.refresh();
  };

  const removeAvatar = async () => {
    setUploadingAvatar(true);
    const res = await updateUser({ image: "" });
    setUploadingAvatar(false);
    if (res.error) {
      toast.error(res.error.message ?? "Could not remove avatar");
      return;
    }
    toast.success("Avatar removed");
    router.refresh();
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Fill in your current and new password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    const res = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });
    setSavingPassword(false);
    if (res.error) {
      toast.error(res.error.message ?? "Could not change password");
      return;
    }
    toast.success("Password updated");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your account and security."
      />

      <FadeIn>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="size-4 text-primary" aria-hidden="true" />
              Profile
            </CardTitle>
            <CardDescription>Your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={liveImage} alt={name} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPickAvatar}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <UploadIcon className="size-4 mr-1.5" />
                  )}
                  Upload photo
                </Button>
                {liveImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeAvatar}
                    disabled={uploadingAvatar}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2Icon className="size-4 mr-1.5" />
                    Remove
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarFile}
                />
              </div>
            </div>

            {/* Name + email */}
            <div className="grid gap-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  value={user.email}
                  disabled
                  className="opacity-60"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed.
                </p>
              </div>
              <div>
                <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="size-4 text-primary" aria-hidden="true" />
              Security
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div>
                <Button size="sm" onClick={savePassword} disabled={savingPassword}>
                  {savingPassword && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
