import { useCallback, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "../components/ui/button";
import { useDocStore } from "../store/docStore";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

export default function Upload() {
  const enqueueUploads = useDocStore((s) => s.enqueueUploads);
  const startSSE = useDocStore((s) => s.startSSE);
  const uploadsMap = useDocStore((s) => s.uploads);
  const uploads = useMemo(() => Object.values(uploadsMap), [uploadsMap]);

  useEffect(() => {
    startSSE();
  }, [startSSE]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles?.length) return;
      const limited = acceptedFiles.slice(0, 20); // safety cap
      enqueueUploads(limited);
    },
    [enqueueUploads]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPTED, multiple: true });

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Upload</h1>

      <section
        {...getRootProps()}
        className={
          "flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed " +
          (isDragActive ? "bg-amber-50 border-amber-300" : "bg-card/50 hover:bg-card")
        }
      >
        <input {...getInputProps()} />
        <p className="text-sm text-foreground/70">Drag & drop PDF/PNG/JPG here, or click to browse</p>
        <p className="mt-1 text-xs text-foreground/50">Accepted: PDF, PNG, JPG • Multi-file supported</p>
        <Button className="mt-3" size="sm">Browse files</Button>
      </section>

      {!!uploads.length && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">In Progress</h2>
          <ul className="space-y-3">
            {uploads.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-lg border p-3">
                {u.previewUrl ? (
                  <img src={u.previewUrl} alt="preview" className="h-12 w-12 rounded object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-secondary text-xs">{u.name.split('.').pop()?.toUpperCase()}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${u.progress}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-foreground/60">
                    <span>Status: {u.status}</span>
                    <span>{u.progress}%</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!uploads.length && (
        <p className="mt-4 text-sm text-foreground/60">No uploads in progress. Drop files above to start processing.</p>
      )}
    </main>
  );
}
