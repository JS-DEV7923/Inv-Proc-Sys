import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDocStore } from "../store/docStore";
import { Button } from "../components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Document, Page, pdfjs } from "react-pdf";

// Use CDN worker to avoid bundler worker configuration issues
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const schema = z.object({
  invoiceId: z.string().min(1, "Required"),
  vendor: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
  total: z.coerce.number().nonnegative(),
  lineItems: z
    .array(
      z.object({
        item: z.string().min(1),
        qty: z.coerce.number().int().min(1),
        price: z.coerce.number().min(0),
      })
    )
    .min(1),
});

type FormValues = z.infer<typeof schema>;

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const doc = useDocStore((s) => (id ? s.documents[id] : undefined));
  const updateDocument = useDocStore((s) => s.updateDocument);
  const approveDocument = useDocStore((s) => s.approveDocument);
  const rejectDocument = useDocStore((s) => s.rejectDocument);

  const isPdf = useMemo(() => (doc?.name.toLowerCase().endsWith(".pdf") ?? false), [doc?.name]);

  const formDefaults: FormValues = {
    invoiceId: doc?.invoiceId ?? "",
    vendor: doc?.vendor ?? "",
    date: doc?.date ?? new Date().toISOString().slice(0, 10),
    total: doc?.total ?? 0,
    lineItems: doc?.lineItems?.length ? doc!.lineItems! : [{ item: "", qty: 1, price: 0 }],
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
    setValue,
  } = useForm<FormValues>({ resolver: zodResolver(schema) as any, defaultValues: formDefaults });

  useEffect(() => {
    if (!doc && id) {
      // if doc not found, go back to dashboard
      navigate("/");
    }
  }, [doc, id, navigate]);

  const addLine = () => {
    const vals = getValues();
    setValue("lineItems", [...vals.lineItems, { item: "", qty: 1, price: 0 }]);
  };
  const removeLine = (idx: number) => {
    const vals = getValues();
    setValue("lineItems", vals.lineItems.filter((_, i) => i !== idx));
  };

  const onSave = (values: FormValues) => {
    if (!id) return;
    updateDocument(id, { ...values });
  };
  const onApprove = (values: FormValues) => {
    if (!id) return;
    updateDocument(id, { ...values });
    approveDocument(id);
    navigate("/");
  };
  const onReject = () => {
    if (!id) return;
    rejectDocument(id, "Rejected by reviewer");
    navigate("/");
  };

  const warn = new Set(doc?.lowConfidenceFields ?? []);

  return (
    <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      {/* Left: viewer */}
      <section className="rounded-xl border bg-card p-2">
        {isPdf ? (
          <div className="flex max-h-[80vh] min-h-[60vh] items-center justify-center overflow-auto">
            <Document file={doc?.url} loading={<span className="text-sm text-foreground/60">Loading PDF…</span>} onLoadError={(e)=>console.error(e)}>
              <Page pageNumber={1} width={520} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          </div>
        ) : (
          <div className="flex max-h-[80vh] min-h-[60vh] items-center justify-center overflow-auto">
            {doc?.url ? (
              <img src={doc.url} alt={doc?.name} className="max-h-[78vh] rounded object-contain" />
            ) : (
              <span className="text-sm text-foreground/60">No preview available</span>
            )}
          </div>
        )}
      </section>

      {/* Right: form */}
      <section className="rounded-xl border bg-card p-4">
        <h1 className="mb-4 text-xl font-bold">Review: {doc?.name}</h1>
        <form className="space-y-4" onSubmit={handleSubmit(onSave)}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Invoice ID</label>
              <input {...register("invoiceId")} className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${warn.has("invoiceId") ? "bg-amber-50" : ""}`} />
              {errors.invoiceId && <p className="mt-1 text-xs text-red-600">{errors.invoiceId.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Vendor</label>
              <input {...register("vendor")} className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${warn.has("vendor") ? "bg-amber-50" : ""}`} />
              {errors.vendor && <p className="mt-1 text-xs text-red-600">{errors.vendor.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Date</label>
              <input type="date" {...register("date")} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
              {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Total</label>
              <input type="number" step="0.01" {...register("total")} className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${warn.has("total") ? "bg-amber-50" : ""}`} />
              {errors.total && <p className="mt-1 text-xs text-red-600">{errors.total.message as string}</p>}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Line Items</h2>
              <Button type="button" size="sm" variant="secondary" onClick={addLine}>Add item</Button>
            </div>
            <div className="space-y-2">
              {getValues("lineItems").map((_, idx) => (
                <div key={idx} className="grid grid-cols-6 items-end gap-2">
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs text-foreground/60">Item</label>
                    <input {...register(`lineItems.${idx}.item` as const)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">Qty</label>
                    <input type="number" {...register(`lineItems.${idx}.qty` as const)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">Price</label>
                    <input type="number" step="0.01" {...register(`lineItems.${idx}.price` as const)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="text-right">
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeLine(idx)}>Remove</Button>
                  </div>
                </div>
              ))}
              {errors.lineItems && <p className="text-xs text-red-600">At least one line item is required</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="destructive" onClick={onReject}>Reject</Button>
            <Button type="submit" disabled={isSubmitting}>Save</Button>
            <Button type="button" onClick={handleSubmit(onApprove)}>Approve</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
