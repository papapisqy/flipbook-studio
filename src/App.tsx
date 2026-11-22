// @ts-nocheck
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { EmptyState, ErrorState, LoadingState } from './components/AsyncState'
import type { MockBook } from './data/mockContent'
import { clearReaderProgress, getReaderProgress, saveReaderProgress, submitMockAnswer, type MockSubmitResult } from './mockApi'
import { mockBookRepository, RepositoryNotFoundError } from './services/bookRepository'
import { supabase, supabaseConfigurationStatus } from './lib/supabase'
import HTMLFlipBook from 'react-pageflip'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

type Resource<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'not-found' } | { status: 'error' }
const uploadedPdfUrls = new Map<string, string>()
function savePdfBlob(key: string, file: File) { const request = indexedDB.open('flipbook-studio-files', 1); request.onupgradeneeded = () => request.result.createObjectStore('pdfs'); request.onsuccess = () => { const tx = request.result.transaction('pdfs', 'readwrite'); tx.objectStore('pdfs').put(file, key) } }
function loadPdfBlob(key: string, onLoad: (url: string) => void) { const request = indexedDB.open('flipbook-studio-files', 1); request.onupgradeneeded = () => request.result.createObjectStore('pdfs'); request.onsuccess = () => { const tx = request.result.transaction('pdfs', 'readonly'); const get = tx.objectStore('pdfs').get(key); get.onsuccess = () => { if (get.result instanceof Blob) onLoad(URL.createObjectURL(get.result)) } } }

function bookEditorHref(title: string, fileName?: string) {
  const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'flipbook'
  const query = new URLSearchParams({ title })
  if (fileName) query.set('file', fileName)
  return `/admin/books/${slug}/editor?${query.toString()}`
}

export default function App() {
  const auth = useAuthSession()
  useEffect(() => {
    const installLogout = () => { document.querySelectorAll('.admin-nav').forEach((nav) => { if (!nav.querySelector('.admin-menu-toggle')) { const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'admin-menu-toggle'; toggle.setAttribute('aria-label', 'Buka menu navigasi'); toggle.setAttribute('aria-expanded', 'false'); toggle.innerHTML = '<span></span><span></span><span></span>'; toggle.onclick = () => { const open = nav.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi') }; nav.prepend(toggle) } if (nav.querySelector('.sidebar-logout')) return; const button = document.createElement('button'); button.className = 'sidebar-logout'; button.textContent = '↪  Keluar'; button.onclick = async () => { if (supabase) await supabase.auth.signOut(); window.history.replaceState(null, '', '/admin/login'); window.dispatchEvent(new PopStateEvent('popstate')) }; nav.appendChild(button) }) }
    installLogout(); const observer = new MutationObserver(installLogout); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (window.location.pathname === '/') {
      window.location.href = auth.session ? '/admin' : '/admin/login'
    }
  }, [auth.loading, auth.session])
  if (window.location.pathname === '/') {
    window.location.href = auth.session ? '/admin' : '/admin/login'
    return <LoadingState label="Mengarahkan ke halaman masuk admin..." />
  }
  return <BrowserRouter><div className="app-shell"><a className="skip-link" href="#main-content">Lewati ke konten utama</a><main id="main-content"><Routes><Route path="/" element={<Navigate replace to="/admin/login" />} /><Route path="/admin/login" element={<LoginRoute auth={auth} />} /><Route path="/admin" element={<RequireSession auth={auth}><DashboardRoute /></RequireSession>} /><Route path="/admin/books" element={<RequireSession auth={auth}><CollectionRoute /></RequireSession>} /><Route path="/admin/editor" element={<RequireSession auth={auth}><InteractiveEditorRoute /></RequireSession>} /><Route path="/admin/settings" element={<RequireSession auth={auth}><SettingsRoute /></RequireSession>} /><Route path="/admin/about" element={<RequireSession auth={auth}><AboutRoute /></RequireSession>} /><Route path="/admin/books/book-ekosistem/editor" element={<RequireSession auth={auth}><LegacyBookEditorEntry /></RequireSession>} /><Route path="/admin/books/:bookId/editor" element={<RequireSession auth={auth}><EditorRoute /></RequireSession>} /><Route path="*" element={<ErrorState title="Halaman tidak ditemukan">Alamat ini tidak terdaftar pada prototipe.</ErrorState>} /></Routes></main></div></BrowserRouter>
}

type AuthState = { loading: boolean; session: Session | null }

function HomeRoute({ auth }: { auth: AuthState }) {
  if (auth.loading) return <LoadingState label="Memeriksa sesi administrator..." />
  return <Navigate replace to={auth.session ? '/admin' : '/admin/login'} />
}
type AdminProfile = { id: string; display_name: string | null; access_status: 'pending' | 'active' | 'suspended' }
type AdminProfileState =
  | { status: 'loading' }
  | { status: 'active'; profile: AdminProfile }
  | { status: 'missing' }
  | { status: 'error' }

function useAuthSession(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: Boolean(supabase), session: null })
  useEffect(() => {
    if (!supabase) { setState({ loading: false, session: null }); return }
    let active = true
    void supabase.auth.getSession().then(({ data }) => { if (active) setState({ loading: false, session: data.session }) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setState({ loading: false, session }))
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  return state
}

function useAdminProfile(auth: AuthState): AdminProfileState {
  const [state, setState] = useState<AdminProfileState>({ status: 'loading' })
  useEffect(() => {
    if (auth.loading) { setState({ status: 'loading' }); return }
    if (!auth.session || !supabase) { setState({ status: 'missing' }); return }
    let active = true
    void supabase
      .from('admin_profiles')
      .select('id, display_name, access_status')
      .eq('id', auth.session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) { setState({ status: 'error' }); return }
        if (data?.access_status === 'active') {
          setState({ status: 'active', profile: data as AdminProfile })
          return
        }
        setState({ status: 'missing' })
      })
    return () => { active = false }
  }, [auth.loading, auth.session?.user.id])
  return state
}

function RequireSession({ auth, children }: { auth: AuthState; children: ReactNode }) {
  const location = useLocation()
  const profile = useAdminProfile(auth)
  if (auth.loading) return <LoadingState label="Memeriksa sesi administrator…" />
  if (!auth.session) return <Navigate replace to="/admin/login" state={{ from: location.pathname }} />
  if (profile.status === 'loading') return <LoadingState label="Memeriksa hak akses administrator..." />
  if (profile.status === 'error') return <ErrorState title="Hak akses administrator tidak dapat diperiksa">Sesi login ada, tetapi profil admin tidak dapat dibaca. Coba muat ulang; policy RLS tetap menjadi sumber otorisasi data.</ErrorState>
  if (profile.status === 'missing') return <ErrorState title="Akses administrator belum aktif">Akun ini sudah login, tetapi belum memiliki profil administrator aktif. Hubungi pengelola proyek untuk provisioning; jangan gunakan akun lain atau membuat profil lewat browser.</ErrorState>
  return <>{children}</>
}

function LegacyLoginRoute({ auth }: { auth: AuthState }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [bookOpened, setBookOpened] = useState(false)
  useEffect(() => { const timer = window.setTimeout(() => setBookOpened(true), 180); return () => window.clearTimeout(timer) }, [])
  const destination = (location.state as { from?: string } | null)?.from ?? '/admin'
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!supabase) { setError('Konfigurasi Supabase browser belum tersedia. Periksa variabel VITE_SUPABASE_*.'); return }
    setSubmitting(true); setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (signInError) {
      setError('Login tidak berhasil. Periksa email, password, dan status konfirmasi akun.')
      return
    }
    const rememberSession = (form.querySelector('input[type="checkbox"]') as HTMLInputElement | null)?.checked ?? false
    if (!rememberSession) {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) localStorage.removeItem(key)
      }
    }
  }
  return <section className="auth-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">ADMINISTRATOR</p><h1>Masuk ke workspace</h1><p>Login memverifikasi sesi Supabase Auth. Akses data buku tetap menunggu provisioning profil dan policy scope admin.</p><label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="auth-error" role="alert">{error}</p>}{supabaseConfigurationStatus === 'missing-configuration' && <p className="auth-error" role="alert">Konfigurasi Supabase belum ditemukan.</p>}<button className="button primary" disabled={submitting || !supabase} type="submit">{submitting ? 'Memverifikasi…' : 'Masuk'}</button></form></section>
}

function LoginRoute({ auth }: { auth: AuthState }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const destination = (location.state as { from?: string } | null)?.from ?? '/admin'
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) { setError('Konfigurasi Supabase browser belum tersedia.'); return }
    setSubmitting(true); setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (signInError) { setError('Login tidak berhasil. Periksa email, password, dan status konfirmasi akun.'); return }
    navigate(destination, { replace: true })
  }
  return <section className="auth-page journal-login">
    <div className="journal-book">
      <div className="journal-cover" aria-hidden="true" /><div className="journal-page-stack" aria-hidden="true" />
      <div className="journal-clip" aria-hidden="true"><i /><span>portal admin</span></div><div className="journal-ribbon" aria-hidden="true" />
      <div className="journal-spread">
        <aside className="journal-story">
          <div className="journal-margin" aria-hidden="true" />
          <div className="journal-brand"><img src="/flipbook-studio-logo.png" alt="Flipbook Studio" /><span className="journal-tape">FLIPBOOK STUDIO</span><time>EDISI 2026</time></div>
          <div className="journal-intro"><span className="journal-tag">✦ Studio Animasi</span><h1>Hidupkan ceritamu lembar demi lembar.</h1><p>“Setiap goresan membawa kehidupan pada tiap lembaran gerak flipbook.”</p></div>
          <div className="journal-note"><b>✎ Tips flipbook hari ini</b><span>Jaga konsistensi proporsi garis di setiap frame agar ilusi gerak tetap mulus dan natural.</span></div>
          <ul className="journal-checklist"><li className="done">Sketsa keyframe karakter utama</li><li>Uji kelenturan gerak in-between</li><li>Ekspor urutan gambar flipbook digital</li></ul>
          <footer>✎ Ruang kreatif flipbook terenkripsi <span>Hal. 01</span></footer>
        </aside>
        <div className="journal-binding" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
        <div className="journal-mobile-logo"><img src="/flipbook-studio-logo.png" alt="Flipbook Studio" /></div>
        <form className="journal-form" onSubmit={submit}>
          <div className="journal-form-heading"><div><h2>Masuk ke Akun</h2><p>Tuliskan kredensial jurnalmu di bawah untuk melanjutkan.</p></div><span>Hal. 02</span></div>
          <label><b>✎ Email administrator</b><input type="email" autoComplete="email" placeholder="admin@flipbook.local" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label><b>⌘ Kata sandi akun</b><span className="journal-password"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" />{showPassword && <path d="m4 4 16 16" />}</svg></button></span></label>
          <label className="journal-remember"><input type="checkbox" /> Simpan sesi di perangkat ini</label>
          {error && <p className="auth-error" role="alert">{error}</p>}{supabaseConfigurationStatus === 'missing-configuration' && <p className="auth-error" role="alert">Konfigurasi Supabase belum ditemukan.</p>}
          <button className="journal-submit" disabled={submitting || !supabase} type="submit">{submitting ? 'Membuka halaman…' : '▣ Masuk ke Studio Flipbook'}</button>
        </form>
      </div>
    </div>
  </section>
}

