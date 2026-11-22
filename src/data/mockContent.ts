export type MockPageKind = 'Sampul' | 'Halaman' | 'Aktivitas'
export type MockPage = { id: string; label: string; kind: MockPageKind; body: string }
export type MockBook = { id: string; slug: string; title: string; description: string; subject: string; grade: string; draftRevision: number; publicationStatus: 'Draf' | 'Terbit'; pages: MockPage[] }

export const mockBooks: MockBook[] = [
  { id: 'book-ekosistem', slug: 'peran-manusia-ekosistem', title: 'Peran Manusia dalam Ekosistem', description: 'Jelajahi hubungan manusia, makhluk hidup, dan lingkungan melalui bacaan serta aktivitas interaktif.', subject: 'IPAS', grade: 'V', draftRevision: 12, publicationStatus: 'Terbit', pages: [
    { id: 'pg-ekosistem', label: 'Ekosistem kita', kind: 'Sampul', body: 'Ekosistem adalah rumah bagi makhluk hidup dan unsur tak hidup yang saling memengaruhi.' },
    { id: 'pg-makhluk-hidup', label: 'Makhluk hidup', kind: 'Halaman', body: 'Setiap makhluk hidup memiliki peran. Tumbuhan menghasilkan makanan, hewan memindahkan energi, dan manusia bertanggung jawab menggunakan sumber daya secara bijak.' },
    { id: 'pg-rantai-makanan', label: 'Rantai makanan', kind: 'Aktivitas', body: 'Manakah tindakan yang paling membantu ekosistem di sekitar sekolah?' },
  ] },
  { id: 'book-samudra', slug: 'jelajah-samudra', title: 'Jelajah Samudra', description: 'Contoh draf untuk menampilkan state daftar dan editor.', subject: 'IPAS', grade: 'VI', draftRevision: 3, publicationStatus: 'Draf', pages: [] },
]

export const getMockBookBySlug = (slug: string) => mockBooks.find((book) => book.slug === slug)
export const getMockBookById = (id: string) => mockBooks.find((book) => book.id === id)
