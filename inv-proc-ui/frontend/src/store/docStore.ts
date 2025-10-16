import { create } from "zustand";
import { uploadFile, openUploadSSE, fetchDocuments, patchDocument as patchDocumentApi, approveDocumentApi, rejectDocumentApi } from "../lib/api";

export type DocStatus = "Pending" | "Processed" | "Error";
export type DocType = "Invoice";

export type UploadItem = {
  id: string;
  name: string;
  type: DocType;
  file: File;
  progress: number; // 0-100
  status: DocStatus;
  uploadedAt: string; // ISO
  error?: string;
  previewUrl?: string; // for images
};

export type InvoiceDocument = {
  id: string;
  name: string;
  type: DocType;
  status: DocStatus;
  uploadedAt: string;
  url?: string; // object URL or remote
  processedAt?: string;
  processingMs?: number;
  // extracted invoice fields (placeholder schema)
  invoiceId?: string;
  vendor?: string;
  date?: string;
  total?: number;
  lineItems?: Array<{ item: string; qty: number; price: number }>;
  // ocr confidence markers
  lowConfidenceFields?: string[];
};

type Settings = {
  confidenceThreshold: number;
};

type State = {
  uploads: Record<string, UploadItem>;
  documents: Record<string, InvoiceDocument>;
  settings: Settings;
};

type Actions = {
  enqueueUploads: (files: File[]) => void;
  removeUpload: (id: string) => void;
  getRecentDocuments: () => InvoiceDocument[];
  updateDocument: (id: string, patch: Partial<InvoiceDocument>) => void;
  approveDocument: (id: string) => void;
  rejectDocument: (id: string, reason?: string) => void;
  setConfidenceThreshold: (val: number) => void;
  startSSE: () => void;
  loadDocuments: () => Promise<void>;
};

const STORAGE_KEY = "inv-proc-docs";

function loadPersisted(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { uploads: {}, documents: {}, settings: { confidenceThreshold: 0.8 } };
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      uploads: parsed.uploads ?? {},
      documents: parsed.documents ?? {},
      settings: parsed.settings ?? { confidenceThreshold: 0.8 },
    };
  } catch {
    return { uploads: {}, documents: {}, settings: { confidenceThreshold: 0.8 } };
  }
}

function persist(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export const useDocStore = create<State & Actions>((set, get) => ({
  ...loadPersisted(),

  enqueueUploads: (files: File[]) => {
    const now = new Date();
    const uploadIdToLocal: Record<string, string> = {};

    files.forEach(async (file) => {
      // Create a local upload entry immediately
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      set((s) => {
        const uploads = {
          ...s.uploads,
          [localId]: {
            id: localId,
            name: file.name,
            type: "Invoice",
            file,
            progress: 0,
            status: "Pending",
            uploadedAt: now.toISOString(),
            previewUrl,
          },
        };
        const state = { ...s, uploads };
        persist(state);
        return state;
      });

      // Call backend upload
      try {
        const res = await uploadFile(file);
        uploadIdToLocal[res.uploadId] = localId;
      } catch (e) {
        set((s) => {
          const u = s.uploads[localId];
          if (!u) return s;
          const uploads = { ...s.uploads, [localId]: { ...u, status: "Error" as DocStatus } };
          const state = { ...s, uploads };
          persist(state);
          return state;
        });
      }
    });
  },

  loadDocuments: async () => {
    try {
      const resp = await fetchDocuments();
      const items = resp.items || [];
      set((s) => {
        const docs: Record<string, InvoiceDocument> = { ...s.documents };
        for (const it of items) {
          const id = it.id || it.documentId || `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
          docs[id] = {
            id,
            name: it.name || `Document ${id}`,
            type: 'Invoice',
            status: it.status || 'Pending',
            uploadedAt: new Date(it.createdAt || Date.now()).toISOString(),
            url: it.url,
            processedAt: it.updatedAt ? new Date(it.updatedAt).toISOString() : undefined,
            processingMs: it.processingMs,
            invoiceId: it.invoiceId,
            vendor: it.vendor,
            date: it.date,
            total: it.total,
            lineItems: it.lineItems,
          };
        }
        const state = { ...s, documents: docs };
        persist(state);
        return state;
      });
    } catch {}
  },

  removeUpload: (id: string) => {
    set((s) => {
      const { [id]: _removed, ...rest } = s.uploads;
      const state = { ...s, uploads: rest };
      persist(state);
      return state;
    });
  },

  getRecentDocuments: () => {
    const docs = Object.values(get().documents);
    return docs.sort((a, b) => (a.uploadedAt > b.uploadedAt ? -1 : 1)).slice(0, 10);
  },

  updateDocument: async (id, patch) => {
    try { await patchDocumentApi(id, patch) } catch {}
    set((s) => {
      const doc = s.documents[id];
      if (!doc) return s;
      const updated = { ...doc, ...patch };
      const documents = { ...s.documents, [id]: updated };
      const state = { ...s, documents };
      persist(state);
      return state;
    });
  },

  approveDocument: async (id) => {
    try { await approveDocumentApi(id) } catch {}
    set((s) => {
      const doc = s.documents[id];
      if (!doc) return s;
      const updated = { ...doc, status: "Processed" as DocStatus };
      const documents = { ...s.documents, [id]: updated };
      const state = { ...s, documents };
      persist(state);
      return state;
    });
  },

  rejectDocument: async (id, reason) => {
    try { await rejectDocumentApi(id, reason) } catch {}
    set((s) => {
      const doc = s.documents[id];
      if (!doc) return s;
      const updated = { ...doc, status: "Error" as DocStatus };
      const documents = { ...s.documents, [id]: updated };
      const state = { ...s, documents };
      persist(state);
      return state;
    });
  },

  setConfidenceThreshold: (val) => {
    set((s) => {
      const settings = { ...s.settings, confidenceThreshold: Math.max(0, Math.min(1, val)) };
      const state = { ...s, settings };
      persist(state);
      return state;
    });
  },

  startSSE: () => {
    // prevent multiple connections
    if ((window as any).__invproc_sse_started) return;
    (window as any).__invproc_sse_started = true;

    openUploadSSE({
      onProgress: (data) => {
        const { uploadId, documentId, progress } = data || {};
        if (!uploadId) return;
        // try to find local upload by scanning (since mapping is per session)
        const s = get();
        const entries = Object.entries(s.uploads);
        for (const [id, u] of entries) {
          // Heuristic: match by name progress pending; otherwise just update first pending
          // Better approach: backend could echo back original filename in events
          if (u.status === "Pending") {
            const uploads = { ...s.uploads, [id]: { ...u, progress: typeof progress === 'number' ? progress : u.progress } };
            const state = { ...s, uploads };
            persist(state);
            set(state);
            break;
          }
        }
      },
      onCompleted: (data) => {
        const { documentId } = data || {};
        // Remove one pending upload and create a document entry
        set((s) => {
          const pendingId = Object.keys(s.uploads).find((k) => s.uploads[k].status === "Pending");
          if (!pendingId) return s;
          const u = s.uploads[pendingId];
          const { [pendingId]: _removed, ...restUploads } = s.uploads;
          const docId = documentId || pendingId;
          const doc: InvoiceDocument = {
            id: docId,
            name: u.name,
            type: "Invoice",
            status: "Processed",
            uploadedAt: u.uploadedAt,
            url: u.previewUrl,
            processedAt: new Date().toISOString(),
          };
          const documents = { ...s.documents, [docId]: doc };
          const state = { ...s, uploads: restUploads, documents };
          persist(state);
          return state;
        });
      },
      onError: () => {},
    });
  },
}));