function useBook(load: () => Promise<MockBook>, keys: unknown[]): Resource<MockBook> {
  const [resource, setResource] = useState<Resource<MockBook>>({ status: 'loading' })
  useEffect(() => { let active = true; setResource({ status: 'loading' }); load().then((data) => active && setResource({ status: 'ready', data })).catch((error) => active && setResource(error instanceof RepositoryNotFoundError ? { status: 'not-found' } : { status: 'error' })); return () => { active = false } }, keys) // eslint-disable-line react-hooks/exhaustive-deps
  return resource
}

function ReaderRoute() {
  const { slug, pageId } = useParams()
  const resource = useBook(() => mockBookRepository.getPublicBook(slug ?? ''), [slug])
  if (resource.status === 'loading') return <LoadingState label="Memuat buku publik mock…" />
  if (resource.status === 'not-found') return <ErrorState title="Buku tidak tersedia">Buku belum terbit, telah ditarik, atau URL tidak sah. Tidak ada redirect diam-diam.</ErrorState>
  if (resource.status === 'error') return <ErrorState title="Buku tidak dapat dimuat">Repository mock gagal merespons.</ErrorState>
  return <Reader book={resource.data} requestedPageId={pageId} />
}

function Reader({ book, requestedPageId }: { book: MockBook; requestedPageId?: string }) {
  const initialIndex = Math.max(0, requestedPageId ? book.pages.findIndex((page) => page.id === requestedPageId) : (getReaderProgress(book.slug)?.page ?? 1) - 1)
  const [started, setStarted] = useState(Boolean(requestedPageId))
  const [index, setIndex] = useState(initialIndex)
  const [tocOpen, setTocOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const [submission, setSubmission] = useState<MockSubmitResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const page = book.pages[index]
  const go = (next: number) => { setIndex(next); setTocOpen(false); saveReaderProgress({ bookSlug: book.slug, page: next + 1, updatedAt: new Date().toISOString() }) }
  const reset = () => { clearReaderProgress(); go(0); setStarted(true) }
  const submit = async () => { setSubmitting(true); try { setSubmission(await submitMockAnswer(answer)) } finally { setSubmitting(false) } }
  if (!started) return <section className="cover"><div className="cover-art" aria-hidden="true"><span>✦</span><span>◒</span><span>⌁</span></div><div className="cover-copy"><p className="eyebrow">BUKU DIGITAL · CONTOH MOCK</p><h1>{book.title}</h1><p className="lede">{book.description}</p><dl className="book-meta"><div><dt>Mata pelajaran</dt><dd>{book.subject}</dd></div><div><dt>Kelas</dt><dd>{book.grade}</dd></div><div><dt>Progres</dt><dd>Belum dimulai</dd></div></dl><div className="action-row"><button className="button primary" onClick={() => setStarted(true)}>Mulai membaca →</button><button className="button quiet" onClick={reset}>Mulai dari awal</button></div><p className="helper">Progres mock tersimpan hanya di browser ini.</p></div></section>
  if (!page) return <ErrorState title="Tujuan halaman tidak tersedia">Halaman tidak ada pada snapshot mock.</ErrorState>
  return <section className="reader-layout"><aside className={tocOpen ? 'toc is-open' : 'toc'}><div className="toc-title"><span>Daftar isi</span><button onClick={() => setTocOpen(false)} aria-label="Tutup daftar isi">×</button></div>{book.pages.map((item, itemIndex) => <button key={item.id} className={index === itemIndex ? 'toc-item is-current' : 'toc-item'} onClick={() => go(itemIndex)}><span>{String(itemIndex + 1).padStart(2, '0')}</span><span>{item.label}<small>{item.kind}</small></span></button>)}</aside><div className="reader-main"><div className="reader-toolbar"><button className="icon-button" onClick={() => setTocOpen(!tocOpen)} aria-expanded={tocOpen}>☰</button><div><strong>{book.title}</strong><span>Halaman {index + 1} dari {book.pages.length}</span></div><button className="button compact">Aa</button></div><article className="book-page"><p className="eyebrow">{page.kind.toUpperCase()}</p><h1>{page.label}</h1><p className="intro">{page.body}</p>{page.kind === 'Halaman' && <figure><div className="illustration">🌿 <span>↔</span> 🐝 <span>↔</span> 🌻</div><figcaption>Hubungan antarbagian ekosistem saling terkait.</figcaption></figure>}{page.kind === 'Aktivitas' && <Activity answer={answer} setAnswer={setAnswer} submission={submission} submitting={submitting} submit={submit} />}</article><nav className="reader-nav"><button className="button quiet" disabled={index === 0} onClick={() => go(index - 1)}>← Sebelumnya</button><span>{index + 1}/{book.pages.length}</span><button className="button primary" disabled={index === book.pages.length - 1} onClick={() => go(index + 1)}>Berikutnya →</button></nav></div></section>
}

function Activity({ answer, setAnswer, submission, submitting, submit }: { answer: string; setAnswer: (answer: string) => void; submission: MockSubmitResult | null; submitting: boolean; submit: () => Promise<void> }) {
  return <><fieldset><legend>Pilih satu jawaban</legend><label><input type="radio" value="selokan" checked={answer === 'selokan'} onChange={(event) => setAnswer(event.target.value)} /> Membuang sampah ke selokan</label><label><input type="radio" value="menanam" checked={answer === 'menanam'} onChange={(event) => setAnswer(event.target.value)} /> Menanam dan merawat pohon</label><label><input type="radio" value="membakar" checked={answer === 'membakar'} onChange={(event) => setAnswer(event.target.value)} /> Membakar daun setiap hari</label></fieldset><div className="activity-actions"><button className="button primary" disabled={!answer || submitting || Boolean(submission)} onClick={submit}>{submitting ? 'Mengirim mock…' : 'Kirim jawaban mock'}</button><p className="notice" aria-live="polite">{submission ? `Diterima mock lokal · receipt ${submission.receiptId}. Bukan penerimaan server atau hasil penilaian.` : 'Status: belum diterima server.'}</p></div></>
}

type FoundationBook = {
  id: string
  title: string
  draft_status: 'draft' | 'archived'
  current_revision: number
  updated_at: string
}

function AdminInfoShell({ active, title, eyebrow, children }: { active: 'settings' | 'about' | 'editor'; title: string; eyebrow: string; children: ReactNode }) {
  const navigate = useNavigate()
  useEffect(() => { const nav = document.querySelector('.admin-nav'); if (!nav || nav.querySelector('.sidebar-logout')) return; const button = document.createElement('button'); button.className = 'sidebar-logout'; button.textContent = '↪  Keluar'; button.onclick = async () => { if (supabase) await supabase.auth.signOut(); navigate('/admin/login', { replace: true }) }; nav.appendChild(button); return () => button.remove() }, [navigate])
  return <div className="admin-dashboard-page admin-layout"><aside className="admin-nav"><div className="admin-nav-brand"><span className="brand-mark">F</span><strong>Flipbook Studio</strong></div><div className="workspace-switcher">KOLEKSI PUBLIKASI<span>⌄</span></div><p className="admin-nav-label">WORKSPACE</p><Link to="/admin">⌂ <span>Dashboard</span></Link><Link to="/admin/books">▣ <span>Koleksi Flipbook</span></Link><Link to="/admin/editor">✦ <span>Editor Interaktif</span></Link><Link className={active === 'settings' ? 'is-current' : ''} to="/admin/settings">⚙ <span>Pengaturan</span></Link><Link className={active === 'about' ? 'is-current' : ''} to="/admin/about">ⓘ <span>Tentang Kami</span></Link><div className="storage-card"><strong>Penyimpanan</strong><span>Telemetry provider belum tersedia</span><div className="storage-bar"><i /></div></div></aside><section className="workspace"><nav className="breadcrumbs"><Link to="/admin">Dashboard</Link><span>/</span><span>{title}</span></nav><div className="workspace-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div></div>{children}</section></div>
}

function SettingsRoute() {
  useEffect(() => {
    const saved = localStorage.getItem('flipbook-studio-display-name')
    const input = document.querySelector('.settings-card input:not([type="checkbox"])') as HTMLInputElement | null
    if (input && saved) input.value = saved
    const button = document.querySelector('.settings-card .button')
    const handleSave = () => { if (input?.value.trim()) { localStorage.setItem('flipbook-studio-display-name', input.value.trim()); window.dispatchEvent(new Event('flipbook-profile-updated')); const toast = document.createElement('div'); toast.className = 'save-toast'; toast.innerHTML = '<span>✓</span><div><strong>Pengaturan tersimpan</strong><small>Perubahan profil berhasil disimpan.</small></div>'; document.body.appendChild(toast); requestAnimationFrame(() => toast.classList.add('is-visible')); window.setTimeout(() => { toast.classList.remove('is-visible'); window.setTimeout(() => toast.remove(), 220) }, 2600) } }
    button?.addEventListener('click', handleSave)
    return () => button?.removeEventListener('click', handleSave)
  }, [])
  return <AdminInfoShell active="settings" eyebrow="PREFERENSI WORKSPACE" title="Pengaturan"><section className="settings-grid"><article className="panel settings-card"><h2>Preferensi tampilan</h2><p>Atur pengalaman kerja editor sesuai kebutuhan Anda.</p><label className="settings-row"><span><strong>Tema gelap</strong><small>Gunakan tema gelap di seluruh workspace.</small></span><input type="checkbox" defaultChecked /></label><label className="settings-row"><span><strong>Simpan otomatis</strong><small>Simpan perubahan lokal saat mengedit.</small></span><input type="checkbox" defaultChecked /></label></article><article className="panel settings-card"><h2>Profil redaksi</h2><p>Informasi yang tampil di area administrator.</p><label>Nama tampilan<input defaultValue="Editor Redaksi" /></label><label>Email<input type="email" defaultValue="admin@flipbook.id" /></label><button className="button primary">Simpan pengaturan</button></article></section></AdminInfoShell>
}

function AboutRouteLegacy() {
  return <AdminInfoShell active="about" eyebrow="TENTANG PLATFORM" title="Tentang Kami"><section className="panel about-card"><div className="about-logo"><img src="/flipbook-studio-logo.png" alt="Flipbook Studio" /></div><div><h2>Flipbook Studio</h2><p>Workspace untuk membuat, mengelola, dan menerbitkan flipbook digital interaktif dengan pengalaman membaca yang nyaman.</p><div className="about-meta"><span>Versi MVP</span><span>Supabase dev</span><span>© 2026 Flipbook Studio</span></div></div></section></AdminInfoShell>
}

function AboutRoute() {
  return <AdminInfoShell active="about" eyebrow="TENTANG PLATFORM" title="Tentang Kami"><section className="about-hero"><div className="about-developer-logo"><img src="/developer-badge.png" alt="papapisqy Developer" /></div><div><p className="eyebrow">CREATOR &amp; DEVELOPER</p><h2>papapisqy</h2><p>Membangun Flipbook Studio sebagai ruang kerja digital yang rapi, mudah digunakan, dan relevan untuk membuat publikasi interaktif.</p><div className="about-meta"><span>Product Development</span><span>UI/UX</span><span>Sistem Informasi</span></div></div></section><section className="about-cards"><article className="panel about-card"><small>01</small><h3>Visi pengembangan</h3><p>Menghadirkan pengalaman membuat flipbook yang profesional, fleksibel, dan mudah dipahami.</p></article><article className="panel about-card"><small>02</small><h3>Prinsip produk</h3><p>Sederhana saat digunakan, rapi di setiap halaman, dan aman untuk pengelolaan konten.</p></article><article className="panel about-card"><small>03</small><h3>Tentang aplikasi</h3><p>Flipbook Studio membantu admin mengimpor PDF, menyusun halaman, dan mengelola publikasi digital.</p></article></section><section className="about-quote">Berkarya melalui teknologi yang bermanfaat.<small>— papapisqy</small></section></AdminInfoShell>
}

function DashboardRoute() {
  return <LegacyDashboardRoute />
}

function FoundationBookProbe() {
  const location = useLocation()
  const staleProbeTriggered = useRef(false)
  const provisionTriggered = useRef(false)
  const idempotencyProbeTriggered = useRef(false)
  const idempotencyConcurrentProbeTriggered = useRef(false)
  const idempotencyRetentionProbeTriggered = useRef(false)
  const isolationTargetTriggered = useRef(false)
  const foreignWriteTriggered = useRef(false)
  const [books, setBooks] = useState<FoundationBook[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [casProbe, setCasProbe] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (staleProbeTriggered.current || new URLSearchParams(location.search).get('foundation') !== 'stale-cas') return
    staleProbeTriggered.current = true
    window.history.replaceState(null, '', location.pathname)
    void runStaleCasProbe()
  }, [location.pathname, location.search])
  useEffect(() => {
    if (idempotencyRetentionProbeTriggered.current || new URLSearchParams(location.search).get('foundation') !== 'idempotency-retention') return
    idempotencyRetentionProbeTriggered.current = true
    window.history.replaceState(null, '', location.pathname)
    void runIdempotencyRetentionProbe()
  }, [location.pathname, location.search])
  useEffect(() => {
    if (idempotencyConcurrentProbeTriggered.current || new URLSearchParams(location.search).get('foundation') !== 'idempotency-concurrent') return
    idempotencyConcurrentProbeTriggered.current = true
    window.history.replaceState(null, '', location.pathname)
    void runIdempotencyConcurrentProbe()
  }, [location.pathname, location.search])
  useEffect(() => {
    const parameters = new URLSearchParams(location.search)
    const targetAdminId = parameters.get('target')
    if (provisionTriggered.current || parameters.get('foundation') !== 'provision-admin' || !targetAdminId) return
    provisionTriggered.current = true
    window.history.replaceState(null, '', location.pathname)
    void provisionTestAdmin(targetAdminId, parameters.get('name') ?? 'Admin uji kedua')
  }, [location.pathname, location.search])
  useEffect(() => {
    if (idempotencyProbeTriggered.current || new URLSearchParams(location.search).get('foundation') !== 'idempotency-negative') return
    idempotencyProbeTriggered.current = true
    window.history.replaceState(null, '', location.pathname)
    void runIdempotencyNegativeProbe()
  }, [location.pathname, location.search])
  useEffect(() => {
    if (isolationTargetTriggered.current || new URLSearchParams(location.search).get('foundation') !== 'isolation-target') return
    isolationTargetTriggered.current = true
    window.history.replaceState(null, '', location.pathname)
    void createIsolationTarget()
  }, [location.pathname, location.search])
  useEffect(() => {
    if (foreignWriteTriggered.current || new URLSearchParams(location.search).get('foundation') !== 'foreign-write') return
    foreignWriteTriggered.current = true
    window.history.replaceState(null, '', location.pathname)
    void runForeignWriteProbe()
  }, [location.pathname, location.search])
  const load = async () => {
    if (!supabase) { setError('Konfigurasi Supabase belum tersedia.'); return }
    const { data, error: queryError } = await supabase
      .from('books')
      .select('id, title, draft_status, current_revision, updated_at')
      .order('created_at', { ascending: true })
    if (queryError) { setError('Buku foundation tidak dapat dibaca melalui policy saat ini.'); return }
    setBooks((data ?? []) as FoundationBook[])
  }
  useEffect(() => { void load() }, [])
  const mutate = async (operation: 'create' | 'update_metadata' | 'archive', book?: FoundationBook) => {
    if (!supabase) return
    setBusy(true); setError(null)
    const body = operation === 'create'
      ? { operation, bookId: crypto.randomUUID(), draftId: crypto.randomUUID(), title: 'Buku uji foundation dev' }
      : operation === 'update_metadata'
        ? { operation, bookId: book?.id, expectedRevision: book?.current_revision, title: `${book?.title ?? 'Buku'} · diperiksa`, draftMetadata: { source: 'foundation-dev-check', updatedAt: new Date().toISOString() } }
        : { operation, bookId: book?.id, expectedRevision: book?.current_revision }
    const { error: invokeError } = await supabase.functions.invoke('mutate-book-draft', { body })
    if (invokeError) {
      const context = (invokeError as { context?: Response }).context
      const status = context?.status
      const payload = context ? await context.clone().json().catch(() => null) as { error?: unknown } | null : null
      const code = typeof payload?.error === 'string' ? payload.error : 'unavailable'
      setError(`Operasi foundation ditolak atau belum dapat dijalankan (${status ?? 'network'}: ${code}). Tidak ada detail sensitif ditampilkan.`)
      setBusy(false)
      return
    }
    await load(); setBusy(false)
  }
  const runStaleCasProbe = async () => {
    if (!supabase) return
    const client = supabase
    setBusy(true); setError(null); setCasProbe(null)
    const bookId = crypto.randomUUID()
    const draftId = crypto.randomUUID()
    const title = 'Buku uji konflik CAS'
    const created = await client.functions.invoke('mutate-book-draft', { body: { operation: 'create', bookId, draftId, title } })
    if (created.error) { setError('Buku konflik CAS tidak dapat dibuat. Tidak ada detail sensitif ditampilkan.'); setBusy(false); return }
    const makeUpdate = (suffix: string) => client.functions.invoke('mutate-book-draft', {
      body: { operation: 'update_metadata', bookId, expectedRevision: 0, title: `${title} ${suffix}`, draftMetadata: { probe: 'stale-cas', contender: suffix } },
    })
    const [first, second] = await Promise.all([makeUpdate('A'), makeUpdate('B')])
    const successes = [first, second].filter((result) => !result.error).length
    const rejections = [first, second].filter((result) => Boolean(result.error)).length
    setCasProbe(successes === 1 && rejections === 1
      ? 'PASS — satu update diterima dan satu revisi stale ditolak.'
      : `FAIL — hasil konflik tidak sesuai: ${successes} diterima, ${rejections} ditolak.`)
    await load(); setBusy(false)
  }
  const provisionTestAdmin = async (targetAdminId: string, displayName = 'Admin uji kedua') => {
    if (!supabase || !targetAdminId.trim()) return
    setBusy(true); setError(null); setCasProbe(null)
    const { error: invokeError } = await supabase.functions.invoke('provision-admin', {
      body: { targetAdminId: targetAdminId.trim(), displayName: displayName.trim() || null },
    })
    if (invokeError) {
      setError('Provisioning admin uji ditolak atau belum dapat dijalankan. Tidak ada detail sensitif ditampilkan.')
      setBusy(false)
      return
    }
    setCasProbe('PASS — admin uji kedua berhasil diprovision; masuk dengan akun itu untuk uji isolasi.')
    setBusy(false)
  }
  const runIdempotencyNegativeProbe = async () => {
    if (!supabase) return
    setBusy(true); setError(null); setCasProbe(null)
    const bookId = crypto.randomUUID()
    const draftId = crypto.randomUUID()
    const idempotencyKey = crypto.randomUUID()
    const body = { operation: 'create', bookId, draftId, title: 'Buku uji replay idempotensi', idempotencyKey }
    const first = await supabase.functions.invoke('mutate-book-draft', { body })
    const second = await supabase.functions.invoke('mutate-book-draft', { body })
    const firstAccepted = !first.error
    const secondAccepted = !second.error
    const firstData = first.data as { bookId?: string; draftId?: string; revision?: number } | null
    const secondData = second.data as { bookId?: string; draftId?: string; revision?: number } | null
    const sameResult = firstAccepted && secondAccepted && firstData?.bookId === secondData?.bookId && firstData?.draftId === secondData?.draftId && firstData?.revision === secondData?.revision
    setCasProbe(sameResult
      ? 'PASS — replay idempoten mengembalikan hasil operasi yang sama tanpa duplikasi operasi.'
      : `HASIL TIDAK TERDUGA — request pertama ${firstAccepted ? 'diterima' : 'ditolak'}, replay ${secondAccepted ? 'diterima' : 'ditolak'}.`)
    await load(); setBusy(false)
  }
  const runIdempotencyConcurrentProbe = async () => {
    if (!supabase) return
    setBusy(true); setError(null); setCasProbe(null)
    const bookId = crypto.randomUUID()
    const draftId = crypto.randomUUID()
    const idempotencyKey = crypto.randomUUID()
    const body = { operation: 'create', bookId, draftId, title: 'Buku uji concurrency idempotensi', idempotencyKey }
    const [first, second] = await Promise.all([
      supabase.functions.invoke('mutate-book-draft', { body }),
      supabase.functions.invoke('mutate-book-draft', { body }),
    ])
    const firstData = first.data as { bookId?: string; draftId?: string; revision?: number } | null
    const secondData = second.data as { bookId?: string; draftId?: string; revision?: number } | null
    const sameResult = !first.error && !second.error && firstData?.bookId === secondData?.bookId && firstData?.draftId === secondData?.draftId && firstData?.revision === secondData?.revision
    setCasProbe(sameResult
      ? 'PASS — dua request paralel menghasilkan respons identik; klaim idempotensi terserialisasi.'
      : `FAIL — hasil paralel tidak identik: request pertama ${first.error ? 'ditolak' : 'diterima'}, request kedua ${second.error ? 'ditolak' : 'diterima'}.`)
    await load(); setBusy(false)
  }
  const runIdempotencyRetentionProbe = async () => {
    if (!supabase) return
    setBusy(true); setError(null); setCasProbe(null)
    const bookId = crypto.randomUUID(); const draftId = crypto.randomUUID(); const idempotencyKey = crypto.randomUUID()
    const body = { operation: 'create', bookId, draftId, title: 'Buku uji retensi idempotensi', idempotencyKey }
    const first = await supabase.functions.invoke('mutate-book-draft', { body })
    const replay = await supabase.functions.invoke('mutate-book-draft', { body })
    const mismatch = await supabase.functions.invoke('mutate-book-draft', { body: { ...body, title: 'Payload berbeda' } })
    const firstResult = first.data as { status?: string; bookId?: string; draftId?: string; revision?: number } | null
    const replayResult = replay.data as { status?: string; bookId?: string; draftId?: string; revision?: number } | null
    const sameReplay = !first.error && !replay.error && firstResult?.status === replayResult?.status && firstResult?.bookId === replayResult?.bookId && firstResult?.draftId === replayResult?.draftId && firstResult?.revision === replayResult?.revision
    const mismatchRejected = Boolean(mismatch.error)
    setCasProbe(sameReplay && mismatchRejected
      ? 'PASS — replay aktif identik, payload berbeda ditolak; retensi lifecycle tetap belum membuktikan expiry/cleanup.'
      : `HASIL TIDAK LENGKAP — replay ${sameReplay ? 'PASS' : 'FAIL'}, mismatch ${mismatchRejected ? 'ditolak' : 'diterima'}.`)
    await load(); setBusy(false)
  }
  const createIsolationTarget = async () => {
    if (!supabase) return
    const bookId = crypto.randomUUID()
    setBusy(true); setError(null); setCasProbe(null)
    const { error: invokeError } = await supabase.functions.invoke('mutate-book-draft', {
      body: { operation: 'create', bookId, draftId: crypto.randomUUID(), title: 'Buku uji isolasi lintas admin' },
    })
    if (invokeError) {
      setError('Target uji isolasi tidak dapat dibuat. Tidak ada detail sensitif ditampilkan.')
      setBusy(false)
      return
    }
    window.localStorage.setItem('foundation-isolation-target', JSON.stringify({ bookId, expectedRevision: 0 }))
    setCasProbe('PASS — target uji isolasi dibuat untuk admin aktif; lanjutkan dengan akun admin kedua.')
    await load(); setBusy(false)
  }
  const runForeignWriteProbe = async () => {
    if (!supabase) return
    const stored = window.localStorage.getItem('foundation-isolation-target')
    let target: { bookId?: unknown; expectedRevision?: unknown } | null = null
    try { target = stored ? JSON.parse(stored) as { bookId?: unknown; expectedRevision?: unknown } : null } catch { target = null }
    if (typeof target?.bookId !== 'string' || typeof target.expectedRevision !== 'number') {
      setError('Target uji isolasi tidak tersedia pada browser ini. Jalankan tahap target dengan admin pertama terlebih dahulu.')
      return
    }
    setBusy(true); setError(null); setCasProbe(null)
    const { error: invokeError } = await supabase.functions.invoke('mutate-book-draft', {
      body: { operation: 'update_metadata', bookId: target.bookId, expectedRevision: target.expectedRevision, title: 'Mutasi lintas admin tidak sah', draftMetadata: { probe: 'foreign-write' } },
    })
    setCasProbe(invokeError
      ? 'PASS — mutasi buku milik admin lain ditolak oleh batas server.'
      : 'FAIL — mutasi lintas admin tidak semestinya diterima.')
    await load(); setBusy(false)
  }
  return <section className="panel" aria-labelledby="foundation-title"><div className="panel-heading"><div><p className="eyebrow">SUPABASE DEV</p><h2 id="foundation-title">Pemeriksaan buku foundation</h2><p>Hanya data milik admin aktif. Tombol ini memanggil Edge Function terotentikasi, bukan mutasi browser langsung.</p></div></div>{error && <p className="auth-error" role="alert">{error}</p>}{casProbe && <p className={casProbe.startsWith('PASS') ? 'notice' : 'auth-error'} role="status">{casProbe}</p>}<div className="action-row"><button className="button quiet compact" disabled={busy} onClick={() => void runStaleCasProbe}>{busy ? 'Memproses…' : 'Uji konflik CAS stale'}</button><p className="helper">Membuat satu buku sintetis, lalu dua update paralel dengan revisi awal yang sama.</p></div>{books === null ? <p className="helper">Memeriksa akses RLSâ€¦</p> : books.length === 0 ? <div className="action-row"><p className="helper">Belum ada buku foundation. Buat satu data sintetis untuk uji nonproduksi.</p><button className="button primary" disabled={busy} onClick={() => void mutate('create')}>{busy ? 'Memprosesâ€¦' : 'Buat buku uji'}</button></div> : books.map((book) => <div className="book-row" key={book.id}><div><strong>{book.title}</strong><span>Status {book.draft_status} Â· revisi {book.current_revision}</span></div><div className="action-row">{book.draft_status === 'draft' && <><button className="button compact" disabled={busy} onClick={() => void mutate('update_metadata', book)}>Uji simpan CAS</button><button className="button quiet compact" disabled={busy} onClick={() => void mutate('archive', book)}>Arsipkan uji</button></>}<button className="button quiet compact" disabled={busy} onClick={() => void load()}>Muat ulang</button></div></div>)}</section>
}

