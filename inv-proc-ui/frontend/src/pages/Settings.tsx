import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { useDocStore } from "../store/docStore";

type LocalUser = { id: string; name: string; role: "admin" | "reviewer" };

export default function Settings() {
  const threshold = useDocStore((s) => s.settings.confidenceThreshold);
  const setThreshold = useDocStore((s) => s.setConfidenceThreshold);

  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [users, setUsers] = useState<LocalUser[]>([]);

  useEffect(() => {
    const k = localStorage.getItem("settings.apiKey") ?? "";
    const b = localStorage.getItem("settings.apiBase") ?? "";
    const u = localStorage.getItem("settings.users");
    setApiKey(k);
    setApiBase(b);
    setUsers(u ? (JSON.parse(u) as LocalUser[]) : []);
  }, []);

  const onSaveIntegrations = () => {
    localStorage.setItem("settings.apiKey", apiKey);
    localStorage.setItem("settings.apiBase", apiBase);
  };

  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "reviewer">("reviewer");
  const addUser = () => {
    if (!newUserName.trim()) return;
    const user: LocalUser = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name: newUserName.trim(), role: newUserRole };
    const next = [...users, user];
    setUsers(next);
    localStorage.setItem("settings.users", JSON.stringify(next));
    setNewUserName("");
    setNewUserRole("reviewer");
  };
  const removeUser = (id: string) => {
    const next = users.filter((u) => u.id !== id);
    setUsers(next);
    localStorage.setItem("settings.users", JSON.stringify(next));
  };

  const thresholdPct = useMemo(() => Math.round(threshold * 100), [threshold]);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Settings / Admin</h1>

      <section className="mb-6 rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Model Settings</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-center">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-foreground/60">Confidence threshold ({thresholdPct}%)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={thresholdPct}
              onChange={(e) => setThreshold(Number(e.target.value) / 100)}
              className="w-full"
            />
          </div>
          <div>
            <div className="rounded-md border bg-background p-3 text-sm">Auto-approve predictions with confidence ≥ {thresholdPct}%</div>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Integrations / API</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-foreground/60">API Base URL</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="https://api.example.com"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/60">API Key</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onSaveIntegrations}>Save</Button>
        </div>
      </section>

      <section className="mb-6 rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">User Management</h2>
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Full name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as any)}
          >
            <option value="reviewer">Reviewer</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex items-center">
            <Button type="button" onClick={addUser}>Add User</Button>
          </div>
        </div>

        <div className="overflow-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-foreground/60">Name</th>
                <th className="p-3 text-left text-xs font-semibold text-foreground/60">Role</th>
                <th className="p-3 text-left text-xs font-semibold text-foreground/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">
                    <Button variant="destructive" size="sm" onClick={() => removeUser(u.id)}>Remove</Button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={3}>No users yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
