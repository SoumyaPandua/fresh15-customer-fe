import { createFileRoute } from "@/lib/next-router-compat";
import { useState } from "react";
import { Home, Briefcase, MapPin, Plus, Edit3, Trash2, Check, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAddressBook } from "@/lib/hooks/use-address-book";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Address } from "@/lib/types";

export const Route = createFileRoute("/addresses")({
  head: () => ({
    meta: [
      { title: "Addresses — Fresh15" },
      { name: "description", content: "Manage your saved delivery addresses." },
      { property: "og:title", content: "Addresses — Fresh15" },
      { property: "og:description", content: "Manage saved addresses." },
    ],
  }),
  component: AddressesPage,
});

const empty: Omit<Address, "id"> = {
  label: "Home",
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  latitude: null,
  longitude: null,
};

function AddressesPage() {
  const book = useAddressBook();
  const { addresses, activeAddressId } = book;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<Omit<Address, "id">>(empty);
  const [checking, setChecking] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(a: Address) {
    setEditing(a);
    setForm(a);
    setOpen(true);
  }
  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Location is not supported by this browser");
      return;
    }

    setChecking(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));

        toast.success("Delivery location captured");

        setChecking(false);
      },
      (error) => {
        setChecking(false);

        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Please allow location access");
          return;
        }

        toast.error("Unable to get your current location");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }
  async function save() {
    if (!form.name || !form.line1 || !form.pincode || !form.phone || !form.city || !form.state) {
      if (form.latitude === null || form.longitude === null) {
        toast.error("Please capture your delivery location before saving");
        return;
      }
      toast.error("Please fill required fields");
      return;
    }
    setChecking(true);
    try {
      const r = await api.checkPincode(form.pincode);
      if (!r.serviceable) {
        toast.error("Sorry, we don't deliver to this pincode yet");
        return;
      }
      const msg = editing ? await book.update(editing.id, form) : await book.create(form);
      toast.success(msg);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  }
  async function run(id: string, fn: () => Promise<string>) {
    setPendingId(id);
    try {
      toast.success(await fn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Saved addresses</h1>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add new
        </button>
      </div>

      {book.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
      )}

      {!book.isLoading && book.error && (
        <div className="rounded-2xl border bg-card p-6 text-center text-sm">
          <p className="font-semibold text-destructive">{book.error}</p>
          <button
            onClick={() => void book.refetch()}
            className="mt-3 rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted"
          >
            Try again
          </button>
        </div>
      )}

      {!book.isLoading && !book.error && addresses.length === 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="text-3xl">📍</div>
          <p className="mt-2 text-sm font-semibold">No saved addresses yet</p>
          <p className="text-xs text-muted-foreground">Add a delivery address to get started.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a: Address) => {
          const Icon = a.label === "Home" ? Home : a.label === "Work" ? Briefcase : MapPin;
          const active = a.id === activeAddressId;
          return (
            <div
              key={a.id}
              className={"rounded-2xl border bg-card p-4 " + (active ? "border-primary ring-2 ring-primary/20" : "")}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="font-bold">{a.label}</div>
                {active && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                    <Check className="h-3 w-3" /> Active
                  </span>
                )}
              </div>
              <div className="text-sm">
                <div className="font-semibold">{a.name}</div>
                <div className="text-muted-foreground">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                </div>
                <div className="text-muted-foreground">
                  {a.city}, {a.state} {a.pincode}
                </div>
                <div className="mt-1 text-muted-foreground">{a.phone}</div>
              </div>
              <div className="mt-3 flex gap-2">
                {!active && (
                  <button
                    disabled={pendingId === a.id}
                    onClick={() => void run(a.id, () => book.setActive(a.id))}
                    className="inline-flex items-center gap-1 rounded-full border bg-surface-elevated px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                  >
                    {pendingId === a.id && <Loader2 className="h-3 w-3 animate-spin" />} Set active
                  </button>
                )}
                <button
                  onClick={() => openEdit(a)}
                  className="inline-flex items-center gap-1 rounded-full border bg-surface-elevated px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
                <button
                  disabled={pendingId === a.id}
                  onClick={() => void run(a.id, () => book.remove(a.id))}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit address" : "Add new address"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Save as</Label>
              <div className="mt-1 flex gap-2">
                {(["Home", "Work", "Other"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setForm({ ...form, label: l })}
                    className={
                      "rounded-full border px-4 py-1.5 text-sm " +
                      (form.label === l ? "border-primary bg-primary/5 text-primary" : "")
                    }
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Full name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address line 1 *</Label>
              <Input
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                placeholder="House / Flat no, Building"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Address line 2</Label>
              <Input
                value={form.line2}
                onChange={(e) => setForm({ ...form, line2: e.target.value })}
                placeholder="Street, Landmark"
              />
            </div>
            <div className="sm:col-span-2 rounded-2xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Delivery location</div>

                  <div className="text-xs text-muted-foreground">
                    Use your current location so we can track delivery accurately.
                  </div>

                  {form.latitude != null && form.longitude != null && (
                    <div className="mt-1 text-[11px] text-primary">
                      Location captured: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={checking}
                  className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                >
                  {checking ? "Getting location..." : "Use current location"}
                </button>
              </div>
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <Label>Pincode *</Label>
              <Input
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-full border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              disabled={checking}
              onClick={save}
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {checking ? "Checking…" : "Save address"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