function DashboardFrame({ books: sourceBooks, onCreate, creating = false }: { books: Array<{ id: string; title: string; status: string; meta: string; href: string }>; onCreate?: () => void; creating?: boolean }) {
  useEffect(() => {
    const updateName = () => { const name = localStorage.getItem('flipbook-studio-display-name') || 'Editor Redaksi'; const email = localStorage.getItem('flipbook-studio-email') || 'admin@flipbook.id'; const heading = document.querySelector('.dashboard-hero h1'); if (heading) heading.innerHTML = `Selamat berkarya, ${name} <span>👋</span>`; const profileName = document.querySelector('.dashboard-profile strong'); const profileEmail = document.querySelector('.dashboard-profile small'); if (profileName) profileName.textContent = name; if (profileEmail) profileEmail.textContent = email }
    updateName(); window.addEventListener('flipbook-profile-updated', updateName); return () => window.removeEventListener('flipbook-profile-updated', updateName)
  }, [])
  const navigate = useNavigate()
  useEffect(() => { const handler = (event: Event) => { const target = event.target as HTMLElement; const card = target.closest('.project-card'); if (card?.textContent?.includes('Mulai Impor PDF')) { event.preventDefault(); navigate('/admin/books?upload=1') } }; document.addEventListener('click', handler); return () => document.removeEventListener('click', handler) }, [navigate])
  const [menuOpen, setMenuOpen] = useState(false)
  const books = sourceBooks
  const active = books.filter((book) => book.status === 'Terbit').length
  const recentBooks = books.slice(0, 3)
  const draftCount = books.filter((book) => book.status === 'Draf').length
  return <div className="admin-dashboard-page admin-layout">
    <aside className={`admin-nav${menuOpen ? ' is-open' : ''}`}>
      <div className="admin-nav-brand"><span className="brand-mark">F</span><strong>Flipbook<br />Studio</strong></div>
      <button className="admin-menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}><span /><span /><span /></button>
      <div className="workspace-switcher"><small>Ruang Kerja</small><strong>Koleksi Publikasi</strong><span>⌃⌄</span></div>
      <Link className="is-current" to="/admin">▦ <span>Dashboard</span></Link>
      <Link to="/admin/books">▤ <span>Koleksi Flipbook</span></Link>
      <Link to="/admin/editor">⚒ <span>Editor Interaktif</span></Link>
      <Link to="/admin/settings">⚙ <span>Pengaturan</span></Link><Link to="/admin/about">ⓘ <span>Tentang Kami</span></Link>
      <div className="storage-card"><strong>Penyimpanan Cloud</strong><span>Telemetry provider belum tersedia</span><div className="storage-bar"><i /></div></div>
    </aside>
    <section className="workspace">
      <header className="dashboard-header"><div className="dashboard-search">⌕ <span>Cari flipbook, majalah, edisi...</span></div><div className="dashboard-profile"><span className="notification">♧</span><span className="avatar">ER</span><div><strong>Editor Redaksi</strong><small>admin@flipbook.id</small></div></div></header>
      <div className="dashboard-hero"><div><p className="workspace-badge">● Ruang Kreasi Flipbook <em>Siap untuk berkarya</em></p><h1>Selamat berkarya, Sarah Amanda <span>👋</span></h1><p>Buat, susun, dan terbitkan flipbook interaktif yang menarik untuk dibagikan kepada pembaca Anda.</p></div><div className="dashboard-actions"><Link className="button quiet" to="/admin/books/book-ekosistem/editor">⇧ &nbsp;Unggah PDF Cepat</Link><button className="button primary" disabled={creating} onClick={onCreate}>{creating ? 'Membuat…' : '⊕ &nbsp; Buat Flipbook Baru'}</button></div></div>
      <div className="stats-grid reference-stats"><Stat label="Total Flipbook Aktif" value={String(active)} detail="Publikasi" /><Stat label="Total Pembaca & Tayangan" value="—" detail="Telemetry belum tersedia" /><Stat label="Interaksi & Hotspot" value="—" detail="Belum ada data" /><Stat label="Kapasitas Cloud" value="—" detail="Provider belum tersedia" /></div>
      <section className="project-section"><div className="section-title"><h2>🚀 Mulai Proyek Baru</h2><span>Pilih alur kerja sesuai tipe materi publikasi Anda</span></div><div className="project-grid"><Link className="project-card" to="/admin/books/book-ekosistem/editor"><b className="project-pdf-icon" aria-label="Dokumen PDF"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.75h8l4 4v14.5H6z" /><path d="M14 2.75v4h4M8.5 14h7M8.5 17h5" /></svg></b><h3>Konversi PDF ke Flipbook</h3><p>Impor berkas dokumen majalah, brosur, atau e-book menjadi pengalaman digital.</p><strong>Mulai Impor PDF →</strong></Link><Link className="project-card" to="/admin/books/book-ekosistem/editor"><b>▦</b><h3>Template Majalah & Katalog</h3><p>Mulai dari kurasi layout editorial dengan tipografi modern.</p><strong>Eksplor Galeri Template →</strong></Link><Link className="project-card" to="/admin/books/book-ekosistem/editor"><b>▷</b><h3>Presentasi Interaktif</h3><p>Sisipkan audio, hotspot, dan interaksi halaman.</p><strong>Buka Kanvas Interaktif →</strong></Link></div></section>
      <div className="publication-layout"><section className="panel publications-panel" id="books"><div className="panel-heading"><div><h2>Publikasi Flipbook Terbaru</h2><p>Daftar publikasi aktif dan draf editorial</p></div><div className="publication-tabs"><span className="active">Semua ({books.length})</span><span>Live ({active})</span><span>Draf ({draftCount})</span></div></div>{books.length === 0 ? <EmptyState title="Belum ada buku">Buat buku baru untuk memulai.</EmptyState> : recentBooks.map((book) => <div className="book-row" key={book.id}><div className="book-thumb">FS</div><div><strong>{book.title}</strong><span>{book.meta}</span></div><span className={`status ${book.status === 'Draf' ? 'draft' : 'neutral'}`}>{book.status}</span><Link className="button compact" to={book.href}>Edit</Link></div>)}</section><aside className="analytics-stack"><div className="analytics-card"><h3>Statistik Pembaca Harian</h3><strong>—</strong><p>Data telemetry belum tersedia.</p></div><div className="analytics-card"><h3>Perangkat Pembaca</h3><p>Belum ada data pembaca.</p></div></aside></div>
    </section>
  </div>
}

