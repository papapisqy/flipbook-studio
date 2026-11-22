import { getMockBookById, getMockBookBySlug, mockBooks, type MockBook } from '../data/mockContent'

export class RepositoryNotFoundError extends Error {}
export type BookRepository = { listAdminBooks(): Promise<MockBook[]>; getPublicBook(slug: string): Promise<MockBook>; getDraftBook(id: string): Promise<MockBook> }
const delay = (milliseconds = 140) => new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds))

export const mockBookRepository: BookRepository = {
  async listAdminBooks() { await delay(); return mockBooks },
  async getPublicBook(slug) { await delay(); const book = getMockBookBySlug(slug); if (!book || book.publicationStatus !== 'Terbit') throw new RepositoryNotFoundError('Buku publik tidak tersedia.'); return book },
  async getDraftBook(id) { await delay(); const book = getMockBookById(id); if (!book) throw new RepositoryNotFoundError('Draf buku tidak ditemukan.'); return book },
}
