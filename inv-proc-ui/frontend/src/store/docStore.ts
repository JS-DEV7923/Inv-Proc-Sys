import { create } from "zustand";
import { uploadFile, openUploadSSE, fetchDocuments, patchDocument as patchDocumentApi, approveDocumentApi, rejectDocumentApi } from "../lib/api";

export type DocStatus = "Pending" | "Processing" | "Processed" | "Error";
export type DocType = "Invoice";

export interface UploadItem {
  id: string;
  name: string;
  type: DocType;
  file: File;
  progress: number;
  status: DocStatus;
  uploadedAt: string;
  error?: string;
  previewUrl?: string;
}

export interface InvoiceDocument {
  id: string;
  name: string;
  type: DocType;
  status: DocStatus;
  uploadedAt: string;
  url?: string;
  processedAt?: string;
  processingMs?: number;
  invoiceId?: string;
  vendor?: string;
  date?: string;
  total?: number;
  lineItems?: Array<{ item: string; qty: number; price: number }>;
  lowConfidenceFields?: string[];
}

interface Settings {
  confidenceThreshold: number;
}

interface State {
  uploads: Record<string, UploadItem>;
  documents: Record<string, InvoiceDocument>;
  settings: Settings;
}

interface Actions {
  enqueueUploads: (files: File[]) => void;
  removeUpload: (id: string) => void;
  getRecentDocuments: () => InvoiceDocument[];
  updateDocument: (id: string, patch: Partial<InvoiceDocument>) => void;
  approveDocument: (id: string) => void;
  rejectDocument: (id: string, reason?: string) => void;
  setConfidenceThreshold: (val: number) => void;
  startSSE: () => void;
  loadDocuments: () => Promise<void>;
  resetAll: () => void;
}

const STORAGE_KEY = "inv-proc-docs";