function LegacyDashboardRoute() {
  if (supabase) return <RealDashboardRoute />
  const [resource, setResource] = useState<Resource<MockBook[]>>({ status: 'loading' })
  useEffect(() => { mockBookRepository.listAdminBooks().then((data) => setResource({ status: 'ready', data })).catch(() => setResource({ status: 'error' })) }, [])
  if (resource.status === 'loading') return <LoadingState label="Memuat dashboard mock…" />
  if (resource.status === 'error') return <ErrorState title="Dashboard tidak tersedia">Repository mock gagal merespons.</ErrorState>
  if (resource.status !== 'ready') return null
  return <DashboardFrame books={resource.data.map((book) => ({ id: book.id, title: book.title, status: book.publicationStatus, meta: `Draf revisi ${book.draftRevision} · ${book.pages.length} halaman`, href: `/admin/books/${book.id}/editor` }))} />
  return <div className="admin-dashboard-page admin-layout"><aside className="admin-nav"><div className="admin-nav-brand"><span className="brand-mark">F</span><strong>Flipbook Studio</strong></div><div className="workspace-switcher">KOLEKSI PUBLIKASI<span>⌄</span></div><p className="admin-nav-label">WORKSPACE</p><Link className="is-current" to="/admin">⌂ <span>Dashboard</span></Link><a href="#books">▣ <span>Koleksi Flipbook</span></a><Link to="/admin/books/book-ekosistem/editor">✦ <span>Editor Interaktif</span></Link><a href="#settings">⚙ <span>Pengaturan</span></a><a href="#about">ⓘ <span>Tentang Kami</span></a><div className="storage-card"><strong>Penyimpanan</strong><span>Telemetry provider belum tersedia</span><div className="storage-bar"><i /></div></div></aside><section className="workspace"><nav className="breadcrumbs">Dashboard</nav><div className="workspace-heading"><div><p className="eyebrow">WORKSPACE ADMINISTRATOR</p><h1>Selamat datang kembali 👋</h1><p>Kelola publikasi dan pantau pengalaman pembaca Anda.</p></div><div className="dashboard-actions"><Link className="button quiet" to="/admin/books/book-ekosistem/editor">Unggah PDF Cepat</Link><Link className="button primary" to="/admin/books/book-ekosistem/editor">+ Buat Flipbook Baru</Link></div></div><div className="stats-grid"><Stat label="Buku draf" value={String(resource.data.filter((book) => book.publicationStatus === 'Draf').length)} detail="Data mock" /><Stat label="Versi terbit" value={String(resource.data.filter((book) => book.publicationStatus === 'Terbit').length)} detail="Tanpa data aktual" /><Stat label="Pembaca & tayangan" value="—" detail="Belum ada telemetry" /><Stat label="Penyimpanan" value="—" detail="Membutuhkan telemetry provider" /></div><section className="panel" id="books"><div className="panel-heading"><div><h2>Daftar buku</h2><p>Data dari repository mock.</p></div><a href="#books" className="panel-link">Lihat semua →</a></div>{resource.data.length === 0 ? <EmptyState title="Belum ada buku">Buat buku saat backend siap.</EmptyState> : resource.data.map((book) => <div className="book-row" key={book.id}><div className="book-thumb">{book.subject}</div><div><strong>{book.title}</strong><span>Draf revisi {book.draftRevision} · {book.pages.length} halaman</span></div><span className={`status ${book.publicationStatus === 'Draf' ? 'draft' : 'neutral'}`}>{book.publicationStatus}</span><Link className="button compact" to={`/admin/books/${book.id}/editor`}>Edit</Link></div>)}</section></section></div>
}

