import { Link } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { useDocStore } from "../store/docStore";
import { fetchAnalyticsOverview } from "../lib/api";

export default function Dashboard() {
  const documents = useDocStore((s) => s.documents);
  const uploads = useDocStore((s) => s.uploads);
  const loadDocuments = useDocStore((s) => s.loadDocuments);
  const [overview, setOverview] = useState<{ processed: number; pending: number; errors: number; today: number } | null>(null)

  const docs = useMemo(() => Object.values(documents), [documents]);
  const recent = useMemo(
    () => docs.slice().sort((a, b) => (a.uploadedAt > b.uploadedAt ? -1 : 1)).slice(0, 10),
    [docs]
  );
  const totalProcessed = overview?.processed ?? 0
  const pending = overview?.pending ?? Object.keys(uploads).length
  const errors = overview?.errors ?? 0
  const today = overview?.today ?? 0

  useEffect(() => {
    loadDocuments();
    // fetch backend analytics overview
    fetchAnalyticsOverview().then(setOverview).catch(() => {})
  }, [loadDocuments]);

  return (
    <main className="relative mx-auto max-w-7xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>

      {/* Stats cards */}
      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Processed" value={totalProcessed} barClass="bg-amber-500" />
        <StatCard title="Pending Review" value={pending} barClass="bg-amber-400" />
        <StatCard title="Errors" value={errors} barClass="bg-red-500" />
        <StatCard title="Today" value={today} barClass="bg-amber-300" />
      </section>

      {/* Recent documents table */}
      <section>
        <h2 className="my-3 text-lg font-semibold">Recent Documents</h2>
        <div className="overflow-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-secondary">
              <tr>
                <Th>Document Name</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Date Uploaded</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t">
                  <Td className="truncate">{r.name}</Td>
                  <Td>{r.type}</Td>
                  <Td><StatusPill status={r.status} /></Td>
                  <Td>{r.uploadedAt.slice(0,10)}</Td>
                  <Td>
                    {r.status !== "Pending" ? (
                      <Link to={`/review/${encodeURIComponent(r.id)}`} className="font-semibold text-amber-900 hover:underline">View</Link>
                    ) : (
                      <span className="text-foreground/60">Processing…</span>
                    )}
                  </Td>
                </tr>
              ))}
              {!recent.length && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-foreground/60">No documents yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Floating upload button */}
      <div className="fixed bottom-6 right-6">
        <Button asChild size="lg">
          <Link to="/upload">Upload Document</Link>
        </Button>
      </div>
    </main>
  );
}

function StatCard({ title, value, barClass }: { title: string; value: number; barClass: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <span className="text-xs text-foreground/60">{title}</span>
      <div className="mt-1 text-2xl font-extrabold text-foreground">{value}</div>
      <div className={`mt-3 h-1 w-full rounded-full ${barClass}`} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="p-3 text-left text-xs font-semibold text-foreground/60">{children}</th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`p-3 text-sm ${className}`}>{children}</td>
  );
}

function StatusPill({ status }: { status: "Processed" | "Pending" | "Error" }) {
  const color = status === "Processed" ? "text-green-700 bg-green-100" : status === "Pending" ? "text-amber-700 bg-amber-100" : "text-red-700 bg-red-100";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold ${color}`}>{status}</span>
  );
}