function loadPersisted(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { uploads: {}, documents: {}, settings: { confidenceThreshold: 0.8 } };
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

    files.forEach((file) => {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      const upload: UploadItem = {
        id: uploadId,
        name: file.name,
        type: 'Invoice',
        file,
        progress: 0,
        status: 'Pending',
        uploadedAt: now.toISOString(),
        previewUrl
      };

      // Add to state
      set((state) => {
        const newState = {
          ...state,
          uploads: {
            ...state.uploads,
            [uploadId]: upload,
          },
        };
        persist(newState);
        return newState;
      });

      // Start upload
      uploadFile(file, {
        onProgress: (progress: number) => {
          set((state) => {
            if (!state.uploads[uploadId]) return state;
            
            const updatedState = {
              ...state,
              uploads: {
                ...state.uploads,
                [uploadId]: {
                  ...state.uploads[uploadId],
                  progress,
                  status: progress < 100 ? 'Processing' : 'Processed',
                },
              },
            };
            persist(updatedState);
            return updatedState;
          });
        },
        onComplete: (response: { id: string; url: string }) => {
          set((state) => {
            if (!state.uploads[uploadId]) return state;
            
            const newUploads = { ...state.uploads };
            delete newUploads[uploadId];
            
            const newDoc: InvoiceDocument = {
              id: response.id || uploadId,
              name: file.name,
              type: 'Invoice',
              status: 'Processed',
              uploadedAt: now.toISOString(),
              url: response.url || previewUrl,
              processedAt: new Date().toISOString(),
            };

            const newState = {
              ...state,
              uploads: newUploads,
              documents: {
                ...state.documents,
                [response.id || uploadId]: newDoc,
              },
            };
            persist(newState);
            return newState;
          });
        },
        onError: (error: Error) => {
          console.error('Upload failed:', error);
          set((state) => {
            if (!state.uploads[uploadId]) return state;
            
            const newState = {
              ...state,
              uploads: {
                ...state.uploads,
                [uploadId]: {
                  ...state.uploads[uploadId],
                  status: 'Error',
                  error: error?.message || 'Upload failed',
                },
              },
            };
            persist(newState);
            return newState;
          });
        },
      });
    });
  },

  removeUpload: (id: string) => {
    set((state) => {
      const newUploads = { ...state.uploads };
      delete newUploads[id];
      const newState = { ...state, uploads: newUploads };
      persist(newState);
      return newState;
    });
  },

  getRecentDocuments: () => {
    const state = get();
    return Object.values(state.documents).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  },

  updateDocument: (id: string, patch: Partial<InvoiceDocument>) => {
    set((state) => {
      const doc = state.documents[id];
      if (!doc) return state;
      const updated = { ...doc, ...patch };
      const documents = { ...state.documents, [id]: updated };
      const newState = { ...state, documents };
      persist(newState);
      return newState;
    });
  },

  approveDocument: (id: string) => {
    set((state) => {
      const doc = state.documents[id];
      if (!doc) return state;
      const updated = { ...doc, status: "Processed" as const };
      const documents = { ...state.documents, [id]: updated };
      const newState = { ...state, documents };
      persist(newState);
      return newState;
    });
  },

  rejectDocument: (id: string, reason?: string) => {
    set((state) => {
      const doc = state.documents[id];
      if (!doc) return state;
      const updated = { ...doc, status: "Error" as const };
      const documents = { ...state.documents, [id]: updated };
      const newState = { ...state, documents };
      persist(newState);
      return newState;
    });
  },

  setConfidenceThreshold: (val: number) => {
    set((state) => {
      const settings = { ...state.settings, confidenceThreshold: Math.max(0, Math.min(1, val)) };
      const newState = { ...state, settings };
      persist(newState);
      return newState;
    });
  },

  startSSE: () => {
    if ((window as any).__invproc_sse_started) return;
    (window as any).__invproc_sse_started = true;

    openUploadSSE({
      onProgress: (data: { uploadId: string; progress: number }) => {
        const { uploadId, progress } = data || {};
        if (!uploadId) return;
        
        set((state) => {
          const upload = Object.values(state.uploads).find(u => u.status === "Pending");
          if (!upload) return state;
          
          const updatedUploads = {
            ...state.uploads,
            [upload.id]: {
              ...upload,
              progress: typeof progress === 'number' ? progress : upload.progress,
            },
          };
          
          const newState = { ...state, uploads: updatedUploads };
          persist(newState);
          return newState;
        });
      },
      onCompleted: (data: { documentId: string }) => {
        set((state) => {
          const pendingId = Object.keys(state.uploads).find(
            (k) => state.uploads[k].status === "Pending"
          );
          
          if (!pendingId) return state;
          
          const u = state.uploads[pendingId];
          const { [pendingId]: _removed, ...restUploads } = state.uploads;
          const docId = data.documentId || pendingId;
          
          const doc: InvoiceDocument = {
            id: docId,
            name: u.name,
            type: "Invoice",
            status: "Processed",
            uploadedAt: u.uploadedAt,
            url: u.previewUrl,
            processedAt: new Date().toISOString(),
          };
          
          const newState = {
            ...state,
            uploads: restUploads,
            documents: {
              ...state.documents,
              [docId]: doc,
            },
          };
          
          persist(newState);
          return newState;
        });
      },
      onError: () => {},
    });
  },

  loadDocuments: async () => {
    try {
      const resp = await fetchDocuments();
      const items = resp.items || [];
      
      set((state) => {
        const docs: Record<string, InvoiceDocument> = { ...state.documents };
        
        for (const item of items) {
          if (item.id && !docs[item.id]) {
            docs[item.id] = {
              id: item.id,
              name: item.name || 'Unknown',
              type: 'Invoice',
              status: 'Processed',
              uploadedAt: item.uploadedAt || new Date().toISOString(),
              url: item.url,
              processedAt: item.processedAt,
            };
          }
        }
        
        const newState = { ...state, documents: docs };
        persist(newState);
        return newState;
      });
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  },

  resetAll: () => {
    // Clear all data from localStorage
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('settings.apiKey');
    localStorage.removeItem('settings.apiBase');
    localStorage.removeItem('settings.huggingfaceApiKey');
    localStorage.removeItem('settings.users');
    
    // Reset to initial state
    set({
      uploads: {},
      documents: {},
      settings: {
        confidenceThreshold: 0.8
      }
    });
    
    // Reload the page to ensure a clean state
    window.location.reload();
  },
}));