function RealDashboardRoute() {
  const [books, setBooks] = useState<FoundationBook[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const refresh = () => { if (!supabase) return; void supabase.from('books').select('id, title, draft_status, current_revision, updated_at').order('created_at', { ascending: false }).then(({ data, error: queryError }) => { if (queryError) setError('Daftar buku tidak dapat dimuat melalui policy aktif.'); else setBooks((data ?? []) as FoundationBook[]) }) }
  useEffect(() => {
    refresh()
  }, [])
  const createBook = async () => {
    if (!supabase) return
    setCreating(true); setError(null)
    const { error: invokeError } = await supabase.functions.invoke('mutate-book-draft', { body: { operation: 'create', bookId: crypto.randomUUID(), draftId: crypto.randomUUID(), title: 'Buku baru' } })
    if (invokeError) setError('Buku baru tidak dapat dibuat. Periksa sesi admin dan policy.')
    else refresh()
    setCreating(false)
  }
  if (error) return <ErrorState title="Dashboard tidak tersedia">{error}</ErrorState>
  return <DashboardFrame books={books.map((book) => ({ id: book.id, title: book.title, status: book.draft_status === 'draft' ? 'Draf' : 'Terbit', meta: `Revisi ${book.current_revision} · diperbarui ${new Date(book.updated_at).toLocaleString('id-ID')}`, href: `/admin/books/${book.id}/editor` }))} onCreate={() => void createBook()} creating={creating} />
  return <div className="admin-dashboard-page admin-layout"><aside className="admin-nav"><div className="admin-nav-brand"><span className="brand-mark">F</span><strong>Flipbook Studio</strong></div><div className="workspace-switcher">KOLEKSI PUBLIKASI<span>⌄</span></div><p className="admin-nav-label">WORKSPACE</p><Link className="is-current" to="/admin">⌂ <span>Dashboard</span></Link><Link to="/admin#books">▣ <span>Koleksi Flipbook</span></Link><Link to="/admin/books/book-ekosistem/editor">✦ <span>Editor Interaktif</span></Link><Link to="/admin#settings">⚙ <span>Pengaturan</span></Link><a href="#about">ⓘ <span>Tentang Kami</span></a><div className="storage-card"><strong>Penyimpanan</strong><span>Telemetry provider belum tersedia</span><div className="storage-bar"><i /></div></div></aside><section className="workspace"><nav className="breadcrumbs">Dashboard</nav><div className="workspace-heading"><div><p className="eyebrow">WORKSPACE ADMINISTRATOR · DATA NYATA</p><h1>Selamat datang kembali 👋</h1><p>Buku dimuat dari Supabase dev.</p></div><div className="dashboard-actions"><Link className="button quiet" to="/admin/books/book-ekosistem/editor">Unggah PDF Cepat</Link><button className="button primary" disabled={creating} onClick={() => void createBook()}>{creating ? 'Membuat…' : '+ Buat Flipbook Baru'}</button></div></div><div className="stats-grid"><Stat label="Buku draf" value={String(books.filter((book) => book.draft_status === 'draft').length)} detail="Supabase dev" /><Stat label="Buku diarsipkan" value={String(books.filter((book) => book.draft_status === 'archived').length)} detail="Lifecycle foundation" /><Stat label="Pembaca & tayangan" value="—" detail="Belum ada telemetry" /><Stat label="Penyimpanan" value="—" detail="Telemetry belum tersedia" /></div><section className="panel" id="books"><div className="panel-heading"><div><h2>Daftar buku</h2><p>Data persisten administrator aktif.</p></div><a href="#books" className="panel-link">Lihat semua →</a></div>{books.length === 0 ? <EmptyState title="Belum ada buku">Klik “Buat buku” untuk membuat draf di Supabase dev.</EmptyState> : books.map((book) => <div className="book-row" key={book.id}><div className="book-thumb">FS</div><div><strong>{book.title}</strong><span>Revisi {book.current_revision} · diperbarui {new Date(book.updated_at).toLocaleString('id-ID')}</span></div><span className={`status ${book.draft_status === 'draft' ? 'draft' : 'neutral'}`}>{book.draft_status === 'draft' ? 'Draf' : 'Arsip'}</span>{book.draft_status === 'draft' && <Link className="button compact" to={`/admin/books/${book.id}/editor`}>Edit</Link>}</div>)}</section></section></div>
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }

function CollectionRoute() {
  const [searchParams] = useSearchParams()
  const initialBooks = [
    { title: 'Peran Manusia dalam Ekosistem', meta: 'Terbit · 3 halaman', status: 'Terbit', href: '/admin/books/book-ekosistem/editor' },
    { title: 'Jelajah Samudra', meta: 'Draf · siap disusun', status: 'Draf', href: '/admin/books/book-ekosistem/editor' },
  ]
  const [books, setBooks] = useState(() => {
    try {
      const saved = window.localStorage.getItem('flipbook-studio-collection-books')
      if (saved) {
        const parsed = JSON.parse(saved) as typeof initialBooks
        const cleaned = parsed.filter((book) => !/^Buku (uji|baru)|^Buku uji|^Jelajah Samudra$|^Peran Manusia dalam Ekosistem$/.test(book.title))
        return cleaned.map((book) => {
          const legacyFile = new URLSearchParams(book.href.split('?')[1] ?? '').get('file') ?? undefined
          return { ...book, meta: book.meta.split(' · diimpor')[0], href: bookEditorHref(book.title, legacyFile) }
        })
      }
    } catch { /* gunakan data awal bila penyimpanan lokal tidak tersedia */ }
    return []
  })
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [showCreateChoice, setShowCreateChoice] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(searchParams.get('upload') === '1')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  useEffect(() => {
    try { window.localStorage.setItem('flipbook-studio-collection-books', JSON.stringify(books)) } catch { /* optional local persistence */ }
  }, [books])
  const removeBook = () => { if (pendingDelete) setBooks((current) => current.filter((book) => book.title !== pendingDelete)); setPendingDelete(null) }
  const createFromPdf = (event: FormEvent) => { event.preventDefault(); if (!uploadFile) return; const file = uploadFile; const title = uploadTitle.trim() || file.name.replace(/\.pdf$/i, ''); uploadedPdfUrls.set(title, URL.createObjectURL(file)); savePdfBlob(title, file); const reader = new FileReader(); reader.onload = () => { try { window.localStorage.setItem(`flipbook-studio-pdf-${title}`, String(reader.result)) } catch { /* object URL tetap dipakai selama sesi */ } setBooks((current) => [{ title, meta: 'Draf', status: 'Draf', href: bookEditorHref(title, file.name) }, ...current]); setUploadTitle(''); setUploadFile(null); setShowUploadModal(false) }; reader.readAsDataURL(file) }
  return <div className="admin-dashboard-page admin-layout"><aside className="admin-nav"><div className="admin-nav-brand"><span className="brand-mark">F</span><strong>Flipbook Studio</strong></div><div className="workspace-switcher">KOLEKSI PUBLIKASI<span>⌄</span></div><p className="admin-nav-label">WORKSPACE</p><Link to="/admin">⌂ <span>Dashboard</span></Link><Link className="is-current" to="/admin/books">▣ <span>Koleksi Flipbook</span></Link><Link to="/admin/books/book-ekosistem/editor">✦ <span>Editor Interaktif</span></Link><Link to="/admin/settings">⚙ <span>Pengaturan</span></Link><Link to="/admin/about">ⓘ <span>Tentang Kami</span></Link><div className="storage-card"><strong>Penyimpanan</strong><span>Telemetry provider belum tersedia</span><div className="storage-bar"><i /></div></div></aside><section className="workspace"><header className="dashboard-header"><div className="dashboard-search">⌕ <span>Cari flipbook, majalah, edisi...</span></div><div className="dashboard-profile"><span className="notification">♧</span><span className="avatar">ER</span><div><strong>Editor Redaksi</strong><small>admin@flipbook.id</small></div></div></header><nav className="breadcrumbs"><Link to="/admin">Dashboard</Link><span>/</span><span>Koleksi Flipbook</span></nav><div className="workspace-heading"><div><p className="eyebrow">KOLEKSI PUBLIKASI</p><h1>Koleksi Flipbook</h1><p>Kelola semua buku, draf, dan publikasi yang tersedia di workspace Anda.</p></div><button className="button primary" onClick={() => setShowCreateChoice(true)}>+ Buat Flipbook Baru</button></div><section className="panel collection-panel"><div className="panel-heading"><div><h2>Publikasi dan draf</h2><p>Daftar buku yang dapat Anda kelola.</p></div><span className="status neutral">{books.length} buku</span></div>{books.length === 0 ? <EmptyState title="Koleksi kosong">Belum ada buku untuk ditampilkan.</EmptyState> : books.map((book) => <div className="book-row" key={book.title}><div className="book-thumb">FS</div><div><strong>{book.title}</strong><span>{book.meta}</span></div><span className={`status ${book.status === 'Draf' ? 'draft' : 'neutral'}`}>{book.status}</span><Link className="button compact" to={book.href}>Buka editor</Link><button className="button compact danger-button" onClick={() => setPendingDelete(book.title)}>Hapus</button></div>)}</section></section>{pendingDelete && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null) }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="confirm-icon">!</div><p className="eyebrow">KONFIRMASI TINDAKAN</p><h2 id="delete-title">Hapus buku ini?</h2><p>Buku <strong>{pendingDelete}</strong> akan dihapus dari koleksi lokal ini. Tindakan ini tidak dapat dibatalkan.</p><div className="confirm-actions"><button className="button quiet" onClick={() => setPendingDelete(null)}>Batal</button><button className="button danger-solid" onClick={removeBook}>Ya, hapus buku</button></div></section></div>}{showCreateChoice && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreateChoice(false) }}><section className="confirm-modal create-choice-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><p className="eyebrow">PROYEK BARU</p><h2 id="create-title">Bagaimana Anda ingin memulai?</h2><p>Pilih alur kerja untuk membuat flipbook baru.</p><div className="choice-grid"><Link className="choice-card" to="/admin/books/book-ekosistem/editor" onClick={() => setShowCreateChoice(false)}><span>✦</span><strong>Editor Interaktif</strong><small>Susun halaman dan komponen dari awal.</small></Link><button className="choice-card" onClick={() => { setShowCreateChoice(false); setShowUploadModal(true) }}><span>⇧</span><strong>Upload PDF</strong><small>Impor dokumen PDF untuk dijadikan flipbook.</small></button></div><div className="confirm-actions"><button className="button quiet" onClick={() => setShowCreateChoice(false)}>Batal</button></div></section></div>}{showUploadModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowUploadModal(false) }}><form className="confirm-modal upload-modal" onSubmit={createFromPdf}><p className="eyebrow">IMPOR DOKUMEN</p><h2>Unggah PDF</h2><p>Pilih file PDF untuk membuat draf flipbook baru.</p><label className="upload-field">Judul flipbook<input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Contoh: Majalah Sekolah 2026" /></label><label className="upload-dropzone">{uploadFile ? <><strong>{uploadFile.name}</strong><small>File siap diimpor</small></> : <><strong>Pilih file PDF</strong><small>Format PDF, maksimal sesuai batas penyimpanan</small></>}<input type="file" accept="application/pdf,.pdf" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /></label><div className="confirm-actions"><button type="button" className="button quiet" onClick={() => setShowUploadModal(false)}>Batal</button><button type="submit" className="button primary" disabled={!uploadFile}>Buat Flipbook</button></div></form></div>}</div>
}

