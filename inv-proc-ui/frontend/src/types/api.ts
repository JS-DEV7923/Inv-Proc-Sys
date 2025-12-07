export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export interface Document {
  id: string;
  name: string;
  type: 'INVOICE' | 'RECEIPT' | 'CONTRACT' | 'OTHER';
  status: DocumentStatus;
  url?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface UploadResponse {
  uploadId: string;
  documentId: string;
  status: DocumentStatus;
  url?: string;
}

export interface UploadProgress {
  uploadId: string;
  documentId: string;
  progress: number;
  status: DocumentStatus;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
  statusCode: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// Request types
export interface UploadDocumentRequest {
  file: File;
  type?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDocumentRequest {
  status?: DocumentStatus;
  metadata?: Record<string, any>;
}

// Response types
export type DocumentsResponse = PaginatedResponse<Document>;
export type DocumentResponse = Document;

// Event types
export type DocumentEvent = 
  | { type: 'UPLOAD_PROGRESS'; data: UploadProgress }
  | { type: 'DOCUMENT_UPDATED'; data: Document }
  | { type: 'DOCUMENT_PROCESSED'; data: Document }
  | { type: 'ERROR'; error: Error };
