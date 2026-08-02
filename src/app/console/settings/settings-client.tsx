"use client";

import * as React from "react";
import { useTheme } from "next-themes";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { FadeIn } from "@/components/motion";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  UserIcon,
  ShieldIcon,
  PaletteIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from "lucide-react";

type Props = {
  user: { name: string; email: string; image: string };
};

export function SettingsClient({ user }: Props) {
  const [name, setName] = React.useState(user.name);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const { theme = "system", setTheme } = useTheme();

  const initials = (user.name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      <FadeIn>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit">
            <TabsTrigger value="profile">
              <UserIcon className="size-4 mr-1" /> Profile
            </TabsTrigger>
            <TabsTrigger value="account">
              <ShieldIcon className="size-4 mr-1" /> Account
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <PaletteIcon className="size-4 mr-1" /> Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Your personal information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback className="text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                </div>

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
                </div>

                <Button size="sm" onClick={() => toast.success("Profile saved")}>
                    Save Changes
                  </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password regularly to keep your account secure.
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
                  <Button
                    size="sm"
                    className="w-fit"
                    disabled={
                      !currentPassword ||
                      !newPassword ||
                      newPassword !== confirmPassword
                    }
                    onClick={() => {
                      toast.success("Password updated");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6 border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </Button>

                <ConfirmDialog
                  open={showDeleteConfirm}
                  onOpenChange={setShowDeleteConfirm}
                  onConfirm={() => {
                    setShowDeleteConfirm(false);
                    // TODO: implement account deletion
                  }}
                  title="Delete account"
                  description="Are you sure? This will permanently delete your account and all associated data. This action cannot be undone."
                  confirmLabel="Delete account"
                  variant="destructive"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how the console looks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      {
                        value: "light" as const,
                        label: "Light",
                        icon: SunIcon,
                      },
                      {
                        value: "dark" as const,
                        label: "Dark",
                        icon: MoonIcon,
                      },
                      {
                        value: "system" as const,
                        label: "System",
                        icon: MonitorIcon,
                      },
                    ].map((opt) => (
                      <Button
                        key={opt.value}
                        variant={
                          theme === opt.value ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setTheme(opt.value)}
                        aria-pressed={theme === opt.value}
                        className="w-full gap-2"
                      >
                        <opt.icon className="size-4" />
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </FadeIn>
    </div>
  );
}