function EditorRoute() {
  const { bookId } = useParams()
  const [searchParams] = useSearchParams()
  const importedTitle = searchParams.get('title')
  const importedFile = searchParams.get('file')
  if (importedTitle) return <UploadedEditor title={importedTitle} fileName={importedFile ?? 'Dokumen PDF'} />
  if (bookId === 'book-ekosistem' && !searchParams.has('local')) return <InteractiveEditorRoute />
  if (supabase && bookId !== 'book-ekosistem' && !importedTitle && !searchParams.has('local')) return <RealEditorRoute bookId={bookId ?? ''} />
  const resource = useBook(() => mockBookRepository.getDraftBook(bookId ?? ''), [bookId])
  if (resource.status === 'loading') return <LoadingState label="Memuat draf mock…" />
  if (resource.status === 'not-found') return <ErrorState title="Draf tidak ditemukan">ID buku tidak ada di repository mock.</ErrorState>
  if (resource.status === 'error') return <ErrorState title="Editor tidak tersedia">Repository mock gagal merespons.</ErrorState>
  return <Editor book={importedTitle ? { ...resource.data, title: importedTitle } : resource.data} />
}

function InteractiveEditorRoute() {
  const blankBook: MockBook = { id: 'new-interactive-book', slug: 'flipbook-baru', title: 'Flipbook Baru', description: 'Susun flipbook interaktif dari awal.', subject: 'Umum', grade: '-', draftRevision: 0, publicationStatus: 'Draf', pages: [{ id: 'new-page-1', label: 'Sampul', kind: 'Sampul', body: 'Mulai susun halaman flipbook Anda.' }] }
  return <AdminInfoShell active="editor" eyebrow="EDITOR INTERAKTIF" title="Editor Interaktif"><Editor book={blankBook} /></AdminInfoShell>
}

function LegacyBookEditorEntry() {
  const [searchParams] = useSearchParams()
  if (!searchParams.get('title') && !searchParams.get('file')) return <Navigate replace to="/admin/editor" />
  return <EditorRoute />
}

