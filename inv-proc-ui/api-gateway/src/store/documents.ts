export type DocStatus = 'Pending' | 'Processed' | 'Error'
export type LineItem = { item: string; qty: number; price: number }
export type Document = {
  id: string
  userId: string
  status: DocStatus
  vendor?: string
  invoiceId?: string
  date?: string
  total?: number
  lineItems?: Array<LineItem>
  errorReason?: string
  createdAt: number
  updatedAt: number
}

const docs = new Map<string, Document>()

export function upsertDocument(doc: Document) {
  docs.set(doc.id, doc)
}

export function getDocument(id: string) {
  return docs.get(id)
}

export function listDocumentsByUser(userId: string) {
  return Array.from(docs.values()).filter(d => d.userId === userId)
}

export function ensureDocument(userId: string, id: string): Document {
  let d = docs.get(id)
  if (!d) {
    d = {
      id,
      userId,
      status: 'Pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    docs.set(id, d)
  }
  return d
}

export function allDocuments() {
  return Array.from(docs.values())
}
