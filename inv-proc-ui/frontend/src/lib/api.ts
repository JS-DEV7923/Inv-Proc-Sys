export const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1'

let __csrfToken: string | null = null
async function getCsrfToken() {
  if (__csrfToken) return __csrfToken
  try {
    const res = await fetch(`${BASE_URL}/csrf`, { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    __csrfToken = json?.csrfToken || null
  } catch {}
  return __csrfToken
}

export async function uploadFile(
  file: File,
  options: {
    onProgress?: (progress: number) => void;
    onComplete?: (response: any) => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<{ id: string; url: string; name: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    // Get Hugging Face API key from localStorage
    const huggingfaceApiKey = localStorage.getItem('settings.huggingfaceApiKey') || '';
    if (huggingfaceApiKey) {
      formData.append('huggingfaceApiKey', huggingfaceApiKey);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        options.onProgress?.(progress);
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          options.onComplete?.(response);
          resolve(response);
        } catch (e) {
          const error = new Error('Invalid server response');
          options.onError?.(error);
          reject(error);
        }
      } else {
        const error = new Error(`Upload failed: ${xhr.statusText}`);
        options.onError?.(error);
        reject(error);
      }
    });

    xhr.addEventListener('error', () => {
      const error = new Error('Network error during upload');
      options.onError?.(error);
      reject(error);
    });

    xhr.open('POST', `${BASE_URL}/uploads`, true);
    
    // Set CSRF token if available
    getCsrfToken().then(token => {
      if (token) {
        xhr.setRequestHeader('X-CSRF-Token', token);
      }
      xhr.withCredentials = true;
      xhr.send(formData);
    }).catch(error => {
      options.onError?.(error);
      reject(error);
    });
  });
}

export function openUploadSSE(handlers: {
  onProgress: (data: any) => void;
  onCompleted: (data: any) => void;
  onError?: (data: any) => void;
}) {
  const eventSource = new EventSource(`${BASE_URL}/documents/events`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') {
        handlers.onProgress(data);
      } else if (data.type === 'completed') {
        // After upload completes, start Hugging Face processing
        const huggingfaceApiKey = localStorage.getItem('settings.huggingfaceApiKey');
        if (huggingfaceApiKey && data.documentId) {
          processWithHuggingFace(data.documentId, {
            onProgress: (progress) => {
              handlers.onProgress({ ...data, progress, processing: true });
            },
            onComplete: (result) => {
              handlers.onCompleted({ ...data, result });
              eventSource.close();
            },
            onError: (error) => {
              handlers.onError?.({
                ...data,
                error: error.message,
                processingError: true
              });
              eventSource.close();
            }
          }).catch(console.error);
        } else {
          handlers.onCompleted(data);
          eventSource.close();
        }
      } else if (data.type === 'error') {
        handlers.onError?.(data);
        eventSource.close();
      }
    } catch (e) {
      console.error('Error in SSE handler:', e);
      handlers.onError?.({ error: 'Failed to process server event' });
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    handlers.onError?.({ error: 'Connection to server failed' });
    eventSource.close();
  };

  return () => eventSource.close();
}

interface ProgressUpdate {
  progress: number;
  status?: string;
}

interface HuggingFaceOptions {
  model?: string;
  task?: string;
  onProgress?: (update: ProgressUpdate) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export async function processWithHuggingFace(
  documentId: string,
  options: HuggingFaceOptions = {}
): Promise<any> {
  const { 
    model = 'gpt2',
    onProgress,
    onComplete,
    onError 
  } = options;
  
  try {
    const huggingfaceApiKey = localStorage.getItem('settings.huggingfaceApiKey');
    if (!huggingfaceApiKey) {
      throw new Error('Hugging Face API key is not configured');
    }

    // Notify progress
    onProgress?.({ progress: 10, status: 'Starting processing...' });

    // First, get the document content
    const docResponse = await fetch(`${BASE_URL}/documents/${documentId}`, {
      credentials: 'include',
      headers: {
        'X-CSRF-Token': await getCsrfToken() || '',
      },
    });

    if (!docResponse.ok) {
      throw new Error('Failed to fetch document content');
    }

    const document = await docResponse.json();
    onProgress?.({ progress: 30, status: 'Document loaded' });

    // Call Hugging Face API
    const response = await fetch('https://api-inference.huggingface.co/models/' + model, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${huggingfaceApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: document.content || document.text || '',
        parameters: {
          max_length: 200,
          num_return_sequences: 1,
        },
      }),
    });

    onProgress?.({ progress: 70, status: 'Processing with Hugging Face...' });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${error}`);
    }

    const result = await response.json();
    
    // Save the result back to the document
    const updateResponse = await fetch(`${BASE_URL}/documents/${documentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': await getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        metadata: {
          ...document.metadata,
          huggingFaceResult: result,
          processedAt: new Date().toISOString(),
        },
      }),
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update document with processing results');
    }

    onProgress?.({ progress: 100, status: 'Processing complete' });
    const finalResult = { result, documentId };
    onComplete?.(finalResult);
    return finalResult;
  } catch (error) {
    console.error('Error in processWithHuggingFace:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function fetchDocuments() {
  const res = await fetch(`${BASE_URL}/documents`, { credentials: 'include' })
  if (!res.ok) throw new Error('Documents fetch failed')
  return res.json() as Promise<{ items: any[]; total: number }>
}

export async function patchDocument(id: string, patch: any) {
  const token = await getCsrfToken()
  const res = await fetch(`${BASE_URL}/documents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
    credentials: 'include',
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Patch failed')
  return res.json()
}

export async function approveDocumentApi(id: string) {
  const token = await getCsrfToken()
  const res = await fetch(`${BASE_URL}/documents/${encodeURIComponent(id)}/approve`, {
    method: 'POST', credentials: 'include', headers: token ? { 'x-csrf-token': token } as any : undefined
  })
  if (!res.ok) throw new Error('Approve failed')
  return res.json()
}

export async function rejectDocumentApi(id: string, reason?: string) {
  const token = await getCsrfToken()
  const res = await fetch(`${BASE_URL}/documents/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
    credentials: 'include',
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) throw new Error('Reject failed')
  return res.json()
}

export interface AnalyticsOverview {
  success: boolean;
  data: {
    processed: number;
    pending: number;
    errors: number;
    today: number;
  };
  total: number;
  error?: string;
  details?: string;
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview['data']> {
  try {
    const res = await fetch(`${BASE_URL}/analytics/overview`, { 
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data: AnalyticsOverview = await res.json();
    
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch analytics data');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    // Return default values on error
    return {
      processed: 0,
      pending: 0,
      errors: 0,
      today: 0
    };
  }
}

export async function fetchDocumentsPerDay(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  const res = await fetch(`${BASE_URL}/analytics/documents-per-day?${qs.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Documents-per-day failed')
  return res.json() as Promise<{ items: Array<{ date: string; total: number; errors: number }> }>
}