function UploadedEditor({ title, fileName }: { title: string; fileName: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfPage, setPdfPage] = useState(1)
  const [view, setView] = useState<'editor' | 'preview'>('editor')
  const [activeSection, setActiveSection] = useState<'cover' | 'content' | 'activity'>('cover')
  useEffect(() => { const host = document.querySelector('.pdf-reader-toolbar'); if (!host || host.querySelector('.share-tools')) return; const tools = document.createElement('div'); tools.className = 'share-tools'; const back = document.createElement('button'); back.className = 'button compact'; back.textContent = '← Koleksi'; back.onclick = () => { window.location.assign('/admin/books') }; const link = window.location.href; const qr = document.createElement('img'); qr.src = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=220`; qr.alt = 'QR code flipbook'; qr.className = 'share-qr'; const show = document.createElement('button'); show.className = 'button compact'; show.textContent = 'Tampilkan QR'; show.onclick = () => { qr.classList.toggle('is-visible'); show.textContent = qr.classList.contains('is-visible') ? 'Sembunyikan QR' : 'Tampilkan QR' }; const copy = document.createElement('button'); copy.className = 'button compact'; copy.textContent = 'Salin link'; copy.onclick = async () => { await navigator.clipboard?.writeText(link); copy.textContent = 'Tersalin ✓'; setTimeout(() => { copy.textContent = 'Salin link' }, 1600) }; const full = document.createElement('button'); full.className = 'button compact'; full.textContent = '⛶ Layar penuh'; full.onclick = () => { const target = document.querySelector('.pdf-import-editor') as HTMLElement | null; if (!document.fullscreenElement) void target?.requestFullscreen?.(); else void document.exitFullscreen?.() }; tools.append(back, qr, show, copy, full); host.appendChild(tools); return () => tools.remove() }, [])
  useEffect(() => { const controls = document.querySelector('.pdf-page-controls'); if (!controls) return; const handler = (event: Event) => { const target = event.target as HTMLElement; const text = target?.textContent ?? ''; if (text.includes('Sebelumnya')) window.dispatchEvent(new Event('flipbook-prev')); if (text.includes('Berikutnya')) window.dispatchEvent(new Event('flipbook-next')); }; controls.addEventListener('click', handler); return () => controls.removeEventListener('click', handler) }, [])
  useEffect(() => { const current = uploadedPdfUrls.get(title); if (current) { setPdfUrl(current); return } try { const saved = window.localStorage.getItem(`flipbook-studio-pdf-${title}`); if (saved) { setPdfUrl(saved); return } } catch { /* lanjutkan ke IndexedDB */ } loadPdfBlob(title, setPdfUrl) }, [title])
  const sections = {
    cover: { icon: '▣', title: 'Sampul flipbook', text: 'Tetapkan judul, gambar sampul, dan keterangan edisi agar publikasi mudah dikenali.', action: 'Atur sampul' },
    content: { icon: '▤', title: 'Halaman dan materi', text: 'Susun urutan halaman, sorot bagian penting, dan tambahkan penjelasan untuk pembaca.', action: 'Kelola halaman' },
    activity: { icon: '✦', title: 'Aktivitas pembaca', text: 'Tambahkan soal refleksi, kuis singkat, atau hotspot untuk membuat flipbook lebih interaktif.', action: 'Tambah aktivitas' },
  } as const
  const current = sections[activeSection]
  useEffect(() => {
    const panel = document.querySelector('.pdf-editor-panel') as HTMLElement | null
    if (!panel) return
    const existing = panel.querySelector('.cover-designer') as HTMLElement | null
    const regularChildren = Array.from(panel.children).filter((child) => !child.classList.contains('cover-designer')) as HTMLElement[]
    if (activeSection !== 'cover') { existing?.remove(); regularChildren.forEach((child) => { child.style.display = '' }); return }
    regularChildren.forEach((child) => { child.style.display = 'none' })
    if (existing) return
    const designer = document.createElement('section')
    designer.className = 'cover-designer'
    designer.innerHTML = `<div class="cover-source-tabs" role="tablist"><button class="is-active" data-mode="pdf">▤ Dari PDF</button><button data-mode="image">▧ Unggah gambar</button><button data-mode="custom">✦ Buat sendiri</button></div><div class="cover-designer-grid"><div class="cover-controls"><div class="cover-pdf-option"><strong>Gunakan halaman pertama PDF</strong><p>Sampul diambil dari halaman pertama dokumen yang Anda impor.</p><button class="button quiet" type="button">Pilih halaman PDF</button></div><div class="cover-image-option" hidden><label>Gambar latar sampul<input class="cover-background" type="file" accept="image/*" /></label></div><div class="cover-custom-option" hidden><label>Gambar latar sampul<input class="cover-background" type="file" accept="image/*" /></label><label>Gambar tambahan<input class="cover-illustration" type="file" accept="image/*" /></label><label>Judul sampul<input class="cover-title" value="${title.replace(/"/g, '&quot;')}" /></label><div class="cover-control-row"><label>Jenis font<select class="cover-font"><option value="Caveat">Caveat</option><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="Trebuchet MS">Trebuchet</option></select></label><label>Warna font<input class="cover-color" type="color" value="#442a22" /></label></div><label>Ukuran teks <output class="cover-size-output">42px</output><input class="cover-size" type="range" min="24" max="72" value="42" /></label></div></div><div class="cover-live-preview mode-pdf"><span class="cover-preview-label">PRATINJAU SAMPUL</span><b>PDF</b><strong>${title}</strong></div></div><button class="button primary cover-continue" type="button">Simpan sampul & lanjutkan →</button>`
    panel.appendChild(designer)
    const preview = designer.querySelector('.cover-live-preview') as HTMLElement
    const pdfOption = designer.querySelector('.cover-pdf-option') as HTMLElement
    const imageOption = designer.querySelector('.cover-image-option') as HTMLElement
    const customOption = designer.querySelector('.cover-custom-option') as HTMLElement
    const changeMode = (mode: string) => { designer.querySelectorAll('[data-mode]').forEach((button) => button.classList.toggle('is-active', (button as HTMLElement).dataset.mode === mode)); pdfOption.hidden = mode !== 'pdf'; imageOption.hidden = mode !== 'image'; customOption.hidden = mode !== 'custom'; preview.className = `cover-live-preview mode-${mode}`; preview.innerHTML = mode === 'pdf' ? `<span class="cover-preview-label">PRATINJAU SAMPUL</span><b>PDF</b><strong>${title}</strong>` : `<span class="cover-preview-label">PRATINJAU SAMPUL</span><h4>${title}</h4><small>Studio Flipbook</small>` }
    designer.querySelectorAll('[data-mode]').forEach((button) => { button.addEventListener('click', () => changeMode((button as HTMLElement).dataset.mode ?? 'pdf')) })
    const updatePreview = () => { const text = (designer.querySelector('.cover-title') as HTMLInputElement | null)?.value || 'Judul Flipbook'; const font = (designer.querySelector('.cover-font') as HTMLSelectElement | null)?.value || 'Caveat'; const color = (designer.querySelector('.cover-color') as HTMLInputElement | null)?.value || '#442a22'; const size = (designer.querySelector('.cover-size') as HTMLInputElement | null)?.value || '42'; const heading = preview.querySelector('h4') as HTMLElement | null; if (heading) { heading.textContent = text; heading.style.fontFamily = font; heading.style.color = color; heading.style.fontSize = `${size}px` }; const output = designer.querySelector('.cover-size-output'); if (output) output.textContent = `${size}px` }
    designer.querySelectorAll('.cover-title, .cover-font, .cover-color, .cover-size').forEach((input) => input.addEventListener('input', updatePreview))
    designer.querySelectorAll('.cover-background').forEach((input) => input.addEventListener('change', (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) preview.style.backgroundImage = `linear-gradient(rgba(255,253,250,.16), rgba(255,253,250,.16)), url(${URL.createObjectURL(file)})` }))
    designer.querySelectorAll('.cover-illustration').forEach((input) => input.addEventListener('change', (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; const image = document.createElement('img'); image.src = URL.createObjectURL(file); image.alt = 'Gambar tambahan sampul'; preview.prepend(image) }))
    const continueButton = designer.querySelector('.cover-continue'); continueButton?.addEventListener('click', () => setActiveSection('content'))
    return () => designer.remove()
  }, [activeSection, title])
  useEffect(() => {
    if (activeSection !== 'cover') return
    const designer = document.querySelector('.cover-designer') as HTMLElement | null
    if (!designer) return
    const preview = designer.querySelector('.cover-live-preview') as HTMLElement | null
    const customOptions = designer.querySelector('.cover-custom-option') as HTMLElement | null
    if (!preview || !customOptions) return
    const rotateLabel = document.createElement('label')
    rotateLabel.className = 'cover-rotate-control'
    rotateLabel.innerHTML = 'Putar teks <output>0°</output><input type="range" min="-180" max="180" value="0" />'
    customOptions.appendChild(rotateLabel)
    const rotateInput = rotateLabel.querySelector('input') as HTMLInputElement
    rotateInput.addEventListener('input', () => { const heading = preview.querySelector('h4') as HTMLElement | null; if (heading) heading.style.rotate = `${rotateInput.value}deg`; const output = rotateLabel.querySelector('output'); if (output) output.textContent = `${rotateInput.value}°` })
    const makeDraggable = (element: HTMLElement) => {
      if (element.dataset.draggable) return
      element.dataset.draggable = 'true'; element.classList.add('cover-draggable')
      element.addEventListener('pointerdown', (event) => {
        if (!preview.classList.contains('mode-custom')) return
        event.preventDefault(); const frame = preview.getBoundingClientRect(); const box = element.getBoundingClientRect(); const shiftX = event.clientX - box.left; const shiftY = event.clientY - box.top
        element.style.left = `${box.left - frame.left}px`; element.style.top = `${box.top - frame.top}px`; element.style.transform = 'none'; element.setPointerCapture(event.pointerId)
        const move = (moveEvent: PointerEvent) => { const maxX = preview.clientWidth - element.offsetWidth; const maxY = preview.clientHeight - element.offsetHeight; element.style.left = `${Math.max(0, Math.min(maxX, moveEvent.clientX - frame.left - shiftX))}px`; element.style.top = `${Math.max(0, Math.min(maxY, moveEvent.clientY - frame.top - shiftY))}px` }
        const stop = () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', stop); element.removeEventListener('pointercancel', stop) }
        element.addEventListener('pointermove', move); element.addEventListener('pointerup', stop); element.addEventListener('pointercancel', stop)
      })
    }
    const bindPreviewItems = () => { const heading = preview.querySelector('h4') as HTMLElement | null; const image = preview.querySelector('img') as HTMLElement | null; if (heading) makeDraggable(heading); if (image) makeDraggable(image) }
    bindPreviewItems()
    const observer = new MutationObserver(bindPreviewItems); observer.observe(preview, { childList: true, subtree: true })
    designer.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => queueMicrotask(bindPreviewItems)))
    return () => { observer.disconnect(); rotateLabel.remove() }
  }, [activeSection])
  return <section className="editor pdf-import-editor"><header className="editor-bar"><div><p className="eyebrow">EDITOR FLIPBOOK · DRAF PDF</p><h1>{title}</h1></div><div className="editor-actions"><span className="save-status saved">Tersimpan di perangkat ini</span><Link className="button quiet" to="/admin/books">Kembali ke koleksi</Link></div></header>{view === 'editor' ? <main className="pdf-editor-workspace"><section className="pdf-editor-intro"><p className="workspace-badge">● Ruang Penyusunan <em>Siapkan sebelum dipratinjau</em></p><h2>Bangun pengalaman membaca yang menarik.</h2><p>Lengkapi elemen penting berikut agar flipbook siap dibagikan kepada pembaca.</p></section><section className="pdf-editor-layout"><aside className="pdf-editor-steps" aria-label="Bagian editor">{(Object.keys(sections) as Array<keyof typeof sections>).map((key, index) => <button key={key} className={activeSection === key ? 'is-active' : ''} onClick={() => setActiveSection(key)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{sections[key].title}</strong><small>{key === 'cover' ? 'Wajib dilengkapi' : 'Opsional'}</small></button>)}</aside><section className="pdf-editor-panel"><span className="editor-panel-icon">{current.icon}</span><p className="eyebrow">LANGKAH {activeSection === 'cover' ? '01' : activeSection === 'content' ? '02' : '03'}</p><h3>{current.title}</h3><p>{current.text}</p><div className="editor-checklist"><label><input type="checkbox" defaultChecked={activeSection !== 'activity'} /> Judul dan informasi utama sudah sesuai</label><label><input type="checkbox" /> Siap ditampilkan kepada pembaca</label></div><button className="button primary" onClick={() => setActiveSection(activeSection === 'cover' ? 'content' : activeSection === 'content' ? 'activity' : 'cover')}>{current.action} →</button></section><aside className="pdf-editor-preview-note"><div className="pdf-badge">PDF</div><strong>{fileName}</strong><small>Dokumen sumber tersimpan lokal dan dapat dipratinjau kapan saja.</small><button className="button quiet" onClick={() => setView('preview')}>Buka pratinjau →</button></aside></section></main> : <main className="pdf-reader-preview"><div className="pdf-reader-toolbar"><div><strong>{fileName}</strong><small>Mode flipbook · drag sudut halaman atau gunakan tombol</small></div><div className="pdf-page-controls"><button className="button compact" disabled={pdfPage <= 1} onClick={() => setPdfPage((page) => Math.max(1, page - 1))}>‹ Sebelumnya</button><span>Halaman {pdfPage}</span><button className="button compact" onClick={() => setPdfPage((page) => page + 1)}>Berikutnya ›</button></div><span className="status draft">Draf impor</span><button className="button quiet" onClick={() => setView('editor')}>← Kembali menyusun</button></div>{pdfUrl ? <PdfFlipbook url={pdfUrl} title={title} /> : <div className="uploaded-preview-card"><div className="pdf-badge">PDF</div><h2>Pratinjau belum tersedia</h2><p>File PDF tidak ditemukan di penyimpanan lokal browser ini.</p></div>}</main>}</section>
}

function CoverDesigner({ title, onContinue }: { title: string; onContinue: () => void }) {
  const [mode, setMode] = useState<'pdf' | 'image' | 'custom'>('pdf')
  const [background, setBackground] = useState<string | null>(null)
  const [illustration, setIllustration] = useState<string | null>(null)
  const [coverTitle, setCoverTitle] = useState(title)
  const [font, setFont] = useState('Caveat')
  const [fontSize, setFontSize] = useState(42)
  const [fontColor, setFontColor] = useState('#442a22')
  const readImage = (event: ChangeEvent<HTMLInputElement>, setImage: (value: string | null) => void) => {
    const file = event.target.files?.[0]
    if (file) setImage(URL.createObjectURL(file))
  }
  const previewStyle = mode === 'custom' && background ? { backgroundImage: `linear-gradient(rgba(255,253,250,.16), rgba(255,253,250,.16)), url(${background})` } : mode === 'image' && background ? { backgroundImage: `url(${background})` } : undefined
  return <section className="cover-designer"><div className="cover-source-tabs" role="tablist"><button className={mode === 'pdf' ? 'is-active' : ''} onClick={() => setMode('pdf')}>▤ Dari PDF</button><button className={mode === 'image' ? 'is-active' : ''} onClick={() => setMode('image')}>▧ Unggah gambar</button><button className={mode === 'custom' ? 'is-active' : ''} onClick={() => setMode('custom')}>✦ Buat sendiri</button></div><div className="cover-designer-grid"><div className="cover-controls">{mode === 'pdf' ? <><strong>Gunakan halaman pertama PDF</strong><p>Sampul diambil dari halaman pertama dokumen yang Anda impor.</p><button className="button quiet" type="button">Pilih halaman PDF</button></> : <><label>Gambar latar sampul<input type="file" accept="image/*" onChange={(event) => readImage(event, setBackground)} /></label>{mode === 'custom' && <><label>Gambar tambahan<input type="file" accept="image/*" onChange={(event) => readImage(event, setIllustration)} /></label><label>Judul sampul<input value={coverTitle} onChange={(event) => setCoverTitle(event.target.value)} /></label><div className="cover-control-row"><label>Jenis font<select value={font} onChange={(event) => setFont(event.target.value)}><option value="Caveat">Caveat</option><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="Trebuchet MS">Trebuchet</option></select></label><label>Warna font<input type="color" value={fontColor} onChange={(event) => setFontColor(event.target.value)} /></label></div><label>Ukuran teks <output>{fontSize}px</output><input type="range" min="24" max="72" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label></>}</>}</div><div className={`cover-live-preview mode-${mode}`} style={previewStyle}><span className="cover-preview-label">PRATINJAU SAMPUL</span>{mode === 'pdf' ? <><b>PDF</b><strong>{title}</strong></> : <>{illustration && <img src={illustration} alt="Gambar tambahan sampul" />}<h4 style={{ fontFamily: font, fontSize, color: fontColor }}>{coverTitle || 'Judul Flipbook'}</h4><small>Studio Flipbook</small></>}</div></div><button className="button primary" type="button" onClick={onContinue}>Simpan sampul & lanjutkan →</button></section>
}

