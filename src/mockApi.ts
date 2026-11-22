export type LocalReaderProgress = {
  bookSlug: string
  page: number
  updatedAt: string
}

export type MockSubmitResult = {
  receiptId: string
  receivedAt: string
  status: 'diterima'
}

const progressKey = 'flipbook-studio:reader-progress:v1'

export function getReaderProgress(bookSlug: string): LocalReaderProgress | null {
  try {
    const raw = window.localStorage.getItem(progressKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalReaderProgress
    return parsed.bookSlug === bookSlug && Number.isInteger(parsed.page) ? parsed : null
  } catch { return null }
}

export function saveReaderProgress(progress: LocalReaderProgress): void {
  try { window.localStorage.setItem(progressKey, JSON.stringify(progress)) } catch { /* optional local persistence */ }
}

export function clearReaderProgress(): void {
  try { window.localStorage.removeItem(progressKey) } catch { /* optional local persistence */ }
}

export async function submitMockAnswer(answer: string): Promise<MockSubmitResult> {
  if (!answer) throw new Error('Pilih jawaban sebelum mengirim.')
  await new Promise((resolve) => window.setTimeout(resolve, 450))
  return { receiptId: `mock-${crypto.randomUUID().slice(0, 8)}`, receivedAt: new Date().toISOString(), status: 'diterima' }
}
