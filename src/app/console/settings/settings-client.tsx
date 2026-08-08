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
import { updateUser, requestPasswordReset, useSession } from "@/lib/auth/client";
import {
  UserIcon,
  ShieldIcon,
  UploadIcon,
  Trash2Icon,
  Loader2,
  MailIcon,
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

  const [sendingResetLink, setSendingResetLink] = React.useState(false);
  const [resetLinkSent, setResetLinkSent] = React.useState(false);

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

  /**
   * Professional password change: instead of accepting a new password inline,
   * email a single-use confirmation link to the account's address. The user
   * opens the link and sets a new password there — this proves inbox control
   * and revokes all other sessions on completion.
   */
  const sendPasswordResetLink = async () => {
    if (sendingResetLink) return;
    setSendingResetLink(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const res = await requestPasswordReset({
      email: user.email,
      redirectTo,
    });
    setSendingResetLink(false);
    if (res.error) {
      toast.error(res.error.message ?? "Could not send the confirmation link");
      return;
    }
    setResetLinkSent(true);
    toast.success(`Confirmation link sent to ${user.email}`);
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
              Keep your account secure. Password changes are confirmed by email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 max-w-md">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MailIcon className="size-4 text-primary" aria-hidden="true" />
                  Change password
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  For your protection, we&apos;ll email a single-use
                  confirmation link to{" "}
                  <span className="font-medium text-foreground">
                    {user.email}
                  </span>
                  . Open it to choose a new password. All other sessions are
                  signed out when the password changes.
                </p>
              </div>

              {resetLinkSent ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    Link sent — check your inbox (and spam folder). It expires
                    in 60 minutes.
                  </div>
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={sendPasswordResetLink}
                      disabled={sendingResetLink}
                    >
                      {sendingResetLink && (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      )}
                      Send again
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button
                    size="sm"
                    onClick={sendPasswordResetLink}
                    disabled={sendingResetLink}
                  >
                    {sendingResetLink && (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    )}
                    Email me a reset link
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