function PdfFlipbook({ url, title }: { url: string; title: string }) {
  const flipRef = useRef<any>(null)
  useEffect(() => { const next = () => flipRef.current?.pageFlip?.().flipNext(); const prev = () => flipRef.current?.pageFlip?.().flipPrev(); window.addEventListener('flipbook-next', next); window.addEventListener('flipbook-prev', prev); return () => { window.removeEventListener('flipbook-next', next); window.removeEventListener('flipbook-prev', prev) } }, [])
  const [pages, setPages] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [renderError, setRenderError] = useState(false)
  useEffect(() => { let cancelled = false; setProgress(0); setRenderError(false); void fetch(url).then((response) => response.arrayBuffer()).then((data) => pdfjsLib.getDocument({ data }).promise).then(async (pdf) => { const rendered: string[] = []; for (let i = 1; i <= pdf.numPages; i += 1) { const page = await pdf.getPage(i); const viewport = page.getViewport({ scale: 1.15 }); const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height; await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise; rendered.push(canvas.toDataURL('image/jpeg', .88)); if (!cancelled) setProgress(Math.round((i / pdf.numPages) * 100)) } if (!cancelled) setPages(rendered) }).catch(() => { if (!cancelled) setRenderError(true) }); return () => { cancelled = true } }, [url])
  if (renderError) return <div className="uploaded-preview-card"><div className="pdf-badge">PDF</div><h2>PDF tidak dapat dirender</h2><p>Silakan unggah ulang file atau gunakan viewer PDF bawaan browser.</p></div>
  if (!pages.length) return <div className="uploaded-preview-card"><div className="pdf-badge">PDF</div><h2>Menyiapkan flipbook…</h2><p>Merender halaman {progress}%</p><div className="render-progress"><span style={{ width: `${progress}%` }} /></div><small className="render-progress-label">{progress}% selesai</small></div>
  return <div className="flipbook-stage"><HTMLFlipBook ref={flipRef} width={420} height={560} size="stretch" minWidth={280} maxWidth={620} minHeight={380} maxHeight={760} showCover drawShadow flippingTime={900} usePortrait={false} className="flipbook" startPage={0} autoSize>{pages.map((page, index) => <div className="flip-page" key={`${title}-${index}`}><img src={page} alt={`${title} halaman ${index + 1}`} /></div>)}</HTMLFlipBook></div>
}

function RealEditorRoute({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<FoundationBook | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!supabase || !bookId) return
    void supabase.from('books').select('id, title, draft_status, current_revision, updated_at').eq('id', bookId).eq('draft_status', 'draft').maybeSingle()
      .then(({ data, error: queryError }) => { if (queryError) setError('Draf tidak dapat dimuat melalui policy aktif.'); else if (!data) setError('Draf tidak ditemukan atau sudah diarsipkan.'); else setBook(data as FoundationBook) })
  }, [bookId])
  if (error) return <ErrorState title="Editor tidak tersedia">{error}</ErrorState>
  if (!book) return <LoadingState label="Memuat draf dari Supabase dev…" />
  return <RealEditor book={book} onSaved={setBook} />
}

function RealEditor({ book, onSaved }: { book: FoundationBook; onSaved: (book: FoundationBook) => void }) {
  const [title, setTitle] = useState(book.title)
  const [status, setStatus] = useState('Tersimpan')
  const [busy, setBusy] = useState(false)
  const [pages, setPages] = useState<Array<{ id: string; position: number; content: Record<string, unknown> }>>([])
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [pageTitle, setPageTitle] = useState('Halaman baru')
  useEffect(() => {
    if (!supabase) return
    void supabase.functions.invoke('mutate-book-draft', { body: { operation: 'list_structure', bookId: book.id } }).then(({ data }) => {
      const rows = Array.isArray(data?.structure) ? data.structure : []
      const next = rows.filter((row: any) => row.node_kind === 'page').map((row: any) => ({ id: row.node_id, position: row.position, content: row.content ?? {} }))
      setPages(next); if (next[0]) { setSelectedPage(next[0].id); setPageTitle(String(next[0].content.title ?? 'Halaman baru')) }
    })
  }, [book.id])
  const save = async () => {
    if (!supabase || !title.trim()) return
    setBusy(true); setStatus('Menyimpan…')
    const { data, error } = await supabase.functions.invoke('mutate-book-draft', { body: { operation: 'update_metadata', bookId: book.id, expectedRevision: book.current_revision, title: title.trim(), draftMetadata: { source: 'admin-editor', savedAt: new Date().toISOString() } } })
    if (error) { setStatus('Gagal: revisi mungkin berubah, muat ulang lalu coba lagi.'); setBusy(false); return }
    const revision = typeof data?.revision === 'number' ? data.revision : book.current_revision + 1
    onSaved({ ...book, title: title.trim(), current_revision: revision, updated_at: new Date().toISOString() }); setStatus(`Tersimpan · revisi ${revision}`); setBusy(false)
  }
  const savePage = async () => {
    if (!supabase) return
    const pageId = selectedPage ?? crypto.randomUUID()
    setBusy(true); setStatus('Menyimpan halaman…')
    const { data, error } = await supabase.functions.invoke('mutate-book-draft', { body: { operation: 'upsert_page', bookId: book.id, pageId, expectedRevision: book.current_revision, position: selectedPage ? (pages.find((p) => p.id === pageId)?.position ?? pages.length) : pages.length, content: { title: pageTitle.trim() || 'Halaman baru' } } })
    if (error) { setStatus('Gagal menyimpan halaman: revisi berubah atau akses ditolak.'); setBusy(false); return }
    const revision = typeof data?.revision === 'number' ? data.revision : book.current_revision + 1
    const next = { id: pageId, position: selectedPage ? (pages.find((p) => p.id === pageId)?.position ?? pages.length) : pages.length, content: { title: pageTitle.trim() || 'Halaman baru' } }
    setPages((current) => current.some((p) => p.id === pageId) ? current.map((p) => p.id === pageId ? next : p) : [...current, next]); setSelectedPage(pageId)
    onSaved({ ...book, current_revision: revision, updated_at: new Date().toISOString() }); setStatus(`Halaman tersimpan · revisi ${revision}`); setBusy(false)
  }
  const addPage = () => { setSelectedPage(null); setPageTitle('Halaman baru'); setStatus('Halaman baru belum disimpan') }
  return <section className="editor"><header className="editor-bar"><div><p className="eyebrow">EDITOR · DRAF SUPABASE DEV</p><h1>{book.title}</h1></div><div className="editor-actions"><span className="save-status saved">{status}</span><Link className="button quiet" to="/admin">Kembali</Link><button className="button primary" disabled={busy || title.trim() === book.title} onClick={() => void save()}>{busy ? 'Menyimpan…' : 'Simpan metadata'}</button></div></header><div className="editor-grid"><aside className="editor-left"><div className="tabs"><button className="is-active">Halaman</button></div><div className="page-list">{pages.map((page, index) => <button key={page.id} className={selectedPage === page.id ? 'is-selected' : ''} onClick={() => { setSelectedPage(page.id); setPageTitle(String(page.content.title ?? 'Halaman baru')) }}><span>{String(index + 1).padStart(2, '0')}</span><span>{String(page.content.title ?? 'Halaman')}</span></button>)}<button className="add-row" onClick={addPage}>+ Tambah halaman</button><p className="helper">Halaman dan metadata disimpan melalui endpoint server dengan CAS.</p></div></aside><section className="canvas-wrap"><div className="canvas-header"><span>{selectedPage ? 'Halaman tersimpan' : 'Halaman baru'}</span></div><article className="canvas"><p className="eyebrow">BUKU DRAF</p><h2>{pageTitle || 'Halaman baru'}</h2><p>Struktur draft nyata tersimpan di Supabase dev.</p></article></section><aside className="inspector"><h2>Properti</h2><label>Judul buku<input value={title} onChange={(event) => { setTitle(event.target.value); setStatus('Perubahan belum disimpan') }} /></label><label>Judul halaman<input value={pageTitle} onChange={(event) => { setPageTitle(event.target.value); setStatus('Perubahan belum disimpan') }} /></label><button className="button primary" disabled={busy} onClick={() => void savePage()}>{busy ? 'Menyimpan…' : 'Simpan halaman'}</button><p className="helper">Revisi saat ini: {book.current_revision}. Konflik stale ditolak server.</p></aside></div></section>
}

function Editor({ book }: { book: MockBook }) {
  const [pages, setPages] = useState(book.pages); const [selectedIndex, setSelectedIndex] = useState(0); const [saved, setSaved] = useState(true); const [tab, setTab] = useState<'halaman' | 'komponen'>('halaman'); const [title, setTitle] = useState(book.pages[0]?.label ?? 'Halaman baru'); const [component, setComponent] = useState(''); const selected = pages[selectedIndex]
  useEffect(() => { const button = document.querySelector('.editor .add-row'); if (!button) return; const add = () => { const next = { id: `page-${Date.now()}`, label: `Halaman ${pages.length + 1}`, kind: 'Halaman' as const, body: 'Tulis isi halaman baru Anda.' }; setPages((current) => [...current, next]); setSelectedIndex(pages.length); setTitle(next.label); setSaved(false) }; button.addEventListener('click', add); return () => button.removeEventListener('click', add) }, [pages.length])
  if (!selected) return <ErrorState title="Draf kosong">Tambahkan halaman untuk mulai menyusun flipbook.</ErrorState>
  return <section className="editor"><header className="editor-bar"><div><p className="eyebrow">EDITOR · DRAF LOKAL</p><h1>{book.title}</h1></div><div className="editor-actions"><span className={saved ? 'save-status saved' : 'save-status unsaved'}>{saved ? 'Tersimpan lokal' : 'Perubahan belum disimpan'}</span><button className="button primary" onClick={() => setSaved(true)}>Simpan mock</button></div></header><div className="editor-grid"><aside className="editor-left"><div className="tabs"><button className={tab === 'halaman' ? 'is-active' : ''} onClick={() => setTab('halaman')}>Halaman</button><button className={tab === 'komponen' ? 'is-active' : ''} onClick={() => setTab('komponen')}>Komponen</button></div>{tab === 'halaman' ? <div className="page-list">{book.pages.map((item, index) => <button className={selectedIndex === index ? 'is-selected' : ''} key={item.id} onClick={() => { setSelectedIndex(index); setTitle(item.label) }}><span>{String(index + 1).padStart(2, '0')}</span><span>{item.label}<small>{item.kind}</small></span></button>)}<button className="add-row">+ Tambah halaman</button></div> : <div className="component-list"><button>Judul</button><button>Paragraf</button><button>Gambar</button><button>Tombol</button><button>Aktivitas</button><p>Drag bukan satu-satunya cara: pilih komponen lalu tambahkan ke canvas.</p></div>}</aside><section className="canvas-wrap"><div className="canvas-header"><span>Halaman {String(selectedIndex + 1).padStart(2, '0')} · {selected.label}</span></div><article className="canvas"><p className="eyebrow">BAGIAN 01</p><h2>{title}</h2><p>{selected.body}</p></article></section><aside className="inspector"><h2>Properti</h2><label>Judul blok<input value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false) }} /></label><label>Variasi<select defaultValue="Standar" onChange={() => setSaved(false)}><option>Standar</option><option>Highlight</option></select></label><p className="helper">Autosave CAS, validasi publish, dan persistensi draf memerlukan backend nonproduksi.</p></aside></div></section>
}
