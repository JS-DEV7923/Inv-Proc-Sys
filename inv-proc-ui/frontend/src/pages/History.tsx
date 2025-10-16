import { useMemo, useState, useEffect } from "react";
import { useDocStore } from "../store/docStore";
import { Button } from "../components/ui/button";
import { format, parseISO, isWithinInterval } from "date-fns";
import { unparse } from "papaparse";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { fetchDocumentsPerDay } from "../lib/api";

type Status = "Processed" | "Pending" | "Error";

export default function History() {
  const documents = useDocStore((s) => s.documents);
  const docs = useMemo(() => Object.values(documents), [documents]);

  const [type, setType] = useState("All");
  const [status, setStatus] = useState<"All" | Status>("All");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const filtered = useMemo(() => {
    const f = docs.filter((d) => {
      if (type !== "All" && d.type !== type) return false;
      if (status !== "All" && d.status !== status) return false;
      if (from && to) {
        const fromDate = parseISO(from);
        const toDate = parseISO(to);
        const up = parseISO(d.uploadedAt);
        if (!isWithinInterval(up, { start: fromDate, end: toDate })) return false;
      }
      return true;
    });
    return f.sort((a, b) => (a.uploadedAt > b.uploadedAt ? -1 : 1));
  }, [docs, type, status, from, to]);

  const localPerDay = useMemo(() => {
    const map: Record<string, { date: string; processed: number; errors: number; total: number; avgMs: number; sumMs: number }> = {};
    filtered.forEach((d) => {
      const day = d.uploadedAt.slice(0, 10);
      if (!map[day]) map[day] = { date: day, processed: 0, errors: 0, total: 0, avgMs: 0, sumMs: 0 };
      map[day].total += 1;
      if (d.status === "Processed") map[day].processed += 1;
      if (d.status === "Error") map[day].errors += 1;
      if (typeof d.processingMs === "number") map[day].sumMs += d.processingMs;
    });
    return Object.values(map)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((x) => ({ ...x, avgMs: x.total ? Math.round(x.sumMs / x.total) : 0 }));
  }, [filtered]);

  const [serverPerDay, setServerPerDay] = useState<Array<{ date: string; total: number; errors: number }>>([]);

  useEffect(() => {
    const params: { from?: string; to?: string } = {};
    if (from) params.from = from;
    if (to) params.to = to;
    fetchDocumentsPerDay(params)
      .then((resp) => setServerPerDay(resp.items || []))
      .catch(() => setServerPerDay([]));
  }, [from, to]);

  const chartPerDay = useMemo(() => {
    if (serverPerDay.length) {
      // Enrich with avgMs=0 placeholder for compatibility with charts
      return serverPerDay.map((d) => ({ ...d, avgMs: 0 }));
    }
    return localPerDay;
  }, [serverPerDay, localPerDay]);

  const onExportCSV = () => {
    const data = filtered.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      status: d.status,
      uploadedAt: d.uploadedAt,
      processedAt: d.processedAt ?? "",
      processingMs: d.processingMs ?? "",
      invoiceId: d.invoiceId ?? "",
      vendor: d.vendor ?? "",
      date: d.date ?? "",
      total: d.total ?? "",
    }));
    const csv = unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onExportJSON = () => {
    const json = JSON.stringify(filtered, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "history.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-7xl p-4">
      <h1 className="mb-4 text-2xl font-bold">History & Analytics</h1>

      {/* Filters */}
      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs text-foreground/60">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option>All</option>
            <option>Invoice</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/60">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option>All</option>
            <option>Processed</option>
            <option>Pending</option>
            <option>Error</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/60">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/60">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={onExportCSV} size="sm" variant="secondary">Export CSV</Button>
          <Button onClick={onExportJSON} size="sm">Export JSON</Button>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-secondary">
            <tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Uploaded</Th>
              <Th>Processed</Th>
              <Th>Proc Time (ms)</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-t">
                <Td>{d.id}</Td>
                <Td className="truncate">{d.name}</Td>
                <Td>{d.type}</Td>
                <Td>{d.status}</Td>
                <Td>{format(parseISO(d.uploadedAt), "yyyy-MM-dd HH:mm")}</Td>
                <Td>{d.processedAt ? format(parseISO(d.processedAt), "yyyy-MM-dd HH:mm") : "-"}</Td>
                <Td>{typeof d.processingMs === "number" ? d.processingMs : "-"}</Td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-foreground/60">No documents for the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Charts */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-3">
          <h3 className="mb-2 text-sm font-semibold">Docs per day & Error count</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartPerDay} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#00ffd5" name="Total" strokeWidth={2} />
              <Line type="monotone" dataKey="errors" stroke="#ff2bd6" name="Errors" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <h3 className="mb-2 text-sm font-semibold">Avg processing time (ms)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartPerDay} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="avgMs" fill="#b8ff00" name="Avg ms" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-3 text-left text-xs font-semibold text-foreground/60">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-3 text-sm ${className}`}>{children}</td>;
}
