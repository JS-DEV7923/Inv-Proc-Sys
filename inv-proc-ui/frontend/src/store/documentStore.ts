import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { documentApi, Document, UploadProgress, DocumentEvent } from '../types/api';

type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

interface DocumentState {
  // Document list state
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  
  // Upload state
  uploads: Record<string, UploadProgress>;
  isUploading: boolean;
  uploadProgress: number;
  
  // Current document
  currentDocument: Document | null;
  
  // Actions
  fetchDocuments: () => Promise<void>;
  getDocument: (id: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  clearError: () => void;
  clearCurrentDocument: () => void;
}

const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      isLoading: false,
      error: null,
      uploads: {},
      isUploading: false,
      uploadProgress: 0,
      currentDocument: null,

      fetchDocuments: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await documentApi.list(1, 100); // Adjust pagination as needed
          if (response.success && response.data) {
            set({ documents: response.data.items });
          } else {
            throw new Error(response.error?.message || 'Failed to fetch documents');
          }
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      getDocument: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await documentApi.getById(id);
          if (response.success && response.data) {
            set({ currentDocument: response.data });
          } else {
            throw new Error(response.error?.message || 'Document not found');
          }
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      uploadDocument: async (file: File) => {
        const uploadId = `upload-${Date.now()}`;
        
        set((state) => ({
          isUploading: true,
          uploads: {
            ...state.uploads,
            [uploadId]: {
              uploadId,
              documentId: '',
              progress: 0,
              status: 'PENDING',
            },
          },
        }));

        try {
          // Start the upload
          const response = await documentApi.upload(file);
          
          if (!response.success || !response.data) {
            throw new Error(response.error?.message || 'Upload failed');
          }

          const { uploadId: responseUploadId, documentId } = response.data;
          
          // Update the upload with the document ID
          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                ...state.uploads[uploadId],
                documentId,
                uploadId: responseUploadId,
              },
            },
          }));

          // Subscribe to upload events
          const unsubscribe = documentApi.subscribe(
            documentId,
            {
              onProgress: (progress) => {
                set((state) => ({
                  uploads: {
                    ...state.uploads,
                    [uploadId]: {
                      ...state.uploads[uploadId],
                      ...progress,
                    },
                  },
                  uploadProgress: progress.progress,
                }));
              },
              onComplete: (document) => {
                set((state) => ({
                  documents: [document, ...state.documents],
                  uploads: Object.fromEntries(
                    Object.entries(state.uploads).filter(([id]) => id !== uploadId)
                  ),
                  isUploading: false,
                  uploadProgress: 0,
                }));
              },
              onError: (error) => {
                set((state) => ({
                  error: error.message,
                  uploads: {
                    ...state.uploads,
                    [uploadId]: {
                      ...state.uploads[uploadId],
                      status: 'ERROR',
                      error: error.message,
                    },
                  },
                  isUploading: false,
                }));
              },
            }
          );

          // Return cleanup function
          return () => {
            unsubscribe();
          };
        } catch (error) {
          set({
            error: (error as Error).message,
            isUploading: false,
            uploadProgress: 0,
          });
        }
      },

      updateDocument: async (id: string, updates: Partial<Document>) => {
        try {
          const response = await documentApi.update(id, updates);
          
          if (response.success && response.data) {
            set((state) => ({
              documents: state.documents.map((doc) =>
                doc.id === id ? { ...doc, ...response.data } : doc
              ),
              currentDocument:
                state.currentDocument?.id === id
                  ? { ...state.currentDocument, ...response.data }
                  : state.currentDocument,
            }));
          } else {
            throw new Error(response.error?.message || 'Update failed');
          }
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      deleteDocument: async (id: string) => {
        try {
          const response = await documentApi.delete(id);
          
          if (response.success) {
            set((state) => ({
              documents: state.documents.filter((doc) => doc.id !== id),
              currentDocument:
                state.currentDocument?.id === id ? null : state.currentDocument,
            }));
          } else {
            throw new Error(response.error?.message || 'Delete failed');
          }
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
      clearCurrentDocument: () => set({ currentDocument: null }),
    }),
    {
      name: 'document-storage',
      partialize: (state) => ({
        // Only persist the documents, not the UI state
        documents: state.documents,
      }),
    }
  )
);

export default useDocumentStore;
