import { describe, expect, it } from 'vitest'
import { mockBookRepository, RepositoryNotFoundError } from './bookRepository'

describe('mockBookRepository', () => {
  it('menyediakan buku publik yang diterbitkan', async () => {
    const book = await mockBookRepository.getPublicBook('peran-manusia-ekosistem')
    expect(book.publicationStatus).toBe('Terbit')
    expect(book.pages).toHaveLength(3)
  })

  it('menolak slug draf sebagai buku publik', async () => {
    await expect(mockBookRepository.getPublicBook('jelajah-samudra')).rejects.toBeInstanceOf(RepositoryNotFoundError)
  })

  it('menyediakan draf admin berdasarkan stable ID mock', async () => {
    const book = await mockBookRepository.getDraftBook('book-ekosistem')
    expect(book.id).toBe('book-ekosistem')
  })
})
