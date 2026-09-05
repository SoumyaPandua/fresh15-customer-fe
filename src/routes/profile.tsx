import { createFileRoute, Link, useNavigate } from "@/lib/next-router-compat";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, MapPin, CreditCard, Bell, BellRing, HelpCircle, Shield, FileText, LogOut, ChevronRight, Edit3, Camera, KeyRound, Gift, ReceiptText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/store/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { profileApi } from "@/lib/profile-api";
import { getErrorMessage } from "@/lib/auth-api";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Fresh15" },
      { name: "description", content: "Manage your Fresh15 account, addresses and preferences." },
      { property: "og:title", content: "Profile — Fresh15" },
      { property: "og:description", content: "Manage your account." },
    ],
  }),
  component: ProfilePage,
});

function toDateInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function ProfilePage() {
  const { user, token, isGuest, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", gender: "", dob: "" });

  const enabled = Boolean(token);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["profile"],
    enabled,
    queryFn: async () => (await profileApi.get(token)).data,
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.user?.name ?? "",
      email: data.user?.email ?? "",
      phone: data.user?.phone ?? "",
      gender: data.profile?.gender ?? "",
      dob: toDateInput(data.profile?.dob),
    });
    updateProfile({
      id: data.user?._id,
      name: data.user?.name,
      email: data.user?.email,
      phone: data.user?.phone ?? "",
      avatar: data.user?.profileImage || data.profile?.avatar || undefined,
      role: data.user?.role,
      isEmailVerified: data.user?.isEmailVerified,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const displayUser =
    user ?? (isGuest ? { name: "Guest", email: "guest@fresh15.app", phone: "", avatar: undefined } : null);

  if (!displayUser) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md rounded-3xl border bg-card p-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-3xl">👋</div>
          <h1 className="text-xl font-bold">Sign in to Fresh15</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track orders, save addresses and enjoy faster checkout.</p>
          <Link to="/auth/login" className="mt-5 inline-block w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
            Login / Sign up
          </Link>
        </div>
      </AppLayout>
    );
  }

  async function onSave() {
    setSaving(true);
    try {
      const res = await profileApi.update(token, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        ...(form.gender ? { gender: form.gender } : {}),
        ...(form.dob ? { dob: form.dob } : {}),
      });
      const u = res.data.user;
      updateProfile({
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? "",
        avatar: u.profileImage || res.data.profile?.avatar || undefined,
        role: u.role,
        isEmailVerified: u.isEmailVerified,
      });
      await refetch();
      setEditing(false);
      toast.success(res.message || "Profile updated successfully");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const res = await profileApi.updateAvatar(token, file);
      const url = res.data.profileImage || res.data.avatar;
      if (url) updateProfile({ avatar: url });
      await refetch();
      toast.success(res.message || "Avatar updated successfully");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const avatarUrl = user?.avatar;

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        {enabled && isLoading ? (
          <div className="h-[132px] animate-pulse rounded-3xl border bg-card" />
        ) : (
          <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6">
            {enabled && error && (
              <div className="mb-4 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                {getErrorMessage(error)}
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={`${displayUser.name} avatar`} className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-primary text-3xl font-black text-primary-foreground">
                    {displayUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {user && (
                  <>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      aria-label="Change profile photo"
                      className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border bg-surface-elevated text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickAvatar(e.target.files?.[0])}
                    />
                  </>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-black">{displayUser.name}</div>
                <div className="truncate text-sm text-muted-foreground">{displayUser.email}</div>
                {displayUser.phone && <div className="text-sm text-muted-foreground">{displayUser.phone}</div>}
                {uploading && <div className="text-xs font-semibold text-primary">Uploading photo…</div>}
              </div>
              {user && (
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-full border bg-surface-elevated px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
            {isGuest && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/auth/login" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Sign in</Link>
                <Link to="/auth/signup" className="rounded-full border bg-surface-elevated px-4 py-2 text-xs font-bold">Create account</Link>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Tile to="/orders" icon={<User className="h-5 w-5" />} title="My orders" sub="Track & re-order" />
          <Tile to="/addresses" icon={<MapPin className="h-5 w-5" />} title="Saved addresses" sub="Home, work & more" />
          <Tile to="/profile" icon={<CreditCard className="h-5 w-5" />} title="Saved payments" sub="Cards & UPI (demo)" />
          <Tile to="/notifications" icon={<Bell className="h-5 w-5" />} title="Notifications" sub="Order & offer updates" />
          <Tile to="/alerts" icon={<BellRing className="h-5 w-5" />} title="My alerts" sub="Restock & price drops" />
          <Tile to="/loyalty" icon={<Gift className="h-5 w-5" />} title="FreshPoints" sub="Rewards & referrals" />
          <Tile to="/refunds" icon={<ReceiptText className="h-5 w-5" />} title="My refunds" sub="Track refund requests" />
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card">
          {user && (
            <button onClick={() => setPwOpen(true)} className="flex w-full items-center gap-3 border-b p-4 text-left hover:bg-muted">
              <div className="text-primary"><KeyRound className="h-4 w-4" /></div>
              <div className="flex-1 text-sm font-semibold">Change password</div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <MenuItem to="/help" icon={<HelpCircle className="h-4 w-4" />} label="Help center" />
          <MenuItem to="/privacy" icon={<Shield className="h-4 w-4" />} label="Privacy policy" />
          <MenuItem to="/terms" icon={<FileText className="h-4 w-4" />} label="Terms & conditions" />
          <button
            onClick={() => {
              logout();
              toast.success("Logged out");
              navigate({ to: "/" });
            }}
            className="flex w-full items-center gap-3 border-t p-4 text-left text-sm text-destructive hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4" /> <span className="flex-1 font-semibold">Log out</span> <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="pt-2 text-center text-xs text-muted-foreground">Fresh15 · v1.0.0 · Made with 💚 in India ~ Srp</div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Prefer not to say</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditing(false)} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} token={token} />
    </AppLayout>
  );
}

function ChangePasswordDialog({ open, onOpenChange, token }: { open: boolean; onOpenChange: (v: boolean) => void; token: string | null }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return toast.error("Current password is required");
    if (next.length < 6) return toast.error("New password must be at least 6 characters");
    if (next !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      const res = await profileApi.changePassword(token, { currentPassword: current, newPassword: next });
      reset();
      onOpenChange(false);
      toast.success(res.message || "Password changed successfully");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="cur">Current password</Label>
            <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cnf">Confirm new password</Label>
            <Input id="cnf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {loading ? "Updating…" : "Update password"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Tile({ to, icon, title, sub }: { to: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function MenuItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 border-b p-4 last:border-b-0 hover:bg-muted">
      <div className="text-primary">{icon}</div>
      <div className="flex-1 text-sm font-semibold">{label}</div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
