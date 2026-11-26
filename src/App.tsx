// @ts-nocheck
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { EmptyState, ErrorState, LoadingState } from "./components/AsyncState";
import "./lkpd-import-modal.css";
import "./public-lkpd.css";
import { mockBooks, type MockBook } from "./data/mockContent";
import {
  clearReaderProgress,
  getReaderProgress,
  saveReaderProgress,
  submitMockAnswer,
  type MockSubmitResult,
} from "./mockApi";
import {
  mockBookRepository,
  RepositoryNotFoundError,
} from "./services/bookRepository";
import { setSessionPersistence, supabase, supabaseConfigurationStatus } from "./lib/supabase";
import HTMLFlipBook from "react-pageflip";
import QRCode from "qrcode";
import QrScanner from "qr-scanner";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  AlignLeft,
  AlignCenter,
  AlignJustify,
  AlignRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
  Music2,
  QrCode,
  Settings,
  Sparkles,
  Type,
  Video,
} from "lucide-react";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type Resource<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "not-found" }
  | { status: "error" };
const uploadedPdfUrls = new Map<string, string>();
const coverPdfBytes = new Map<string, ArrayBuffer>();
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_PDF_PAGES = 200;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}
function safeLocalStorageGet(key: string, fallback = "") {
  try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function safeLocalStorageSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}

function isSupportedPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function validatePdfFile(file: File) {
  if (!isSupportedPdf(file)) return "Pilih berkas PDF yang valid.";
  if (file.size > MAX_PDF_BYTES) return "Ukuran PDF maksimal 25 MB.";
  return null;
}

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const id = url.hostname.includes("youtu.be") ? url.pathname.slice(1) : url.searchParams.get("v") ?? (url.pathname.match(/\/embed\/([^/?]+)/)?.[1] ?? "");
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : "";
  } catch { return ""; }
}

function LocalQrCode({ value, alt, size = 280 }: { value: string; alt: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then((dataUrl) => { if (active) setSrc(dataUrl); })
      .catch(() => { if (active) setSrc(""); });
    return () => { active = false; };
  }, [size, value]);
  return src ? <img src={src} alt={alt} /> : <span role="status">Membuat QR Code…</span>;
}
function savePdfBlob(key: string, file: File) {
  const request = indexedDB.open("flipbook-studio-files", 2);
  request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("pdfs")) request.result.createObjectStore("pdfs"); if (!request.result.objectStoreNames.contains("documents")) request.result.createObjectStore("documents"); };
  request.onsuccess = () => {
    const tx = request.result.transaction("pdfs", "readwrite");
    tx.objectStore("pdfs").put(file, key);
  };
}
function loadPdfBlob(key: string, onLoad: (url: string) => void) {
  const request = indexedDB.open("flipbook-studio-files", 2);
  request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("pdfs")) request.result.createObjectStore("pdfs"); if (!request.result.objectStoreNames.contains("documents")) request.result.createObjectStore("documents"); };
  request.onsuccess = () => {
    const tx = request.result.transaction("pdfs", "readonly");
    const get = tx.objectStore("pdfs").get(key);
    get.onsuccess = () => {
      if (get.result instanceof Blob) onLoad(URL.createObjectURL(get.result));
    };
  };
}
function deletePdfBlob(key: string) {
  const request = indexedDB.open("flipbook-studio-files", 2);
  request.onsuccess = () => {
    const tx = request.result.transaction("pdfs", "readwrite");
    tx.objectStore("pdfs").delete(key);
  };
}
function saveEditorDocument(key: string, documentState: unknown) {
  const request = indexedDB.open("flipbook-studio-files", 2);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains("pdfs")) request.result.createObjectStore("pdfs");
    if (!request.result.objectStoreNames.contains("documents")) request.result.createObjectStore("documents");
  };
  request.onsuccess = () => request.result.transaction("documents", "readwrite").objectStore("documents").put(documentState, key);
}
function loadEditorDocument(key: string, onLoad: (documentState: any) => void) {
  const request = indexedDB.open("flipbook-studio-files", 2);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains("pdfs")) request.result.createObjectStore("pdfs");
    if (!request.result.objectStoreNames.contains("documents")) request.result.createObjectStore("documents");
  };
  request.onsuccess = () => {
    const get = request.result.transaction("documents", "readonly").objectStore("documents").get(key);
    get.onsuccess = () => { if (get.result && typeof get.result === "object") onLoad(get.result); };
  };
}
function readEditorDocument(key: string) {
  return new Promise<any>((resolve) => {
    const request = indexedDB.open("flipbook-studio-files", 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("pdfs")) request.result.createObjectStore("pdfs");
      if (!request.result.objectStoreNames.contains("documents")) request.result.createObjectStore("documents");
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const get = request.result.transaction("documents", "readonly").objectStore("documents").get(key);
      get.onsuccess = () => resolve(get.result ?? null);
      get.onerror = () => resolve(null);
    };
  });
}

function bookSlug(title: string) {
  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "flipbook"
  );
}

function downloadExcelTemplate(fileName: string, headers: string[], rows: Array<Array<string | number>>) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map((header) => ({ wch: Math.max(header.length + 4, 18) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Soal LKPD");
  XLSX.writeFileXLSX(workbook, `${bookSlug(fileName)}.xlsx`);
}

function saveBookRouteMetadata(title: string, fileName?: string) {
  try {
    window.localStorage.setItem(
      `flipbook-studio-book-route-${bookSlug(title)}`,
      JSON.stringify({ title, fileName }),
    );
  } catch {
    /* metadata hanya pelengkap URL lokal */
  }
}

// Rute editor lama tidak lagi tersedia; metadata ini hanya menjaga draf lama tetap terbaca.
function bookEditorHref(title: string, fileName?: string) {
  saveBookRouteMetadata(title, fileName);
  return "/admin/collection";
}

function getBookRouteMetadata(slug?: string) {
  if (!slug) return null;
  try {
    const value = window.localStorage.getItem(
      `flipbook-studio-book-route-${slug}`,
    );
    return value
      ? (JSON.parse(value) as { title?: string; fileName?: string })
      : null;
  } catch {
    return null;
  }
}

function coverStorageKey(title: string) {
  return `flipbook-studio-cover-${bookSlug(title)}`;
}
function getSavedCover(title: string) {
  try {
    return window.localStorage.getItem(coverStorageKey(title)) || "";
  } catch {
    return "";
  }
}
function saveCover(title: string, image: string) {
  try {
    window.localStorage.setItem(coverStorageKey(title), image);
  } catch {
    /* thumbnail tetap aktif selama halaman editor terbuka */
  }
}
function coverPlacementStorageKey(title: string) {
  return `flipbook-studio-cover-placement-${bookSlug(title)}`;
}
function getCoverPlacement(title: string) {
  try {
    return window.localStorage.getItem(coverPlacementStorageKey(title)) ===
      "replace"
      ? "replace"
      : "insert";
  } catch {
    return "insert";
  }
}
function saveCoverPlacement(title: string, placement: string) {
  try {
    window.localStorage.setItem(coverPlacementStorageKey(title), placement);
  } catch {
    /* hanya preferensi pratinjau lokal */
  }
}

export default function App() {
  const auth = useAuthSession();
  useEffect(() => {
    const installLogout = () => {
      document.querySelectorAll(".admin-nav").forEach((nav) => {
        if (!nav.querySelector(".admin-menu-toggle")) {
          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "admin-menu-toggle";
          toggle.setAttribute("aria-label", "Buka menu navigasi");
          toggle.setAttribute("aria-expanded", "false");
          toggle.innerHTML = "<span></span><span></span><span></span>";
          toggle.onclick = () => {
            const open = nav.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute(
              "aria-label",
              open ? "Tutup menu navigasi" : "Buka menu navigasi",
            );
          };
          nav.prepend(toggle);
        }
        if (nav.querySelector(".sidebar-logout")) return;
        const button = document.createElement("button");
        button.className = "sidebar-logout";
        button.textContent = "↪  Keluar";
        button.onclick = async () => {
          if (supabase) await supabase.auth.signOut();
          window.history.replaceState(null, "", "/admin/login");
          window.dispatchEvent(new PopStateEvent("popstate"));
        };
        nav.appendChild(button);
      });
    };
    installLogout();
    const observer = new MutationObserver(installLogout);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (window.location.pathname === "/") {
      window.location.href = auth.session ? "/admin" : "/admin/login";
    }
  }, [auth.loading, auth.session]);
  if (window.location.pathname === "/") {
    window.location.href = auth.session ? "/admin" : "/admin/login";
    return <LoadingState label="Mengarahkan ke halaman masuk admin..." />;
  }
  return (
    <BrowserRouter>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Lewati ke konten utama
        </a>
        <main id="main-content">
          <Routes>
            <Route path="/" element={<Navigate replace to="/admin/login" />} />
            <Route path="/admin/login" element={<LoginRoute auth={auth} />} />
            {/* URL khusus pembaca siswa. Rute /read dipertahankan agar QR yang
                sudah terlanjur dibagikan tetap dapat digunakan. */}
            <Route path="/siswa/flipbook/:slug" element={<PublicReaderRoute />} />
            <Route path="/read/:slug" element={<PublicReaderRoute />} />
            <Route path="/lkpd/:slug" element={<PublicStandaloneLkpdRoute />} />
            <Route
              path="/admin"
              element={
                <RequireSession auth={auth}>
                  <DashboardRoute />
                </RequireSession>
              }
            />
            <Route
              path="/admin/books"
              element={<Navigate replace to="/admin" />}
            />
            <Route
              path="/admin/collection"
              element={
                <RequireSession auth={auth}>
                  <CollectionRoute />
                </RequireSession>
              }
            />
            <Route
              path="/admin/preview/:title"
              element={<RequireSession auth={auth}><PdfPreviewRoute /></RequireSession>}
            />
            <Route
              path="/admin/activity"
              element={
                <RequireSession auth={auth}>
                  <ActivityRoute />
                </RequireSession>
              }
            />
            <Route
              path="/admin/activity/:moduleTitle/attempt/:attemptId"
              element={
                <RequireSession auth={auth}>
                  <ActivityGradingRoute />
                </RequireSession>
              }
            />
            <Route
              path="/admin/activity/:moduleTitle"
              element={
                <RequireSession auth={auth}>
                  <ActivityDetailRoute />
                </RequireSession>
              }
            />
            <Route
              path="/admin/qr-code"
              element={
                <RequireSession auth={auth}>
                  <QrCodeRoute />
                </RequireSession>
              }
            />
            <Route path="/admin/qr-code/lkpd/:moduleTitle" element={<RequireSession auth={auth}><QrLkpdEditorRoute /></RequireSession>} />
            <Route
              path="/admin/settings"
              element={
                <RequireSession auth={auth}>
                  <SettingsRoute />
                </RequireSession>
              }
            />
            <Route
              path="/admin/about"
              element={
                <RequireSession auth={auth}>
                  <AboutRoute />
                </RequireSession>
              }
            />
            <Route
              path="*"
              element={
                <ErrorState title="Halaman tidak ditemukan">
                  Alamat ini tidak terdaftar pada prototipe.
                </ErrorState>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

type AuthState = { loading: boolean; session: Session | null };

function PublicReaderRoute() {
  const { slug = "" } = useParams();
  type ReaderBlock = { id?: string; type?: string; content?: string; url?: string; label?: string; title?: string; alt?: string };
  type ReaderPage = { id: string; label?: string; body?: string };
  type ReaderSnapshot = { pages?: ReaderPage[]; blocks?: Record<string, ReaderBlock[]>; canvasHeader?: string };
  const [book, setBook] = useState<{ title: string; snapshot: ReaderSnapshot } | null>(null);
  const [activity, setActivity] = useState<any>(null);
  const [identity, setIdentity] = useState({ full_name: "", class_name: "", school_name: "" });
  const [studentSession, setStudentSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activityNotice, setActivityNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"loading" | "missing" | "error">("loading");
  useEffect(() => {
    if (!supabase || !slug) { setStatus("missing"); return; }
    void supabase.from("published_flipbooks").select("title, snapshot").eq("slug", slug).maybeSingle().then(({ data, error }) => {
      if (error) setStatus("error");
      else if (!data) setStatus("missing");
      else { setBook(data as typeof book); void supabase.functions.invoke("get-public-activity", { body: { slug } }).then(({ data: response }) => setActivity(response?.activity ?? null)); }
    });
  }, [slug]);
  const startStudent = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !activity) return; setSubmitting(true); setActivityNotice(""); const { data, error } = await supabase.functions.invoke("start-activity-session", { body: { activity_version_id: activity.id, ...identity } }); setSubmitting(false); if (error || !data?.session_token) { setActivityNotice("Identitas belum dapat disimpan. Periksa kembali data Anda."); return; } setStudentSession(data); };
  const saveDraft = async (nextAnswers: Record<string, string>) => { if (!supabase || !studentSession) return; await supabase.functions.invoke("save-activity-draft", { headers: { "x-activity-session": studentSession.session_token }, body: { attempt_id: studentSession.attempt_id, payload: nextAnswers } }); };
  const submitAnswers = async () => { if (!supabase || !studentSession || !activity) return; if (activity.questions.some((question: any) => !answers[question.id]?.trim())) { setActivityNotice("Jawab semua soal sebelum mengirim."); return; } setSubmitting(true); const { error } = await supabase.functions.invoke("submit-activity", { headers: { "x-activity-session": studentSession.session_token }, body: { attempt_id: studentSession.attempt_id, activity_id: activity.id, answers } }); setSubmitting(false); setActivityNotice(error ? "Jawaban belum dapat dikirim. Coba lagi." : "Jawaban berhasil dikirim. Anda tidak dapat mengubah jawaban lagi."); if (!error) setStudentSession(null); };
  const renderBlock = (block: ReaderBlock, index: number) => {
    const key = block.id ?? `${block.type ?? "block"}-${index}`;
    const text = block.content ?? block.label ?? block.title ?? "";
    if ((block.type === "Gambar" || block.type === "image") && block.url) return <figure key={key}><img src={block.url} alt={(block.alt ?? text) || "Gambar e-modul"} loading="lazy" />{text && <figcaption>{text}</figcaption>}</figure>;
    if ((block.type === "Audio" || block.type === "audio") && block.url) return <section key={key}><p>{text}</p><audio controls src={block.url}>Browser Anda tidak mendukung audio.</audio></section>;
    if ((block.type === "Video" || block.type === "video") && block.url) return <section key={key}><p>{text}</p><a className="button secondary" href={block.url} target="_blank" rel="noreferrer">Buka video</a></section>;
    if (block.type === "Judul" || block.type === "heading") return <h2 key={key}>{text}</h2>;
    return text ? <p key={key}>{text}</p> : null;
  };
  if (book && (!activity || studentSession || activityNotice.includes("berhasil"))) return <StudentFlipbookReader title={book.title} />;
  if (book) return <main className="public-reader"><header><img src="/flipbook-studio-logo.png?v=2" alt="E-Modul Flipbook" /><strong>{book.title}</strong></header>{activity && !studentSession && !activityNotice.includes("berhasil") ? <section className="panel public-identity"><h1>Sebelum membuka e-modul</h1><p>Isi identitas untuk mengerjakan LKPD. Hasil hanya dilihat pengajar.</p><form onSubmit={startStudent}><label>Nama lengkap<input required minLength={2} value={identity.full_name} onChange={(event) => setIdentity({ ...identity, full_name: event.target.value })} /></label><label>Kelas<input required value={identity.class_name} onChange={(event) => setIdentity({ ...identity, class_name: event.target.value })} /></label><label>Nama sekolah<input required minLength={2} value={identity.school_name} onChange={(event) => setIdentity({ ...identity, school_name: event.target.value })} /></label><button className="button primary" disabled={submitting}>{submitting ? "Memulai…" : "Buka e-modul dan LKPD"}</button>{activityNotice && <p role="status">{activityNotice}</p>}</form></section> : <><article>{(book.snapshot.pages ?? []).map((page) => <section key={page.id}><h1>{page.label}</h1><p>{page.body}</p></section>)}</article>{activity && studentSession && <section className="panel public-activity"><h2>LKPD</h2>{activity.questions.map((question: any, index: number) => <fieldset key={question.id}><legend>{index + 1}. {question.prompt}</legend>{question.question_type === "multiple_choice" ? question.options.map((option: string) => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => { const next = { ...answers, [question.id]: option }; setAnswers(next); void saveDraft(next); }} /> {option}</label>) : <textarea value={answers[question.id] ?? ""} onChange={(event) => { const next = { ...answers, [question.id]: event.target.value }; setAnswers(next); }} onBlur={() => void saveDraft(answers)} />}</fieldset>)}<button className="button primary" disabled={submitting} onClick={() => void submitAnswers()}>{submitting ? "Mengirim…" : "Kirim jawaban"}</button>{activityNotice && <p role="status">{activityNotice}</p>}</section>}</>}</main>;
  return <main className="public-reader"><ErrorState title={status === "error" ? "E-modul tidak dapat dimuat" : "E-modul tidak tersedia"}>{status === "loading" ? "Memuat e-modul…" : "Tautan ini tidak lagi tersedia atau belum dipublikasikan."}</ErrorState></main>;
}

function StudentFlipbookReader({ title }: { title: string }) {
  const [pdfUrl, setPdfUrl] = useState("");
  const [missing, setMissing] = useState(false);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(150);

  useEffect(() => {
    const cached = uploadedPdfUrls.get(title);
    if (cached) { setPdfUrl(cached); return; }
    try {
      const saved = window.localStorage.getItem(`flipbook-studio-pdf-${title}`);
      if (saved) { setPdfUrl(saved); return; }
    } catch { /* lanjutkan ke IndexedDB */ }
    let active = true;
    loadPdfBlob(title, (url) => { if (active) setPdfUrl(url); });
    const timeout = window.setTimeout(() => { if (active) setMissing(true); }, 900);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [title]);

  if (missing && !pdfUrl) return <main className="standalone-flipbook-reader"><ErrorState title="Flipbook tidak tersedia">E-modul belum dapat dimuat pada perangkat ini.</ErrorState></main>;
  return <main className="standalone-flipbook-reader" aria-label="Flipbook siswa">
    <header><strong>{title}</strong></header>
    <section className="standalone-flipbook-stage">{pdfUrl ? <PdfFlipbook url={pdfUrl} title={title} magnifierEnabled={magnifierEnabled} zoomPercent={zoomPercent} /> : <LoadingState label="Memuat flipbook…" />}</section>
    <footer className="preview-footer-controls"><button type="button" className={`button quiet ${magnifierEnabled ? "is-active" : ""}`} onClick={() => setMagnifierEnabled((enabled) => !enabled)}>{magnifierEnabled ? "Kaca pembesar aktif" : "Aktifkan kaca pembesar"}</button>{magnifierEnabled && <label>Zoom <select value={zoomPercent} onChange={(event) => setZoomPercent(Number(event.target.value))}><option value={125}>125%</option><option value={150}>150%</option><option value={175}>175%</option><option value={200}>200%</option></select></label>}</footer>
  </main>;
}

function LegacyPublicStandaloneLkpdRoute() {
  const { slug = "" } = useParams();
  const [activity, setActivity] = useState<any>(null);
  const [identity, setIdentity] = useState({ full_name: "", class_name: "", school_name: "" });
  const [studentSession, setStudentSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (!supabase || !slug) { setLoading(false); return; } void supabase.functions.invoke("get-public-activity", { body: { slug } }).then(({ data }) => { setActivity(data?.activity ?? null); setLoading(false); }); }, [slug]);
  const start = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !activity) return; setSubmitting(true); const { data, error } = await supabase.functions.invoke("start-activity-session", { body: { activity_version_id: activity.id, ...identity } }); setSubmitting(false); if (error || !data?.session_token) { setNotice("Identitas belum dapat disimpan. Coba lagi."); return; } setStudentSession(data); };
  const saveDraft = async (nextAnswers: Record<string, string>) => { if (supabase && studentSession) await supabase.functions.invoke("save-activity-draft", { headers: { "x-activity-session": studentSession.session_token }, body: { attempt_id: studentSession.attempt_id, payload: nextAnswers } }); };
  const submit = async () => { if (!supabase || !studentSession || !activity) return; if (activity.questions.some((question: any) => !answers[question.id]?.trim())) { setNotice("Jawab semua soal sebelum mengirim."); return; } setSubmitting(true); const { error } = await supabase.functions.invoke("submit-activity", { headers: { "x-activity-session": studentSession.session_token }, body: { attempt_id: studentSession.attempt_id, activity_id: activity.id, answers } }); setSubmitting(false); setNotice(error ? "Jawaban belum dapat dikirim. Coba lagi." : "Jawaban berhasil dikirim."); if (!error) setStudentSession(null); };
  if (loading) return <main className="public-reader"><LoadingState label="Memuat LKPD…" /></main>;
  if (!activity) return <main className="public-reader"><ErrorState title="LKPD belum tersedia">Tautan ini belum dipublikasikan atau tidak lagi tersedia.</ErrorState></main>;
  return <main className="public-reader"><header><img src="/flipbook-studio-logo.png?v=2" alt="E-Modul Flipbook" /><strong>{activity.title}</strong></header>{!studentSession && !notice.includes("berhasil") ? <section className="panel public-identity"><h1>{activity.title}</h1><p>Isi identitas untuk mulai mengerjakan LKPD.</p><form onSubmit={start}><label>Nama lengkap<input required minLength={2} value={identity.full_name} onChange={(event) => setIdentity({ ...identity, full_name: event.target.value })} /></label><label>Kelas<input required value={identity.class_name} onChange={(event) => setIdentity({ ...identity, class_name: event.target.value })} /></label><label>Nama sekolah<input required minLength={2} value={identity.school_name} onChange={(event) => setIdentity({ ...identity, school_name: event.target.value })} /></label><button className="button primary" disabled={submitting}>{submitting ? "Memulai…" : "Mulai LKPD"}</button>{notice && <p role="status">{notice}</p>}</form></section> : <section className="panel public-activity"><h1>{activity.title}</h1>{activity.questions.map((question: any, index: number) => <fieldset key={question.id}><legend>{index + 1}. {question.prompt}</legend>{question.question_type === "multiple_choice" ? question.options.map((option: string) => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => { const next = { ...answers, [question.id]: option }; setAnswers(next); void saveDraft(next); }} /> {option}</label>) : <textarea value={answers[question.id] ?? ""} onChange={(event) => { const next = { ...answers, [question.id]: event.target.value }; setAnswers(next); }} onBlur={() => void saveDraft(answers)} />}</fieldset>)}<button className="button primary" disabled={submitting || notice.includes("berhasil")} onClick={() => void submit()}>{submitting ? "Mengirim…" : "Kirim jawaban"}</button>{notice && <p role="status">{notice}</p>}</section>}</main>;
}

function PublicStandaloneLkpdRoute() {
  const { slug = "" } = useParams();
  const [activity, setActivity] = useState<any>(null);
  const [identity, setIdentity] = useState({ full_name: "", class_name: "", school_name: "" });
  const [studentSession, setStudentSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activityIndex, setActivityIndex] = useState(0);

  useEffect(() => {
    if (!supabase || !slug) { setLoading(false); return; }
    void supabase.functions.invoke("get-public-activity", { body: { slug } }).then(({ data }) => {
      setActivity(data?.activity ?? null);
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !activity) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("start-activity-session", { body: { activity_version_id: activity.id, ...identity } });
    setSubmitting(false);
    if (error || !data?.session_token) { setNotice("Identitas belum dapat disimpan. Coba lagi."); return; }
    setStudentSession(data);
  };

  const saveDraft = async (nextAnswers: Record<string, string>) => {
    if (!supabase || !studentSession) return;
    await supabase.functions.invoke("save-activity-draft", { headers: { "x-activity-session": studentSession.session_token }, body: { attempt_id: studentSession.attempt_id, payload: nextAnswers } });
  };

  const submit = async () => {
    if (!supabase || !studentSession || !activity) return;
    if (activity.questions.some((question: any) => !answers[question.id]?.trim())) { setNotice("Jawab semua soal sebelum mengirim."); return; }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("submit-activity", { headers: { "x-activity-session": studentSession.session_token }, body: { attempt_id: studentSession.attempt_id, activity_id: activity.id, answers } });
    setSubmitting(false);
    if (error) {
      setNotice("Jawaban belum dapat dikirim. Coba lagi.");
      return;
    }
    setNotice("");
    setSubmitted(true);
    setStudentSession(null);
  };

  if (loading) return <main className="public-reader"><LoadingState label="Memuat LKPD..." /></main>;
  if (!activity) return <main className="public-reader"><ErrorState title="LKPD belum tersedia">Tautan ini belum dipublikasikan atau tidak lagi tersedia.</ErrorState></main>;
  if (submitted) return <main className="public-reader"><section className="panel public-completion" role="status"><div className="public-completion-icon" aria-hidden="true">✓</div><p className="eyebrow">LKPD SELESAI</p><h1>Jawaban sudah dikirim</h1><p>Terima kasih. Jawaban Anda sudah diterima dan akan muncul pada halaman Aktivitas guru.</p></section></main>;

  const activities = Array.from(new Set(activity.questions.map((question: any) => question.activity_title || "Kegiatan 1")));
  const currentActivity = activities[Math.min(activityIndex, Math.max(activities.length - 1, 0))] || "Kegiatan 1";
  const currentQuestions = activity.questions.filter((question: any) => (question.activity_title || "Kegiatan 1") === currentActivity);
  const isLastActivity = activityIndex === activities.length - 1;
  const continueToNext = () => {
    if (currentQuestions.some((question: any) => !answers[question.id]?.trim())) { setNotice("Jawab semua soal pada kegiatan ini sebelum melanjutkan."); return; }
    setNotice("");
    setActivityIndex((current) => Math.min(current + 1, activities.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <main className="public-reader">
    {!studentSession && !notice.includes("berhasil") ? <section className="panel public-identity"><h1>{activity.title}</h1><p>Isi identitas untuk mulai mengerjakan LKPD.</p><form onSubmit={start}><label>Nama lengkap<input required minLength={2} value={identity.full_name} onChange={(event) => setIdentity({ ...identity, full_name: event.target.value })} /></label><label>Kelas<input required value={identity.class_name} onChange={(event) => setIdentity({ ...identity, class_name: event.target.value })} /></label><label>Nama sekolah<input required minLength={2} value={identity.school_name} onChange={(event) => setIdentity({ ...identity, school_name: event.target.value })} /></label><button className="button primary" disabled={submitting}>{submitting ? "Memulai..." : "Mulai LKPD"}</button>{notice && <p role="status">{notice}</p>}</form></section> : <section className="panel public-activity"><div className="public-activity-heading"><p>Kegiatan {activityIndex + 1} dari {activities.length}</p><h1>{currentActivity}</h1><small>{currentQuestions.length} soal pada kegiatan ini</small></div>{currentQuestions.map((question: any, index: number) => <fieldset key={question.id}><legend>{index + 1}. {question.prompt}</legend>{question.question_type === "multiple_choice" ? question.options.map((option: string) => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => { const next = { ...answers, [question.id]: option }; setAnswers(next); void saveDraft(next); }} /> {option}</label>) : <textarea value={answers[question.id] ?? ""} onChange={(event) => { const next = { ...answers, [question.id]: event.target.value }; setAnswers(next); }} onBlur={() => void saveDraft(answers)} />}</fieldset>)}<div className="public-activity-actions">{activityIndex > 0 && <button type="button" className="button quiet" onClick={() => { setNotice(""); setActivityIndex((current) => Math.max(current - 1, 0)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Sebelumnya</button>}{isLastActivity ? <button className="button primary" disabled={submitting || notice.includes("berhasil")} onClick={() => void submit()}>{submitting ? "Mengirim..." : "Kirim jawaban"}</button> : <button type="button" className="button primary" onClick={continueToNext}>Lanjut kegiatan</button>}</div>{notice && <p role="status">{notice}</p>}</section>}
  </main>;
}

function HomeRoute({ auth }: { auth: AuthState }) {
  if (auth.loading)
    return <LoadingState label="Memeriksa sesi administrator..." />;
  return <Navigate replace to={auth.session ? "/admin" : "/admin/login"} />;
}
type AdminProfile = {
  id: string;
  display_name: string | null;
  access_status: "pending" | "active" | "suspended";
};
type AdminProfileState =
  | { status: "loading" }
  | { status: "active"; profile: AdminProfile }
  | { status: "missing" }
  | { status: "error" };

function useAuthSession(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: Boolean(supabase),
    session: null,
  });
  useEffect(() => {
    if (!supabase) {
      setState({ loading: false, session: null });
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ loading: false, session: data.session });
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setState({ loading: false, session }),
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  return state;
}

function useAdminProfile(auth: AuthState): AdminProfileState {
  const [state, setState] = useState<AdminProfileState>({ status: "loading" });
  useEffect(() => {
    if (auth.loading) {
      setState({ status: "loading" });
      return;
    }
    if (!auth.session || !supabase) {
      setState({ status: "missing" });
      return;
    }
    let active = true;
    void supabase
      .from("admin_profiles")
      .select("id, display_name, access_status")
      .eq("id", auth.session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState({ status: "error" });
          return;
        }
        if (data?.access_status === "active") {
          setState({ status: "active", profile: data as AdminProfile });
          return;
        }
        setState({ status: "missing" });
      });
    return () => {
      active = false;
    };
  }, [auth.loading, auth.session?.user.id]);
  return state;
}

function RequireSession({
  auth,
  children,
}: {
  auth: AuthState;
  children: ReactNode;
}) {
  const location = useLocation();
  const profile = useAdminProfile(auth);
  if (auth.loading)
    return <LoadingState label="Memeriksa sesi administrator…" />;
  if (!auth.session)
    return (
      <Navigate replace to="/admin/login" state={{ from: location.pathname }} />
    );
  if (profile.status === "loading")
    return <LoadingState label="Memeriksa hak akses administrator..." />;
  if (profile.status === "error")
    return (
      <ErrorState title="Hak akses administrator tidak dapat diperiksa">
        Sesi masuk tersedia, tetapi profil administrator tidak dapat dibaca. Coba
        muat ulang. Kebijakan RLS tetap menjadi dasar otorisasi data.
      </ErrorState>
    );
  if (profile.status === "missing")
    return (
      <ErrorState title="Akses administrator belum aktif">
        Akun ini sudah masuk, tetapi belum memiliki profil administrator aktif.
        Hubungi pengelola proyek untuk penyediaan profil. Jangan gunakan akun lain
        atau membuat profil melalui peramban.
      </ErrorState>
    );
  return <>{children}</>;
}

function LoginRoute({ auth }: { auth: AuthState }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const requestedDestination = (location.state as { from?: unknown } | null)?.from;
  const destination =
    typeof requestedDestination === "string" &&
    /^\/admin(?:\/|$)/.test(requestedDestination) &&
    !requestedDestination.startsWith("//")
      ? requestedDestination
      : "/admin";
  if (!auth.loading && auth.session) return <Navigate replace to={destination} />;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError("Konfigurasi Supabase pada peramban belum tersedia.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setSessionPersistence(rememberSession);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(
          "Masuk tidak berhasil. Periksa email, kata sandi, dan status konfirmasi akun.",
        );
        return;
      }
      navigate(destination, { replace: true });
    } catch {
      setError(
        "Masuk tidak dapat diproses. Periksa koneksi internet lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section className="auth-page journal-login">
      <div className="journal-book">
        <div className="journal-cover" aria-hidden="true" />
        <div className="journal-page-stack" aria-hidden="true" />
        <div className="journal-clip" aria-hidden="true">
          <i />
          <span>portal administrator</span>
        </div>
        <div className="journal-ribbon" aria-hidden="true" />
        <div className="journal-spread">
          <aside className="journal-story">
            <div className="journal-margin" aria-hidden="true" />
            <div className="journal-brand">
              <img src="/flipbook-studio-logo.png" alt="E-Modul Flipbook" />
              <span className="journal-tape">E-MODUL FLIPBOOK</span>
              <time>EDISI 2026</time>
            </div>
            <div className="journal-intro">
              <span className="journal-tag">✦ Studio Animasi</span>
              <h1>Hidupkan cerita Anda, lembar demi lembar.</h1>
              <p>
                “Setiap goresan membawa kehidupan pada tiap lembaran gerak
                flipbook.”
              </p>
            </div>
            <div className="journal-note">
              <b>✎ Tips flipbook hari ini</b>
              <span>
                Jagalah konsistensi proporsi garis pada setiap bingkai agar ilusi
                gerak tetap mulus dan alami.
              </span>
            </div>
            <ul className="journal-checklist">
              <li className="done">Sketsa keyframe karakter utama</li>
              <li>Uji keluwesan gerak antarbingkai</li>
              <li>Ekspor urutan gambar flipbook digital</li>
            </ul>
            <footer>
              ✎ Ruang kreatif flipbook terenkripsi <span>Hal. 01</span>
            </footer>
          </aside>
          <div className="journal-binding" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
          <div className="journal-mobile-logo">
            <img src="/flipbook-studio-logo.png" alt="E-Modul Flipbook" />
          </div>
          <form className="journal-form" onSubmit={submit}>
            <div className="journal-form-heading">
              <div>
                <h2>Masuk ke Akun</h2>
                <p>Masukkan kredensial Anda di bawah ini untuk melanjutkan.</p>
              </div>
              <span>Hal. 02</span>
            </div>
            <label>
              <b>✎ Email administrator</b>
              <input
                type="email"
                autoComplete="email"
                placeholder="admin@flipbook.local"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              <b>⌘ Kata sandi akun</b>
              <span className="journal-password">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                   aria-pressed={showPassword}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.6" />
                    {showPassword && <path d="m4 4 16 16" />}
                  </svg>
                </button>
              </span>
            </label>
            <label className="journal-remember">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(event) => setRememberSession(event.target.checked)}
              />{" "}
              Simpan sesi di perangkat ini
            </label>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            {supabaseConfigurationStatus === "missing-configuration" && (
              <p className="auth-error" role="alert">
                Konfigurasi Supabase belum ditemukan.
              </p>
            )}
            <button
              className="journal-submit"
              disabled={submitting || !supabase}
              type="submit"
            >
              {submitting ? "Membuka halaman…" : "▣ Masuk ke Studio Flipbook"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function useBook(
  load: () => Promise<MockBook>,
  keys: unknown[],
): Resource<MockBook> {
  const [resource, setResource] = useState<Resource<MockBook>>({
    status: "loading",
  });
  useEffect(() => {
    let active = true;
    setResource({ status: "loading" });
    load()
      .then((data) => active && setResource({ status: "ready", data }))
      .catch(
        (error) =>
          active &&
          setResource(
            error instanceof RepositoryNotFoundError
              ? { status: "not-found" }
              : { status: "error" },
          ),
      );
    return () => {
      active = false;
    };
  }, keys); // eslint-disable-line react-hooks/exhaustive-deps
  return resource;
}

function ReaderRoute() {
  const { slug, pageId } = useParams();
  const resource = useBook(
    () => mockBookRepository.getPublicBook(slug ?? ""),
    [slug],
  );
  if (resource.status === "loading")
    return <LoadingState label="Memuat buku publik contoh…" />;
  if (resource.status === "not-found")
    return (
      <ErrorState title="Buku tidak tersedia">
        Buku belum terbit, telah ditarik, atau URL tidak sah. Tidak ada redirect
        diam-diam.
      </ErrorState>
    );
  if (resource.status === "error")
    return (
      <ErrorState title="Buku tidak dapat dimuat">
        Penyimpanan data contoh tidak dapat diakses.
      </ErrorState>
    );
  return <Reader book={resource.data} requestedPageId={pageId} />;
}

function Reader({
  book,
  requestedPageId,
}: {
  book: MockBook;
  requestedPageId?: string;
}) {
  const initialIndex = Math.max(
    0,
    requestedPageId
      ? book.pages.findIndex((page) => page.id === requestedPageId)
      : (getReaderProgress(book.slug)?.page ?? 1) - 1,
  );
  const [started, setStarted] = useState(Boolean(requestedPageId));
  const [index, setIndex] = useState(initialIndex);
  const [tocOpen, setTocOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submission, setSubmission] = useState<MockSubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const page = book.pages[index];
  const go = (next: number) => {
    setIndex(next);
    setTocOpen(false);
    saveReaderProgress({
      bookSlug: book.slug,
      page: next + 1,
      updatedAt: new Date().toISOString(),
    });
  };
  const reset = () => {
    clearReaderProgress();
    go(0);
    setStarted(true);
  };
  const submit = async () => {
    setSubmitting(true);
    try {
      setSubmission(await submitMockAnswer(answer));
    } finally {
      setSubmitting(false);
    }
  };
  if (!started)
    return (
      <section className="cover">
        <div className="cover-art" aria-hidden="true">
          <span>✦</span>
          <span>◒</span>
          <span>⌁</span>
        </div>
        <div className="cover-copy">
          <p className="eyebrow">BUKU DIGITAL · CONTOH</p>
          <h1>{book.title}</h1>
          <p className="lede">{book.description}</p>
          <dl className="book-meta">
            <div>
              <dt>Mata pelajaran</dt>
              <dd>{book.subject}</dd>
            </div>
            <div>
              <dt>Kelas</dt>
              <dd>{book.grade}</dd>
            </div>
            <div>
              <dt>Progres</dt>
              <dd>Belum dimulai</dd>
            </div>
          </dl>
          <div className="action-row">
            <button className="button primary" onClick={() => setStarted(true)}>
              Mulai membaca →
            </button>
            <button className="button quiet" onClick={reset}>
              Mulai dari awal
            </button>
          </div>
          <p className="helper">Kemajuan baca tersimpan hanya di peramban ini.</p>
        </div>
      </section>
    );
  if (!page)
    return (
      <ErrorState title="Tujuan halaman tidak tersedia">
        Halaman tidak tersedia dalam data contoh.
      </ErrorState>
    );
  return (
    <section className="reader-layout">
      <aside className={tocOpen ? "toc is-open" : "toc"}>
        <div className="toc-title">
          <span>Daftar isi</span>
          <button
            onClick={() => setTocOpen(false)}
            aria-label="Tutup daftar isi"
          >
            ×
          </button>
        </div>
        {book.pages.map((item, itemIndex) => (
          <button
            key={item.id}
            className={index === itemIndex ? "toc-item is-current" : "toc-item"}
            onClick={() => go(itemIndex)}
          >
            <span>{String(itemIndex + 1).padStart(2, "0")}</span>
            <span>
              {item.label}
              <small>{item.kind}</small>
            </span>
          </button>
        ))}
      </aside>
      <div className="reader-main">
        <div className="reader-toolbar">
          <button
            className="icon-button"
            onClick={() => setTocOpen(!tocOpen)}
            aria-expanded={tocOpen}
          >
            ☰
          </button>
          <div>
            <strong>{book.title}</strong>
            <span>
              Halaman {index + 1} dari {book.pages.length}
            </span>
          </div>
          <button className="button compact">Aa</button>
        </div>
        <article className="book-page">
          <p className="eyebrow">{page.kind.toUpperCase()}</p>
          <h1>{page.label}</h1>
          <p className="intro">{page.body}</p>
          {page.kind === "Halaman" && (
            <figure>
              <div className="illustration">
                🌿 <span>↔</span> 🐝 <span>↔</span> 🌻
              </div>
              <figcaption>
                Hubungan antarbagian ekosistem saling terkait.
              </figcaption>
            </figure>
          )}
          {page.kind === "Aktivitas" && (
            <Activity
              answer={answer}
              setAnswer={setAnswer}
              submission={submission}
              submitting={submitting}
              submit={submit}
            />
          )}
        </article>
        <nav className="reader-nav">
          <button
            className="button quiet"
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            ← Sebelumnya
          </button>
          <span>
            {index + 1}/{book.pages.length}
          </span>
          <button
            className="button primary"
            disabled={index === book.pages.length - 1}
            onClick={() => go(index + 1)}
          >
            Berikutnya →
          </button>
        </nav>
      </div>
    </section>
  );
}

function Activity({
  answer,
  setAnswer,
  submission,
  submitting,
  submit,
}: {
  answer: string;
  setAnswer: (answer: string) => void;
  submission: MockSubmitResult | null;
  submitting: boolean;
  submit: () => Promise<void>;
}) {
  return (
    <>
      <fieldset>
        <legend>Pilih satu jawaban</legend>
        <label>
          <input
            type="radio"
            value="selokan"
            checked={answer === "selokan"}
            onChange={(event) => setAnswer(event.target.value)}
          />{" "}
          Membuang sampah ke selokan
        </label>
        <label>
          <input
            type="radio"
            value="menanam"
            checked={answer === "menanam"}
            onChange={(event) => setAnswer(event.target.value)}
          />{" "}
          Menanam dan merawat pohon
        </label>
        <label>
          <input
            type="radio"
            value="membakar"
            checked={answer === "membakar"}
            onChange={(event) => setAnswer(event.target.value)}
          />{" "}
          Membakar daun setiap hari
        </label>
      </fieldset>
      <div className="activity-actions">
        <button
          className="button primary"
          disabled={!answer || submitting || Boolean(submission)}
          onClick={submit}
        >
          {submitting ? "Mengirim jawaban…" : "Kirim jawaban"}
        </button>
        <p className="notice" aria-live="polite">
          {submission
            ? `Jawaban diterima secara lokal · nomor bukti ${submission.receiptId}. Ini bukan hasil penilaian.`
            : "Status: jawaban belum dikirim."}
        </p>
      </div>
    </>
  );
}

type FoundationBook = {
  id: string;
  title: string;
  draft_status: "draft" | "archived";
  current_revision: number;
  updated_at: string;
};

function AdminInfoShell({
  active,
  title,
  eyebrow,
  children,
}: {
  active: "settings" | "about" | "editor" | "activity" | "qr";
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    const nav = document.querySelector(".admin-nav");
    if (!nav || nav.querySelector(".sidebar-logout")) return;
    const button = document.createElement("button");
    button.className = "sidebar-logout";
    button.innerHTML =
      '<span class="nav-icon" aria-hidden="true">↪</span><span>Keluar</span>';
    button.onclick = async () => {
      if (supabase) await supabase.auth.signOut();
      navigate("/admin/login", { replace: true });
    };
    nav.appendChild(button);
    return () => button.remove();
  }, [navigate]);
  return (
    <div className="admin-dashboard-page admin-layout">
      <aside className="admin-nav">
        <div className="admin-nav-brand">
          <span className="brand-mark">F</span>
          <strong>E-Modul Flipbook</strong>
        </div>
        <div className="workspace-switcher">
          KOLEKSI PUBLIKASI<span>⌄</span>
        </div>
        <p className="admin-nav-label">WORKSPACE</p>
        <Link to="/admin">
          <span className="nav-icon" aria-hidden="true">
            <LayoutDashboard />
          </span>
          <span>Dashboard</span>
        </Link>
        <Link
          className={active === "qr" ? "is-current" : ""}
          to="/admin/qr-code"
        >
          <span className="nav-icon" aria-hidden="true">
            <QrCode />
          </span>
          <span>QR Code</span>
        </Link>
        <Link to="/admin/collection">
          <span className="nav-icon" aria-hidden="true">
            <BookOpen />
          </span>
          <span>Koleksi</span>
        </Link>
        <Link
          className={active === "activity" ? "is-current" : ""}
          to="/admin/activity"
        >
          <span className="nav-icon" aria-hidden="true">
            <ListChecks />
          </span>
          <span>Aktivitas</span>
        </Link>
        <Link
          className={active === "settings" ? "is-current" : ""}
          to="/admin/settings"
        >
          <span className="nav-icon" aria-hidden="true">
            <Settings />
          </span>
          <span>Pengaturan</span>
        </Link>
        <Link
          className={active === "about" ? "is-current" : ""}
          to="/admin/about"
        >
          <span className="nav-icon" aria-hidden="true">
            <CircleHelp />
          </span>
          <span>Tentang Kami</span>
        </Link>
        <div className="storage-card">
          <strong>Penyimpanan</strong>
          <span>Informasi penyedia telemetri belum tersedia</span>
          <div className="storage-bar">
            <i />
          </div>
        </div>
      </aside>
      <section className="workspace">
        <nav className="breadcrumbs">
          <Link to="/admin">Dashboard</Link>
          <span>/</span>
          <span>{title}</span>
        </nav>
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

function SettingsRoute() {
  const [savedProfile, setSavedProfile] = useState(() => ({
    name:
      safeLocalStorageGet("flipbook-studio-display-name") || "Editor Redaksi",
    email:
      safeLocalStorageGet("flipbook-studio-profile-email") ||
      "admin@flipbook.id",
  }));
  const [displayName, setDisplayName] = useState(
    () =>
      safeLocalStorageGet("flipbook-studio-display-name") || "Editor Redaksi",
  );
  const [email, setEmail] = useState(
    () =>
      safeLocalStorageGet("flipbook-studio-profile-email") ||
      "admin@flipbook.id",
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void supabase?.auth.getUser().then(({ data }) => {
      const savedName = data.user?.user_metadata?.display_name;
      if (typeof savedName === "string" && savedName.trim()) {
        const name = savedName.trim();
        setDisplayName(name);
        setSavedProfile((profile) => ({ ...profile, name }));
        safeLocalStorageSet("flipbook-studio-display-name", name);
      }
      if (data.user?.email) {
        setEmail(data.user.email);
        setSavedProfile((profile) => ({
          ...profile,
          email: data.user!.email!,
        }));
      }
    });
  }, []);

  const normalizedName = displayName.trim() || "Editor Redaksi";
  const normalizedEmail = email.trim();
  const hasChanges =
    normalizedName !== savedProfile.name ||
    normalizedEmail !== savedProfile.email ||
    Boolean(newPassword || confirmPassword);

  const handleSave = async () => {
    const safeName = normalizedName;
    if (!normalizedEmail) {
      setMessage("Email login wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage("Masukkan alamat email yang valid.");
      return;
    }
    if (safeName.length > 120) {
      setMessage("Nama tampilan maksimal 120 karakter.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setMessage("Kata sandi baru minimal terdiri dari 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Konfirmasi kata sandi belum sama.");
      return;
    }
    if (!supabase) {
      setMessage("Konfigurasi Supabase belum tersedia.");
      return;
    }
    setSaving(true);
    setMessage("");
    const updates: { email?: string; password?: string; data?: { display_name: string } } = {
      data: { display_name: safeName },
    };
    if (normalizedEmail) updates.email = normalizedEmail;
    if (newPassword) updates.password = newPassword;
    try {
      const { data, error } = await supabase.auth.updateUser(updates);
      if (error || !data.user) {
        setMessage("Perubahan akun belum dapat disimpan. Periksa data lalu coba lagi.");
        return;
      }
      const confirmedEmail = data.user.email ?? savedProfile.email;
      const emailNeedsConfirmation = normalizedEmail !== confirmedEmail;
      safeLocalStorageSet("flipbook-studio-display-name", safeName);
      safeLocalStorageSet("flipbook-studio-profile-email", confirmedEmail);
      window.dispatchEvent(new Event("flipbook-profile-updated"));
      setEmail(confirmedEmail);
      setNewPassword("");
      setConfirmPassword("");
      setSavedProfile({ name: safeName, email: confirmedEmail });
      setMessage(
        emailNeedsConfirmation
          ? "Profil disimpan. Konfirmasikan email baru melalui pesan dari Supabase sebelum digunakan untuk masuk."
          : newPassword
            ? "Profil diperbarui. Kata sandi baru sudah disimpan."
            : "Profil dan email login sudah diperbarui.",
      );
      const toast = document.createElement("div");
      toast.className = "save-toast";
      toast.innerHTML =
        "<span>✓</span><div><strong>Pengaturan tersimpan</strong><small>Preferensi akun berhasil diperbarui.</small></div>";
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add("is-visible"));
      window.setTimeout(() => {
        toast.classList.remove("is-visible");
        window.setTimeout(() => toast.remove(), 220);
      }, 2600);
    } catch {
      setMessage("Perubahan akun belum dapat diproses. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminInfoShell
      active="settings"
      eyebrow="PENGATURAN AKUN"
      title="Pengaturan"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
      <section className="settings-grid">
        <article className="panel settings-card settings-account-card">
          <h2>Profil redaksi</h2>
          <p>Perbarui informasi yang tampil di area administrator.</p>
          <label>
            Nama tampilan
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            Email login
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <small className="settings-hint">
            Perubahan email dapat memerlukan konfirmasi dari Supabase sebelum
            email baru bisa digunakan untuk masuk.
          </small>
        </article>
        <article className="panel settings-card settings-account-card">
          <h2>Keamanan akun</h2>
          <p>Biarkan kolom kata sandi kosong jika tidak ingin mengubahnya.</p>
          <label>
            Kata sandi baru
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
            />
          </label>
          <label>
            Konfirmasi kata sandi
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Ulangi kata sandi baru"
            />
          </label>
          <small className="settings-hint">
            Gunakan kata sandi yang kuat dan tidak dipakai di layanan lain.
          </small>
        </article>
      </section>
      <section className="settings-save-panel">
        <div>
          {message && (
            <p className="settings-message" role="status">
              {message}
            </p>
          )}
        </div>
        <button
          className="button primary"
          type="submit"
          disabled={saving || !hasChanges}
        >
          {saving ? "Menyimpan…" : "Simpan perubahan akun"}
        </button>
      </section>
      </form>
    </AdminInfoShell>
  );
}

function AboutRouteLegacy() {
  return (
    <AdminInfoShell
      active="about"
      eyebrow="TENTANG PLATFORM"
      title="Tentang Kami"
    >
      <section className="panel about-card">
        <div className="about-logo">
          <img src="/flipbook-studio-logo.png" alt="E-Modul Flipbook" />
        </div>
        <div>
          <h2>E-Modul Flipbook</h2>
          <p>
            Ruang kerja untuk membuat, mengelola, dan menerbitkan flipbook digital
            interaktif dengan pengalaman membaca yang nyaman.
          </p>
          <div className="about-meta">
            <span>Versi MVP</span>
            <span>Supabase dev</span>
            <span>© 2026 E-Modul Flipbook</span>
          </div>
        </div>
      </section>
    </AdminInfoShell>
  );
}

function AboutRoute() {
  return (
    <AdminInfoShell
      active="about"
      eyebrow="TENTANG PLATFORM"
      title="Tentang Kami"
    >
      <section className="about-hero">
        <div className="about-developer-logo">
          <img src="/flipbook-studio-logo.png?v=2" alt="Logo E-Modul Flipbook" />
        </div>
        <div>
          <p className="eyebrow">PRODUK PENGEMBANGAN TESIS</p>
          <h2>E-Modul Flipbook</h2>
          <p>
            E-Modul Flipbook merupakan media pembelajaran digital interaktif yang dirancang untuk membantu pendidik menyusun, mengelola, dan memublikasikan e-modul secara lebih praktis. Melalui satu ruang kerja terpadu, pengguna dapat menata materi, menambahkan media pendukung, serta menyajikan pengalaman belajar yang menarik dan mudah diakses oleh peserta didik.
          </p>
          <div className="about-meta">
            <span>Media Pembelajaran</span>
            <span>UI/UX</span>
            <span>Sistem Informasi</span>
          </div>
        </div>
      </section>
      <section className="about-cards">
        <article className="panel about-card">
          <small>01</small>
          <h3>Visi pengembangan</h3>
          <p>
            Menghadirkan pengalaman membuat flipbook yang profesional,
            fleksibel, dan mudah dipahami.
          </p>
        </article>
        <article className="panel about-card">
          <small>02</small>
          <h3>Prinsip produk</h3>
          <p>
            Sederhana saat digunakan, rapi di setiap halaman, dan aman untuk
            pengelolaan konten.
          </p>
        </article>
        <article className="panel about-card">
          <small>03</small>
          <h3>Tentang aplikasi</h3>
          <p>
            E-Modul Flipbook membantu admin mengimpor PDF, menyusun halaman, dan
            mengelola publikasi digital.
          </p>
        </article>
      </section>
      <section className="about-quote">
        “Belajar menjadi lebih bermakna melalui media digital interaktif.”
        <small>— Pengembang —</small>
      </section>
    </AdminInfoShell>
  );
}

function LegacyActivityResultsRoute({ title, onBack }: { title?: string; onBack?: () => void }) {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(false); }, []);
  return <AdminInfoShell active="activity" eyebrow="HASIL LKPD" title={title || "Aktivitas siswa"}><section className="panel activity-results"><div className="panel-heading"><div><p className="eyebrow">HASIL ISIAN SISWA</p><h2>{title || "Semua aktivitas"}</h2><p>Halaman ini khusus untuk memantau jawaban dan nilai siswa.</p></div>{onBack && <button type="button" className="button secondary" onClick={onBack}>Kembali</button>}</div>{loading ? <LoadingState label="Memuat hasil aktivitas…" /> : <div className="activity-table-wrap"><table><thead><tr><th>Siswa</th><th>E-modul</th><th>Kelas / sekolah</th><th>Status</th><th>Nilai</th></tr></thead><tbody>{attempts.length ? attempts.map((attempt) => { const result = Array.isArray(attempt.attempt_results) ? attempt.attempt_results[0] : attempt.attempt_results; return <tr key={attempt.id}><td><strong>{attempt.student_full_name || "Belum mengisi identitas"}</strong></td><td>{attempt.activity_definitions?.title || "—"}</td><td>{[attempt.student_class, attempt.student_school].filter(Boolean).join(" · ") || "—"}</td><td>{result?.review_status === "needs_review" ? "Perlu dinilai" : attempt.status === "finalized" ? "Selesai" : "Draf"}</td><td>{result?.final_score ?? "—"}</td></tr>; }) : <tr><td colSpan={5}>Belum ada hasil isian siswa.</td></tr>}</tbody></table></div>}</section></AdminInfoShell>;
}

function ActivityResultsRoute({ title, onBack, attemptId }: { title?: string; onBack?: () => void; attemptId?: string }) {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<{ attempt: any; questions: any[]; answers: Record<string, string> } | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingSaving, setGradingSaving] = useState(false);
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [gradeNotice, setGradeNotice] = useState("");
  const [pendingDeleteAttempt, setPendingDeleteAttempt] = useState<any | null>(null);
  const [deletingAttemptId, setDeletingAttemptId] = useState("");
  const [listNotice, setListNotice] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    void supabase.functions.invoke("get-admin-activity-results").then(({ data, error }) => {
      if (active) { setAttempts(error ? [] : data?.attempts ?? []); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!attemptId || !supabase) return;
    let active = true;
    setGradingLoading(true);
    void supabase.functions.invoke("get-admin-activity-results", { body: { attempt_id: attemptId } }).then(({ data, error }) => {
      if (!active) return;
      setGradingLoading(false);
      if (error || !data?.attempt) { setGradeNotice("Jawaban siswa belum dapat dimuat. Coba lagi."); return; }
      setGrading({ attempt: data.attempt, questions: data.questions ?? [], answers: data.answers ?? {} });
      setGradeValues(data.scores ?? {});
    });
    return () => { active = false; };
  }, [attemptId]);

  useEffect(() => {
    if (!listNotice) return;
    const timer = window.setTimeout(() => setListNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [listNotice]);

  const saveAllEssayGrades = async () => {
    if (!supabase || !grading) return;
    const essays = grading.questions.filter((question: any) => question.question_type === "essay");
    for (const question of essays) {
      const score = Number(gradeValues[question.id]);
      if (!Number.isFinite(score) || score < 0 || score > question.max_score) { setGradeNotice(`Lengkapi nilai 0–${question.max_score} untuk setiap soal uraian.`); return; }
    }
    setGradingSaving(true);
    for (const question of essays) {
      const { error } = await supabase.functions.invoke("grade-activity-essay", { body: { attempt_id: grading.attempt.id, question_id: question.id, score: Number(gradeValues[question.id]), comment: "" } });
      if (error) { setGradingSaving(false); setGradeNotice("Nilai belum dapat disimpan. Coba lagi."); return; }
    }
    setGradingSaving(false);
    navigate(`/admin/activity/${encodeURIComponent(title || "lkpd")}`);
  };

  const deleteStudentAnswer = async () => {
    if (!supabase || !pendingDeleteAttempt) return;
    setDeletingAttemptId(pendingDeleteAttempt.id);
    const { error } = await supabase.functions.invoke("delete-activity-attempt", { body: { attempt_id: pendingDeleteAttempt.id } });
    if (error) {
      setListNotice("Jawaban siswa belum dapat dihapus. Coba lagi.");
      setDeletingAttemptId("");
      return;
    }
    setAttempts((current) => current.filter((attempt) => attempt.id !== pendingDeleteAttempt.id));
    setPendingDeleteAttempt(null);
    setDeletingAttemptId("");
    setListNotice("Jawaban siswa berhasil dihapus.");
  };

  const selectedAttempts = title ? attempts.filter((attempt) => attempt.lkpd_title === title) : attempts;
  const lkpdRows = Array.from(selectedAttempts.reduce((map: Map<string, any[]>, attempt) => {
    const key = attempt.lkpd_title || "LKPD tanpa judul";
    map.set(key, [...(map.get(key) ?? []), attempt]);
    return map;
  }, new Map<string, any[]>()).entries());

  if (attemptId) return <AdminInfoShell active="activity" eyebrow="PENILAIAN LKPD" title={title || "Penilaian"}>
    {gradingLoading ? <LoadingState label="Memuat jawaban siswa..." /> : !grading ? <ErrorState title="Jawaban belum tersedia">{gradeNotice || "Jawaban siswa tidak dapat dimuat. Silakan kembali dan coba lagi."}</ErrorState> : <section className="panel activity-results">
      <div className="panel-heading"><div><p className="eyebrow">KOREKSI JAWABAN</p><h2>{grading.attempt.student_full_name}</h2><p>{grading.attempt.student_class} · {grading.attempt.student_school}</p></div><button type="button" className="button secondary" disabled={gradingSaving} onClick={() => navigate(`/admin/activity/${encodeURIComponent(title || "lkpd")}`)}>Kembali</button></div>
      {grading.questions.map((question: any, index: number) => <fieldset key={question.id}><legend>{index + 1}. {question.prompt} {question.question_type === "essay" && `(maks. ${question.max_score})`}</legend><p><strong>Jawaban siswa:</strong> {grading.answers[question.id] || "Belum dijawab."}</p>{question.question_type === "essay" ? <label>Nilai<input type="number" min="0" max={question.max_score} step="any" inputMode="decimal" disabled={gradingSaving} value={gradeValues[question.id] ?? ""} onWheel={(event) => event.currentTarget.blur()} onChange={(event) => { const value = event.target.value; const score = Number(value); if (value === "" || (Number.isFinite(score) && score >= 0 && score <= question.max_score)) setGradeValues((current) => ({ ...current, [question.id]: value })); }} /></label> : <p><em>Soal pilihan ganda dihitung otomatis.</em></p>}</fieldset>)}
      {grading.questions.some((question: any) => question.question_type === "essay") && <button type="button" className="button primary" disabled={gradingSaving} onClick={() => void saveAllEssayGrades()}>{gradingSaving && <span className="button-loader" aria-hidden="true" />} {gradingSaving ? "Menyimpan nilai..." : "Simpan semua nilai"}</button>}
      {gradeNotice && <p className="notice" role="status">{gradeNotice}</p>}
    </section>}
  </AdminInfoShell>;

  return <AdminInfoShell active="activity" eyebrow="HASIL LKPD" title={title || "Aktivitas siswa"}>
    <section className="panel activity-results">
      <div className="panel-heading"><div><p className="eyebrow">HASIL ISIAN SISWA</p><h2>{title || "Daftar LKPD"}</h2><p>{title ? "Pilih siswa untuk melihat jawaban atau melakukan penilaian." : "Pilih LKPD untuk melihat daftar siswa yang sudah mengerjakan."}</p></div>{onBack && <button type="button" className="button secondary" onClick={onBack}>Kembali</button>}</div>
      {listNotice && <p className="notice" role="status">{listNotice}</p>}
      {loading ? <LoadingState label="Memuat hasil aktivitas..." /> : !title ? (
        <div className="activity-table-wrap"><table><thead><tr><th>LKPD</th><th>Jumlah siswa</th><th>Perlu dinilai</th><th>Aksi</th></tr></thead><tbody>{lkpdRows.length ? lkpdRows.map(([lkpdTitle, rows]) => <tr key={lkpdTitle}><td><strong>{lkpdTitle}</strong></td><td>{rows.length} siswa</td><td>{rows.filter((attempt) => attempt.result?.review_status === "needs_review").length} siswa</td><td><button type="button" className="button compact" onClick={() => navigate(`/admin/activity/${encodeURIComponent(lkpdTitle)}`)}>Lihat siswa</button></td></tr>) : <tr><td colSpan={4}>Belum ada hasil isian siswa.</td></tr>}</tbody></table></div>
      ) : (
        <div className="activity-table-wrap"><table><thead><tr><th>Siswa</th><th>Kelas / sekolah</th><th>Status</th><th>Nilai</th><th>Aksi</th></tr></thead><tbody>{selectedAttempts.length ? selectedAttempts.map((attempt) => { const result = attempt.result; return <tr key={attempt.id}><td><strong>{attempt.student_full_name || "Belum mengisi identitas"}</strong></td><td>{[attempt.student_class, attempt.student_school].filter(Boolean).join(" · ") || "—"}</td><td>{result?.review_status === "needs_review" ? "Perlu dinilai" : attempt.status === "finalized" ? "Selesai" : "Draf"}</td><td>{result?.final_score ?? "—"}</td><td><div className="lkpd-row-actions"><button type="button" className="button compact" onClick={() => navigate(`/admin/activity/${encodeURIComponent(title)}/attempt/${attempt.id}`)}>{result?.review_status === "needs_review" ? "Nilai" : "Tinjau"}</button><button type="button" className="button compact danger-button" onClick={() => setPendingDeleteAttempt(attempt)}>Hapus jawaban</button></div></td></tr>; }) : <tr><td colSpan={5}>Belum ada siswa yang mengerjakan LKPD ini.</td></tr>}</tbody></table></div>
      )}
      {pendingDeleteAttempt && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDeleteAttempt(null); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-attempt-title"><div className="confirm-icon">!</div><p className="eyebrow">KONFIRMASI TINDAKAN</p><h2 id="delete-attempt-title">Hapus jawaban siswa?</h2><p>Jawaban, nilai, dan data pengerjaan <strong>{pendingDeleteAttempt.student_full_name || "siswa ini"}</strong> akan dihapus permanen.</p><div className="confirm-actions"><button className="button quiet" type="button" disabled={Boolean(deletingAttemptId)} onClick={() => setPendingDeleteAttempt(null)}>Batal</button><button className="button danger-solid" type="button" disabled={Boolean(deletingAttemptId)} onClick={() => void deleteStudentAnswer()}>{deletingAttemptId ? "Menghapus..." : "Ya, hapus jawaban"}</button></div></section></div>}
    </section>
  </AdminInfoShell>;
}

function ActivityRoute() {
  return <ActivityResultsRoute />;
  const [books] = useState(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem("flipbook-studio-collection-books") ?? "[]",
      ) as Array<{ title?: string; status?: string }>;
      const titles = stored
        .map((book) => book.title)
        .filter(Boolean) as string[];
      return titles.length ? titles : ["E-Modul IPAS Kelas V", "Flipbook Baru"];
    } catch {
      return ["E-Modul IPAS Kelas V", "Flipbook Baru"];
    }
  });
  const [selectedBook, setSelectedBook] = useState(books[0]);
  return (
    <AdminInfoShell
      active="activity"
      eyebrow="PEMANTAUAN PEMBELAJARAN"
      title="Aktivitas siswa"
    >
      <section className="panel activity-module-table">
        <div>
          <p className="eyebrow">DAFTAR E-MODUL</p>
          <h2>Pilih e-modul</h2>
          <p>Pilih e-modul untuk melihat data aktivitas dan nilai siswa.</p>
        </div>
        <div className="activity-table-wrap">
          <table>
            <thead>
              <tr><th>No.</th><th>Judul e-modul</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {books.map((title, index) => (
                <tr key={title}>
                  <td>{String(index + 1).padStart(2, "0")}</td>
                  <td><strong>{title}</strong></td>
                  <td><span className="score score-pass">Tersedia</span></td>
                  <td><button type="button" className="button secondary" onClick={() => navigate(`/admin/activity/${encodeURIComponent(title)}`)}>Lihat aktivitas</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminInfoShell>
  );

  const results = [
    {
      name: "Aulia Rahma",
      className: "V-A",
      score: 92,
      completed: "12 Nov 2026 · 09.15",
    },
    {
      name: "Bima Pratama",
      className: "V-A",
      score: 86,
      completed: "12 Nov 2026 · 09.09",
    },
    {
      name: "Citra Lestari",
      className: "V-B",
      score: 78,
      completed: "11 Nov 2026 · 14.22",
    },
    {
      name: "Dimas Saputra",
      className: "V-B",
      score: 95,
      completed: "11 Nov 2026 · 13.48",
    },
  ];
  const average = Math.round(
    results.reduce((total, item) => total + item.score, 0) / results.length,
  );
  return (
    <AdminInfoShell
      active="activity"
      eyebrow="PEMANTAUAN PEMBELAJARAN"
      title="Aktivitas siswa"
    >
      <section className="activity-book-picker">
        <div>
          <p className="eyebrow">PILIH FLIPBOOK</p>
          <h2>Koleksi flipbook</h2>
          <p>Pilih flipbook untuk melihat hasil aktivitas dan nilai siswa.</p>
        </div>
        <div className="activity-book-grid">
          {books.map((title, index) => (
            <button
              key={title}
              type="button"
              className={selectedBook === title ? "is-selected" : ""}
              onClick={() => setSelectedBook(title)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
              <small>
                {selectedBook === title
                  ? "Sedang ditampilkan"
                  : "Lihat hasil siswa"}
              </small>
            </button>
          ))}
        </div>
      </section>
      <section className="panel activity-results">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">REKAP AKTIVITAS</p>
            <h2>{selectedBook}</h2>
            <p>Hasil pengerjaan aktivitas dan soal interaktif siswa.</p>
          </div>
          <span className="status neutral">{results.length} siswa</span>
        </div>
        <div className="activity-stats">
          <article>
            <span>Rata-rata nilai</span>
            <strong>{average}</strong>
            <small>dari 100</small>
          </article>
          <article>
            <span>Tuntas</span>
            <strong>{results.filter((item) => item.score >= 75).length}</strong>
            <small>siswa mencapai KKM</small>
          </article>
          <article>
            <span>Aktivitas selesai</span>
            <strong>100%</strong>
            <small>berdasarkan data tersedia</small>
          </article>
        </div>
        <div className="activity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Nilai</th>
                <th>Selesai dikerjakan</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <tr key={item.name}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.className}</td>
                  <td>
                    <span
                      className={`score score-${item.score >= 75 ? "pass" : "review"}`}
                    >
                      {item.score}
                    </span>
                  </td>
                  <td>{item.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminInfoShell>
  );
}

function ActivityDetailRoute() {
  const navigate = useNavigate();
  const { moduleTitle } = useParams();
  return <ActivityResultsRoute title={decodeURIComponent(moduleTitle || "E-Modul")} onBack={() => navigate("/admin/activity")} />;
  const selectedBook = decodeURIComponent(moduleTitle || "E-Modul");
  const results = [
    { name: "Aulia Rahma", className: "V-A", score: 92, completed: "12 Nov 2026 · 09.15" },
    { name: "Bima Pratama", className: "V-A", score: 86, completed: "12 Nov 2026 · 09.09" },
    { name: "Citra Lestari", className: "V-B", score: 78, completed: "11 Nov 2026 · 14.22" },
    { name: "Dimas Saputra", className: "V-B", score: 95, completed: "11 Nov 2026 · 13.48" },
  ];
  const average = Math.round(results.reduce((total, item) => total + item.score, 0) / results.length);
  return (
    <AdminInfoShell active="activity" eyebrow="PEMANTAUAN PEMBELAJARAN" title="Data aktivitas">
      <section className="panel activity-results">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">REKAP AKTIVITAS</p>
            <h2>{selectedBook}</h2>
            <p>Hasil pengerjaan aktivitas dan soal interaktif siswa.</p>
          </div>
          <button type="button" className="button secondary" onClick={() => navigate("/admin/activity")}>Kembali ke daftar</button>
        </div>
        <div className="activity-stats">
          <article><span>Rata-rata nilai</span><strong>{average}</strong><small>dari 100</small></article>
          <article><span>Tuntas</span><strong>{results.filter((item) => item.score >= 75).length}</strong><small>siswa mencapai KKM</small></article>
          <article><span>Aktivitas selesai</span><strong>100%</strong><small>berdasarkan data tersedia</small></article>
        </div>
        <div className="activity-table-wrap">
          <table>
            <thead><tr><th>Siswa</th><th>Kelas</th><th>Nilai</th><th>Selesai dikerjakan</th></tr></thead>
            <tbody>{results.map((item) => <tr key={item.name}><td><strong>{item.name}</strong></td><td>{item.className}</td><td><span className={`score score-${item.score >= 75 ? "pass" : "review"}`}>{item.score}</span></td><td>{item.completed}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </AdminInfoShell>
  );
}

function ActivityGradingRoute() {
  const { moduleTitle, attemptId } = useParams();
  return <ActivityResultsRoute title={decodeURIComponent(moduleTitle || "LKPD")} attemptId={attemptId} />;
}

type LkpdQuestionDraft = { question_type: "multiple_choice" | "essay"; prompt: string; options: string[]; correct_answer: string; max_score: number; rubric: string; activity_title: string };
const newLkpdQuestion = (activityTitle = "Kegiatan 1"): LkpdQuestionDraft => ({ question_type: "multiple_choice", prompt: "", options: ["", ""], correct_answer: "", max_score: 1, rubric: "", activity_title: activityTitle });

function getCollectionModules() {
  try {
    const books = JSON.parse(window.localStorage.getItem("flipbook-studio-collection-books") ?? "[]") as Array<{ title?: string }>;
    return books.map((book) => book.title).filter(Boolean) as string[];
  } catch { return []; }
}

function LkpdListRoute({ onCreate }: { onCreate: (title: string) => void }) {
  const [modules, setModules] = useState<string[]>(getCollectionModules);
  const [items, setItems] = useState<Array<{ id: string; title: string; public_slug: string | null; status: string }>>([]);
  const [status, setStatus] = useState("Memuat LKPD…");
  useEffect(() => {
    const refresh = () => setModules(getCollectionModules());
    window.addEventListener("flipbook-collection-updated", refresh);
    if (!supabase) { setStatus("Supabase belum dikonfigurasi."); return () => window.removeEventListener("flipbook-collection-updated", refresh); }
    void supabase.from("activity_definitions").select("id,title,public_slug,status").order("updated_at", { ascending: false }).then(({ data, error }) => {
      if (error) setStatus("LKPD belum tersedia. Terapkan migrasi LKPD terlebih dahulu.");
      else { setItems(data ?? []); setStatus(""); }
    });
    return () => window.removeEventListener("flipbook-collection-updated", refresh);
  }, []);
  const listed = Array.from(new Set([...modules, ...items.map((item) => item.title)]));
  return <AdminInfoShell active="activity" eyebrow="PENILAIAN LKPD" title="Aktivitas siswa">
    <section className="panel activity-module-table">
      <div><p className="eyebrow">LKPD PER E-MODUL</p><h2>Susun soal dan pantau jawaban</h2><p>Siswa hanya dapat mengakses LKPD yang sudah dipublikasikan bersama e-modulnya.</p></div>
      {status && <p role="status">{status}</p>}
      <div className="activity-table-wrap"><table><thead><tr><th>E-modul</th><th>Status LKPD</th><th>Aksi</th></tr></thead><tbody>
        {listed.length ? listed.map((title) => { const item = items.find((candidate) => candidate.title === title); return <tr key={title}><td><strong>{title}</strong></td><td><span className={`score score-${item?.status === "published" ? "pass" : "review"}`}>{item?.status === "published" ? "Dipublikasikan" : item ? "Draf" : "Belum dibuat"}</span></td><td><button type="button" className="button secondary" onClick={() => onCreate(title)}>{item ? "Kelola LKPD" : "Buat LKPD"}</button></td></tr>; }) : <tr><td colSpan={3}>Belum ada e-modul. Buat dan publikasikan e-modul dahulu.</td></tr>}
      </tbody></table></div>
    </section>
  </AdminInfoShell>;
}

function LkpdGroupedEditor({ moduleTitle, onTitleChange, questions, setQuestions, saving, notice, onDismissNotice, onSave, onImportExcel, onBack }: { moduleTitle: string; onTitleChange: (title: string) => void; questions: LkpdQuestionDraft[]; setQuestions: React.Dispatch<React.SetStateAction<LkpdQuestionDraft[]>>; saving: boolean; notice: string; onDismissNotice?: () => void; onSave: (status: "draft" | "published") => void; onImportExcel: (file: File) => void; onBack: () => void }) {
  const activities = Array.from(new Set(questions.map((question) => question.activity_title || "Kegiatan 1")));
  const excelInputRef = useRef<HTMLInputElement>(null);
  const renameActivity = (before: string, after: string) => setQuestions((current) => current.map((question) => question.activity_title === before ? { ...question, activity_title: after } : question));
  const updateQuestion = (index: number, patch: Partial<LkpdQuestionDraft>) => setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  const downloadQuestionTemplate = () => downloadExcelTemplate("template-lkpd", ["Kegiatan", "Jenis soal", "Pertanyaan", "Pilihan 1", "Pilihan 2", "Pilihan 3", "Pilihan 4", "Jawaban benar", "Bobot nilai", "Rubrik"], [["Kegiatan 1", "Uraian", "", "", "", "", "", "", 1, ""]]);
  const addActivity = () => setQuestions((current) => { const existing = new Set(current.map((question) => question.activity_title || "Kegiatan 1")); let sequence = 1; while (existing.has(`Kegiatan ${sequence}`)) sequence += 1; return [...current, newLkpdQuestion(`Kegiatan ${sequence}`)]; });
  const removeActivity = (activity: string) => { if (activities.length > 1) setQuestions((current) => current.filter((question) => question.activity_title !== activity)); };
  return <AdminInfoShell active="activity" eyebrow="PENYUSUNAN LKPD" title={moduleTitle}>
    <section className="panel activity-results lkpd-grouped-editor"><div className="panel-heading"><div><p className="eyebrow">SOAL UNTUK SISWA</p><label className="lkpd-title-field"><span>Judul LKPD</span><input aria-label="Judul LKPD" value={moduleTitle} onChange={(event) => onTitleChange(event.target.value)} placeholder="Masukkan judul LKPD" /></label><p>Kelompokkan soal berdasarkan kegiatan pembelajaran atau evaluasi.</p></div><button type="button" className="button secondary" onClick={onBack}>Kembali</button></div>
      <div className="lkpd-excel-toolbar"><div><strong>Siapkan soal dengan Excel</strong><small>Unduh template, isi kegiatan dan soal di Excel, lalu impor kembali ke LKPD ini.</small></div><div><button type="button" className="button secondary" onClick={downloadQuestionTemplate}>Unduh template Excel</button><button type="button" className="button secondary" onClick={() => excelInputRef.current?.click()}>Impor Excel</button><input ref={excelInputRef} className="sr-only" type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImportExcel(file); event.currentTarget.value = ""; }} /></div></div>
      <div className="lkpd-activity-toolbar"><span>{activities.length} kegiatan · {questions.length} soal</span><button type="button" className="button secondary" onClick={addActivity}>+ Tambah kegiatan</button></div>
      <div className="lkpd-editor-scroll" tabIndex={0} aria-label="Daftar kegiatan dan soal LKPD"><div className="lkpd-activity-stack">{activities.map((activity, activityIndex) => <section className="lkpd-activity-section" key={activityIndex}><header><div><span className="lkpd-activity-number">Kegiatan {activityIndex + 1}</span><input aria-label={`Nama kegiatan ${activityIndex + 1}`} value={activity} onChange={(event) => renameActivity(activity, event.target.value)} /></div><div><small>{questions.filter((question) => question.activity_title === activity).length} soal</small><button type="button" className="button quiet" disabled={activities.length === 1} onClick={() => removeActivity(activity)}>Hapus kegiatan</button></div></header>
        {questions.map((question, questionIndex) => question.activity_title === activity && <article className="lkpd-grouped-question" key={`${activity}-${questionIndex}`}><div className="panel-heading"><strong>Soal {questionIndex + 1}</strong><button type="button" className="button quiet" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))}>Hapus</button></div><div className="lkpd-question-fields"><label>Jenis soal<select value={question.question_type} onChange={(event) => updateQuestion(questionIndex, { question_type: event.target.value as LkpdQuestionDraft["question_type"], correct_answer: "", options: event.target.value === "essay" ? [] : ["", ""] })}><option value="multiple_choice">Pilihan ganda</option><option value="essay">Uraian</option></select></label><label>Bobot nilai<input type="number" min="1" max="1000" value={question.max_score} onChange={(event) => updateQuestion(questionIndex, { max_score: Number(event.target.value) })} /></label><label className="is-wide">Pertanyaan<textarea value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} /></label>{question.question_type === "multiple_choice" ? <><label className="is-wide">Pilihan jawaban{question.options.map((option, optionIndex) => <input key={optionIndex} value={option} placeholder={`Pilihan ${optionIndex + 1}`} onChange={(event) => updateQuestion(questionIndex, { options: question.options.map((value, currentIndex) => currentIndex === optionIndex ? event.target.value : value) })} />)}</label><label className="is-wide">Jawaban benar<select value={question.correct_answer} onChange={(event) => updateQuestion(questionIndex, { correct_answer: event.target.value })}><option value="">Pilih jawaban benar</option>{question.options.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}</select></label></> : <label className="is-wide">Rubrik penilaian (opsional)<textarea value={question.rubric} onChange={(event) => updateQuestion(questionIndex, { rubric: event.target.value })} /></label>}</div></article>)}<button type="button" className="button secondary lkpd-add-question" onClick={() => setQuestions((current) => [...current, newLkpdQuestion(activity)])}>+ Tambah soal ke kegiatan ini</button></section>)}</div></div>
      <div className="panel-heading lkpd-save-actions"><span>{notice}</span><div><button type="button" className="button secondary" disabled={saving} onClick={() => onSave("draft")}>Simpan draf</button><button type="button" className="button primary" disabled={saving} onClick={() => onSave("published")}>{saving ? "Menyimpan…" : "Publikasikan LKPD"}</button></div></div>
    </section></AdminInfoShell>;
}

function LkpdEditorRoute({ moduleTitle, onBack }: { moduleTitle: string; onBack: () => void }) {
  const slug = bookSlug(moduleTitle);
  const [lkpdTitle, setLkpdTitle] = useState(moduleTitle.replace(/-/g, " "));
  const [definitionId, setDefinitionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<LkpdQuestionDraft[]>([newLkpdQuestion()]);
  const [loading, setLoading] = useState(true); const [notice, setNotice] = useState(""); const [saving, setSaving] = useState(false);
  const [pendingExcelImport, setPendingExcelImport] = useState<{ fileName: string; questions: LkpdQuestionDraft[] } | null>(null);
  useEffect(() => {
    if (!/(berhasil|tersimpan|diimpor)/i.test(notice) || /(gagal|tidak dapat|periksa)/i.test(notice)) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    if (!supabase) { try { const cached = JSON.parse(window.localStorage.getItem(`flipbook-studio-lkpd-draft-${slug}`) ?? "null"); if (Array.isArray(cached?.questions) && cached.questions.length) setQuestions(cached.questions.map((question: LkpdQuestionDraft) => ({ ...question, activity_title: question.activity_title || "Kegiatan 1" }))); } catch { /* cache lokal tidak tersedia */ } setLoading(false); setNotice("Draf lokal dimuat. Supabase belum dikonfigurasi."); return; }
    const loadLkpd = async () => {
      let hasCachedDraft = false;
      try {
        const cached = JSON.parse(window.localStorage.getItem(`flipbook-studio-lkpd-draft-${slug}`) ?? "null");
        if (Array.isArray(cached?.questions) && cached.questions.length) { hasCachedDraft = true; if (cached.title) setLkpdTitle(cached.title); setQuestions(cached.questions.map((question: LkpdQuestionDraft) => ({ ...question, activity_title: question.activity_title || "Kegiatan 1" }))); }
      } catch { /* cache lokal tidak tersedia */ }
      let response = await supabase.from("activity_definitions").select("id,title,activity_questions(id,question_type,prompt,options,correct_answer,max_score,rubric,activity_title,position)").eq("public_slug", slug).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      // Draf yang dibuat sebelum fitur kegiatan tetap dapat dibuka, bahkan bila
      // migrasi kolom activity_title belum dijalankan pada proyek Supabase.
      if (response.error && /activity_title/i.test(response.error.message ?? "")) response = await supabase.from("activity_definitions").select("id,title,activity_questions(id,question_type,prompt,options,correct_answer,max_score,rubric,position)").eq("public_slug", slug).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      setLoading(false);
      if (response.error) { setNotice("LKPD belum dapat dimuat. Periksa koneksi database."); return; }
      if (response.data) { setDefinitionId(response.data.id); if (response.data.title) setLkpdTitle(response.data.title); const loaded = [...(response.data.activity_questions ?? [])].sort((a, b) => a.position - b.position).map((q) => ({ ...q, prompt: q.prompt === "__DRAFT_EMPTY_PROMPT__" ? "" : q.prompt, activity_title: q.activity_title || "Kegiatan 1", options: Array.isArray(q.options) ? q.options.map((option: string) => option.startsWith("__DRAFT_OPTION_") ? "" : option) : [], correct_answer: q.correct_answer?.startsWith("__DRAFT_OPTION_") ? "" : q.correct_answer })); if (loaded.length && !hasCachedDraft) setQuestions(loaded); }
    };
    void loadLkpd();
  }, [slug]);
  // Selalu pertahankan perubahan penulis di browser. Ini mencegah nama
  // kegiatan yang baru diketik tertimpa ketika respons server datang terlambat.
  useEffect(() => {
    if (loading) return;
    try { window.localStorage.setItem(`flipbook-studio-lkpd-draft-${slug}`, JSON.stringify({ title: lkpdTitle, questions, savedAt: Date.now() })); } catch { /* penyimpanan browser tidak tersedia */ }
  }, [loading, lkpdTitle, questions, slug]);
  const updateQuestion = (index: number, patch: Partial<LkpdQuestionDraft>) => setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  const importQuestionsFromExcel = async (file: File) => {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error("Berkas tidak memiliki lembar kerja.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: "" });
      const text = (value: unknown) => String(value ?? "").trim();
      const imported = rows.map((row) => {
        const type = text(row["Jenis soal"]).toLocaleLowerCase("id-ID");
        const isMultipleChoice = type.includes("pilihan") || type.includes("ganda");
        const options = [row["Pilihan 1"], row["Pilihan 2"], row["Pilihan 3"], row["Pilihan 4"]].map(text).filter(Boolean);
        const score = Number(row["Bobot nilai"]);
        return {
          activity_title: text(row["Kegiatan"]) || "Kegiatan 1",
          question_type: isMultipleChoice ? "multiple_choice" : "essay",
          prompt: text(row["Pertanyaan"]),
          options: isMultipleChoice ? (options.length >= 2 ? options : ["", ""]) : [],
          correct_answer: text(row["Jawaban benar"]),
          max_score: Number.isFinite(score) && score > 0 ? score : 1,
          rubric: text(row["Rubrik"]),
        } satisfies LkpdQuestionDraft;
      }).filter((question) => question.prompt || question.activity_title !== "Kegiatan 1");
      if (!imported.length) throw new Error("Tidak ada baris soal yang dapat diimpor. Gunakan header dari template Excel.");
      setPendingExcelImport({ fileName: file.name, questions: imported });
    } catch (error) {
      setNotice(error instanceof Error ? `Impor Excel gagal: ${error.message}` : "Impor Excel gagal. Gunakan berkas .xlsx, .xls, atau .csv dari template.");
    }
  };
  const save = async (publicationStatus: "draft" | "published") => {
    if (!supabase) { try { window.localStorage.setItem(`flipbook-studio-lkpd-draft-${slug}`, JSON.stringify({ title: lkpdTitle, questions, savedAt: Date.now() })); setNotice("Draf tersimpan di browser. Supabase belum dikonfigurasi."); } catch { setNotice("Draf tidak dapat disimpan di browser."); } return; }
    setSaving(true); setNotice(publicationStatus === "published" ? "Mempublikasikan LKPD…" : "Menyimpan draf LKPD…");
    const normalized = questions.map((question) => {
      const isDraft = publicationStatus === "draft";
      const enteredOptions = question.question_type === "multiple_choice" ? question.options.map((option) => option.trim()).filter(Boolean) : [];
      const safeOptions = question.question_type === "multiple_choice" && isDraft ? [enteredOptions[0] || "__DRAFT_OPTION_1__", enteredOptions[1] || "__DRAFT_OPTION_2__", ...enteredOptions.slice(2)] : enteredOptions;
      return { ...question, activity_title: question.activity_title.trim() || "Kegiatan 1", prompt: question.prompt.trim() || (isDraft ? "__DRAFT_EMPTY_PROMPT__" : ""), options: safeOptions, correct_answer: question.correct_answer.trim() || (isDraft && question.question_type === "multiple_choice" ? safeOptions[0] : ""), max_score: Number(question.max_score) };
    });
    if (publicationStatus === "draft") {
      try { window.localStorage.setItem(`flipbook-studio-lkpd-draft-${slug}`, JSON.stringify({ title: lkpdTitle, questions, savedAt: Date.now() })); } catch { /* penyimpanan browser penuh/tidak tersedia */ }
      setNotice("Draf tersimpan di browser. Menyinkronkan ke server…");
    }
    try {
      const result = await Promise.race([
        supabase.rpc("admin_save_lkpd", { p_definition_id: definitionId, p_title: lkpdTitle.trim() || "LKPD Baru", p_public_slug: slug, p_status: publicationStatus, p_questions: normalized }),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("timeout")), 8000)),
      ]);
      const { data, error } = result as { data: string | null; error: { message?: string } | null };
      if (error) { setNotice(publicationStatus === "draft" ? `Draf tersimpan di browser, tetapi sinkronisasi server gagal: ${error.message || "periksa migrasi database."}` : `Penyimpanan gagal: ${error.message || "periksa isi LKPD dan migrasi database."}`); return; }
      setDefinitionId(data); setNotice(publicationStatus === "published" ? "LKPD berhasil dipublikasikan." : `Draf LKPD berhasil disimpan (${new Set(questions.map((question) => question.activity_title.trim() || "Kegiatan 1")).size} kegiatan).`);
    } catch (error) {
      setNotice(error instanceof Error && error.message === "timeout" ? (publicationStatus === "draft" ? "Draf tersimpan di browser, tetapi server tidak merespons dalam 8 detik." : "Penyimpanan tidak merespons. Periksa koneksi atau Supabase, lalu coba lagi.") : "Penyimpanan gagal. Periksa koneksi database lalu coba lagi.");
    } finally { setSaving(false); }
  };
  const confirmExcelImport = () => {
    if (!pendingExcelImport) return;
    setQuestions(pendingExcelImport.questions);
    setNotice(`${pendingExcelImport.questions.length} soal dari ${pendingExcelImport.fileName} berhasil diimpor. Klik Simpan draf atau Publikasikan LKPD untuk menyimpan.`);
    setPendingExcelImport(null);
  };
  if (!loading) return <><LkpdGroupedEditor moduleTitle={lkpdTitle} onTitleChange={setLkpdTitle} questions={questions} setQuestions={setQuestions} saving={saving} notice={notice} onSave={(status) => void save(status)} onImportExcel={(file) => void importQuestionsFromExcel(file)} onBack={onBack} />
    {pendingExcelImport && <div className="modal-backdrop lkpd-import-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingExcelImport(null); }}><section className="confirm-modal lkpd-import-modal" role="dialog" aria-modal="true" aria-labelledby="lkpd-import-title"><div className="lkpd-import-icon" aria-hidden="true"><FileText /></div><p className="eyebrow">IMPOR SOAL LKPD</p><h2 id="lkpd-import-title">Gunakan soal dari Excel?</h2><p>Berkas <strong>{pendingExcelImport.fileName}</strong> berisi <strong>{pendingExcelImport.questions.length} soal</strong>. Soal yang sedang ada akan digantikan.</p><div className="lkpd-import-summary"><span>Langkah berikutnya</span><strong>Periksa hasil impor, lalu simpan draf atau publikasikan LKPD.</strong></div><div className="confirm-actions"><button className="button quiet" type="button" onClick={() => setPendingExcelImport(null)}>Batal</button><button className="button primary" type="button" onClick={confirmExcelImport}>Ya, impor soal</button></div></section></div>}</>;
  /* Editor satu-per-satu versi lama tidak dipakai. Hasil siswa tersedia di halaman Aktivitas. */
  /* return <AdminInfoShell active="activity" eyebrow="PENYUSUNAN LKPD" title={moduleTitle}>
    <section className="panel activity-results"><div className="panel-heading"><div><p className="eyebrow">SOAL UNTUK SISWA</p><h2>LKPD {moduleTitle}</h2><p>Pilihan ganda dinilai otomatis; uraian masuk antrean penilaian manual.</p></div><button type="button" className="button secondary" onClick={onBack}>Kembali</button></div>
    {loading ? <LoadingState label="Memuat LKPD…" /> : <><div className="activity-table-wrap"><ol className="lkpd-question-list">{questions.map((question, index) => <li key={index} className="panel"><div className="panel-heading"><strong>Soal {index + 1}</strong><button type="button" className="button secondary" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Hapus</button></div><label>Jenis soal<select value={question.question_type} onChange={(event) => updateQuestion(index, { question_type: event.target.value as LkpdQuestionDraft["question_type"], correct_answer: "", options: event.target.value === "essay" ? [] : ["", ""] })}><option value="multiple_choice">Pilihan ganda</option><option value="essay">Uraian</option></select></label><label>Pertanyaan<textarea value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} /></label><label>Bobot nilai<input type="number" min="1" max="1000" value={question.max_score} onChange={(event) => updateQuestion(index, { max_score: Number(event.target.value) })} /></label>{question.question_type === "multiple_choice" ? <><label>Pilihan jawaban{question.options.map((option, optionIndex) => <input key={optionIndex} value={option} placeholder={`Pilihan ${optionIndex + 1}`} onChange={(event) => updateQuestion(index, { options: question.options.map((value, currentIndex) => currentIndex === optionIndex ? event.target.value : value) })} />)}</label><button type="button" className="button secondary" disabled={question.options.length >= 8} onClick={() => updateQuestion(index, { options: [...question.options, ""] })}>Tambah pilihan</button><label>Jawaban benar<select value={question.correct_answer} onChange={(event) => updateQuestion(index, { correct_answer: event.target.value })}><option value="">Pilih jawaban benar</option>{question.options.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}</select></label></> : <label>Rubrik penilaian (opsional)<textarea value={question.rubric} onChange={(event) => updateQuestion(index, { rubric: event.target.value })} /></label>}</li>)}</ol></div><div className="panel-heading"><button type="button" className="button secondary" onClick={() => setQuestions((current) => [...current, newLkpdQuestion()])}>Tambah soal</button><div><button type="button" className="button secondary" disabled={saving} onClick={() => void save("draft")}>Simpan draf</button> <button type="button" className="button primary" disabled={saving} onClick={() => void save("published")}>{saving ? "Menyimpan…" : "Publikasikan LKPD"}</button></div></div>{notice && <p role="status">{notice}</p>}</>}</section>
    {attempts.length > 0 && <section className="panel activity-results"><h2>Hasil siswa</h2><div className="activity-table-wrap"><table><thead><tr><th>Nama</th><th>Kelas / sekolah</th><th>Status</th><th>Nilai</th><th>Aksi</th></tr></thead><tbody>{attempts.map((attempt) => { const result = Array.isArray(attempt.attempt_results) ? attempt.attempt_results[0] : attempt.attempt_results; return <tr key={attempt.id}><td><strong>{attempt.student_full_name}</strong></td><td>{attempt.student_class} · {attempt.student_school}</td><td>{result?.review_status === "needs_review" ? "Perlu dinilai" : attempt.status === "finalized" ? "Selesai" : "Draf"}</td><td>{result?.final_score ?? "—"}</td><td>{result?.review_status === "needs_review" && <button type="button" className="button compact" onClick={() => void openGrading(attempt)}>Nilai esai</button>}</td></tr>; })}</tbody></table></div></section>}
    {gradingAttempt && <section className="panel activity-results"><div className="panel-heading"><div><h2>Koreksi esai: {gradingAttempt.student_full_name}</h2><p>Nilai disimpan melalui server dan tidak boleh melebihi bobot soal.</p></div><button type="button" className="button secondary" onClick={() => setGradingAttempt(null)}>Tutup</button></div>{questions.filter((question: any) => question.question_type === "essay").map((question: any, index: number) => <fieldset key={question.id ?? index}><legend>{question.prompt} (maks. {question.max_score})</legend><p>{gradingAnswers[question.id] || "Siswa belum menjawab."}</p><label>Nilai<input type="number" min="0" max={question.max_score} value={gradeValues[question.id]?.score ?? ""} onChange={(event) => setGradeValues((current) => ({ ...current, [question.id]: { score: event.target.value, comment: current[question.id]?.comment ?? "" } }))} /></label><label>Komentar (opsional)<textarea value={gradeValues[question.id]?.comment ?? ""} onChange={(event) => setGradeValues((current) => ({ ...current, [question.id]: { score: current[question.id]?.score ?? "", comment: event.target.value } }))} /></label><button type="button" className="button primary" onClick={() => void gradeEssay(question)}>Simpan nilai</button></fieldset>)}</section>}
  </AdminInfoShell>; */
}

function QrLkpdEditorRoute() {
  const navigate = useNavigate(); const { moduleTitle } = useParams();
  const routeValue = decodeURIComponent(moduleTitle || "E-Modul");
  const [stableSlug, setStableSlug] = useState(routeValue);
  useEffect(() => {
    setStableSlug(routeValue);
    if (!supabase) return;
    let active = true;
    void (async () => {
      let response = await supabase.from("activity_definitions").select("public_slug").eq("public_slug", bookSlug(routeValue)).maybeSingle();
      if (!response.data) response = await supabase.from("activity_definitions").select("public_slug").eq("title", routeValue).maybeSingle();
      if (active && response.data?.public_slug) setStableSlug(response.data.public_slug);
    })();
    return () => { active = false; };
  }, [routeValue]);
  return <LkpdEditorRoute moduleTitle={stableSlug} onBack={() => navigate("/admin/qr-code")} />;
}

function QrCodeRoute() {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState("");
  const [showMedia, setShowMedia] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showLkpdPicker, setShowLkpdPicker] = useState(false);
  const [lkpdTitle, setLkpdTitle] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState("");
  const [mediaName, setMediaName] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [mediaSaving, setMediaSaving] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState("");
  const [pendingDeleteMedia, setPendingDeleteMedia] = useState<{ id: string; title: string; public_url: string } | null>(null);
  const [shownQr, setShownQr] = useState<{ id: string; title: string; target: string } | null>(null);
  const [savedMedia, setSavedMedia] = useState<Array<{ id: string; title: string; public_url: string }>>([]);
  const [savedLkpd, setSavedLkpd] = useState<Array<{ id: string; title: string; public_slug: string | null; status: string }>>([]);
  const [localLkpd, setLocalLkpd] = useState<Array<{ id: string; title: string; public_slug: string; status: string; isEmpty: boolean }>>([]);
  const [deletingLkpdId, setDeletingLkpdId] = useState("");
  const [pendingDeleteLkpd, setPendingDeleteLkpd] = useState<{ id: string; title: string; public_slug: string | null; status: string } | null>(null);
  const [pendingCloseLkpd, setPendingCloseLkpd] = useState<{ id: string; title: string; public_slug: string | null; status: string } | null>(null);
  const [closingLkpdId, setClosingLkpdId] = useState("");
  const [lkpdNotice, setLkpdNotice] = useState("");
  const [collectionBooks, setCollectionBooks] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("flipbook-studio-collection-books") ?? "[]");
      return Array.isArray(stored) ? stored : [];
    } catch { return []; }
  });
  const [publicationStatuses, setPublicationStatuses] = useState<Record<string, "Draf" | "Terpublikasi">>(() => {
    try { return JSON.parse(window.localStorage.getItem("flipbook-studio-collection-publications") ?? "{}"); } catch { return {}; }
  });
  const qrRows = collectionBooks
    .filter((book) => publicationStatuses[book.title] === "Terpublikasi")
    .map((book) => ({ ...book, id: bookSlug(book.title), target: `${window.location.origin}/siswa/flipbook/${bookSlug(book.title)}` }));
  const lkpdRows = [...savedLkpd, ...localLkpd.filter((local) => !savedLkpd.some((saved) => saved.public_slug === local.public_slug) && !(local.isEmpty && savedLkpd.some((saved) => saved.title.trim().toLocaleLowerCase("id-ID") === local.title.trim().toLocaleLowerCase("id-ID"))))];
  useEffect(() => {
    const drafts: Array<{ id: string; title: string; public_slug: string; status: string; isEmpty: boolean }> = [];
    for (let index = 0; index < window.localStorage.length; index += 1) { const key = window.localStorage.key(index) ?? ""; if (!key.startsWith("flipbook-studio-lkpd-draft-")) continue; try { const draft = JSON.parse(window.localStorage.getItem(key) ?? "{}"); const public_slug = key.replace("flipbook-studio-lkpd-draft-", ""); if (Array.isArray(draft.questions)) drafts.push({ id: `local-${public_slug}`, title: draft.title || public_slug.replace(/-/g, " "), public_slug, status: "local", isEmpty: draft.questions.every((question: LkpdQuestionDraft) => !String(question.prompt ?? "").trim()) }); } catch { /* abaikan data draf yang rusak */ } }
    setLocalLkpd(drafts);
    const refresh = () => {
      try {
        const savedBooks = JSON.parse(window.localStorage.getItem("flipbook-studio-collection-books") ?? "[]");
        const savedStatuses = JSON.parse(window.localStorage.getItem("flipbook-studio-collection-publications") ?? "{}");
        if (Array.isArray(savedBooks)) setCollectionBooks(savedBooks);
        if (savedStatuses && typeof savedStatuses === "object") setPublicationStatuses(savedStatuses);
      } catch { /* mempertahankan data yang telah dimuat */ }
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("flipbook-collection-updated", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("flipbook-collection-updated", refresh); };
  }, []);
  useEffect(() => {
    if (!lkpdNotice) return;
    const timeout = window.setTimeout(() => setLkpdNotice(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [lkpdNotice]);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: media } = await supabase.from("published_media").select("id,title,public_url").eq("owner_admin_id", data.user.id).order("created_at", { ascending: false });
      if (media) setSavedMedia(media);
      const { data: lkpd } = await supabase.from("activity_definitions").select("id,title,public_slug,status").eq("owner_admin_id", data.user.id).order("updated_at", { ascending: false });
      if (lkpd) setSavedLkpd(lkpd);
    });
  }, []);
  const copyQrLink = async (id: string, target: string) => {
    try {
      await navigator.clipboard.writeText(target);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(""), 1800);
    } catch {
      // Clipboard can be unavailable in an insecure preview.
    }
  };
  const copyQrImage = async (id: string, target: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(target, { width: 480, margin: 1, errorCorrectionLevel: "M" });
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopiedId(`${id}-qr`);
      window.setTimeout(() => setCopiedId(""), 1800);
    } catch {
      setMediaError("QR Code belum dapat disalin. Coba gunakan Salin tautan.");
    }
  };
  const chooseMediaFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^(video\/(mp4|webm)|audio\/(mpeg|wav))$/.test(file.type)) {
      setMediaError("Gunakan format MP4, WebM, MP3, atau WAV.");
      return;
    }
    setMediaError("");
    if (uploadedMediaUrl) URL.revokeObjectURL(uploadedMediaUrl);
    setMediaFile(file);
    setMediaName(file.name.replace(/\.[^/.]+$/, ""));
    setUploadedMediaUrl(URL.createObjectURL(file));
  };
  const saveMedia = async () => {
    if (!supabase || !mediaFile) return;
    setMediaSaving(true); setMediaError("");
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("not_authenticated");
      const id = crypto.randomUUID();
      const extension = mediaFile.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${authData.user.id}/${id}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("public-media").upload(path, mediaFile, { contentType: mediaFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("public-media").getPublicUrl(path);
      const mediaType = mediaFile.type.startsWith("video/") ? "video" : "audio";
      const { error: insertError } = await supabase.from("published_media").insert({ id, owner_admin_id: authData.user.id, title: mediaName || mediaFile.name, media_type: mediaType, public_url: urlData.publicUrl });
      if (insertError) { await supabase.storage.from("public-media").remove([path]); throw insertError; }
      setSavedMedia((current) => [{ id, title: mediaName || mediaFile.name, public_url: urlData.publicUrl }, ...current]);
      setShowMedia(false); setMediaFile(null); setMediaName("");
      if (uploadedMediaUrl) URL.revokeObjectURL(uploadedMediaUrl); setUploadedMediaUrl("");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown_error";
      setMediaError(`Media belum dapat disimpan: ${detail}`);
    } finally { setMediaSaving(false); }
  };
  const saveLink = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    let target: URL;
    try { target = new URL(linkUrl.trim()); } catch { setMediaError("Masukkan tautan yang valid."); return; }
    if (target.protocol !== "https:" && target.protocol !== "http:") { setMediaError("Gunakan tautan HTTP atau HTTPS."); return; }
    const title = linkTitle.trim() || target.hostname;
    setLinkSaving(true); setMediaError("");
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("not_authenticated");
      const id = crypto.randomUUID();
      const { error } = await supabase.from("published_media").insert({ id, owner_admin_id: authData.user.id, title, media_type: "video", public_url: target.toString() });
      if (error) throw error;
      setSavedMedia((current) => [{ id, title, public_url: target.toString() }, ...current]);
      setShowLink(false); setLinkTitle(""); setLinkUrl("");
    } catch (error) { setMediaError(`Tautan belum dapat disimpan: ${error instanceof Error ? error.message : "unknown_error"}`); }
    finally { setLinkSaving(false); }
  };
  const deleteMedia = async (media: { id: string; public_url: string }) => {
    if (!supabase) return;
    setDeletingMediaId(media.id); setMediaError("");
    try {
      const marker = "/public-media/";
      const index = media.public_url.indexOf(marker);
      const path = index >= 0 ? decodeURIComponent(media.public_url.slice(index + marker.length)) : "";
      const { data: deletedRows, error: databaseError } = await supabase.from("published_media").delete().eq("id", media.id).select("id");
      if (databaseError || !deletedRows?.some((row) => row.id === media.id)) throw databaseError ?? new Error("delete_not_authorized");
      if (path) { const { error: storageError } = await supabase.storage.from("public-media").remove([path]); if (storageError) throw storageError; }
      setSavedMedia((current) => current.filter((item) => item.id !== media.id));
      setPendingDeleteMedia(null);
    } catch { setMediaError("Media belum dapat dihapus. Coba lagi."); }
    finally { setDeletingMediaId(""); }
  };
  const deleteLkpd = async (item: { id: string; title: string; public_slug: string | null; status: string }) => {
    setDeletingLkpdId(item.id);
    try {
      if (item.id.startsWith("local-")) {
        window.localStorage.removeItem(`flipbook-studio-lkpd-draft-${item.public_slug}`);
        setLocalLkpd((current) => current.filter((draft) => draft.id !== item.id));
      } else if (supabase) {
        const { error } = await supabase.functions.invoke("delete-activity-definition", { body: { definition_id: item.id } });
        if (error) throw error;
        setSavedLkpd((current) => current.filter((draft) => draft.id !== item.id));
        if (item.public_slug) window.localStorage.removeItem(`flipbook-studio-lkpd-draft-${item.public_slug}`);
      }
      setPendingDeleteLkpd(null);
    } catch { setMediaError("LKPD belum dapat dihapus. Coba lagi."); }
    finally { setDeletingLkpdId(""); }
  };
  const closeLkpd = async (item: { id: string; title: string; public_slug: string | null; status: string }) => {
    if (!supabase || item.id.startsWith("local-")) return;
    setClosingLkpdId(item.id);
    try {
      const { error } = await supabase.functions.invoke("close-activity-definition", { body: { definition_id: item.id } });
      if (error) throw error;
      setSavedLkpd((current) => current.map((draft) => draft.id === item.id ? { ...draft, status: "closed" } : draft));
      setPendingCloseLkpd(null);
      setLkpdNotice("Publikasi LKPD dibatalkan. Tautan dan QR siswa sudah ditutup.");
    } catch {
      setLkpdNotice("LKPD belum dapat ditutup. Coba lagi.");
    } finally { setClosingLkpdId(""); }
  };

  return (
    <AdminInfoShell active="qr" eyebrow="PUBLIKASI E-MODUL" title="QR Code">
      <section className="panel qr-table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">KOLEKSI TERPUBLIKASI</p>
            <h2>Bagikan e-modul</h2>
            <p>Salin QR Code atau tautan untuk membagikan e-modul.</p>
          </div><div className="qr-heading-actions"><span className="qr-badge">{qrRows.length + savedMedia.length} QR Code</span><button className="button secondary" type="button" onClick={() => { setLkpdTitle(""); setShowLkpdPicker(true); }}>Buat soal LKPD</button><button className="button secondary" type="button" onClick={() => { setMediaError(""); setShowLink(true); }}>+ Tambah tautan</button><button className="button primary" type="button" onClick={() => { setMediaError(""); setShowMedia(true); }}>+ Tambah media</button></div>
        </div>
        {qrRows.length === 0 ? <EmptyState title="Belum ada e-modul terpublikasi">Publikasikan e-modul dari halaman Koleksi agar QR Code tersedia di sini.</EmptyState> : <div className="activity-table-wrap qr-table-wrap">
          <table>
            <thead><tr><th>E-modul</th><th>Tautan</th><th>Aksi</th></tr></thead>
            <tbody>
              {qrRows.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong><small>Terpublikasi</small></td>
                  <td className="qr-target">{item.target}</td>
                  <td><button type="button" className="button secondary qr-copy-button" onClick={() => setShownQr({ id: item.id, title: item.title, target: item.target })}>Tampilkan QR</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </section>
      <section className="panel qr-table-panel lkpd-qr-panel">
        <div className="panel-heading"><div><p className="eyebrow">LKPD TERSIMPAN</p><h2>QR kegiatan dan soal</h2><p>Susun LKPD terlebih dahulu, lalu unduh QR untuk ditempelkan pada modul.</p>{lkpdNotice && <p className="settings-message" role="status">{lkpdNotice}</p>}</div></div>
        {lkpdRows.length === 0 ? <p className="empty-copy">Belum ada LKPD tersimpan. Pilih “Buat soal LKPD” untuk membuatnya.</p> : <div className="activity-table-wrap qr-table-wrap"><table><thead><tr><th>LKPD</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{lkpdRows.map((item) => {
          const target = `${window.location.origin}/lkpd/${item.public_slug || bookSlug(item.title)}`;
          const isPublished = item.status === "published";
          const isClosed = item.status === "closed";
          return <tr key={item.id}><td className="lkpd-title-cell"><strong>{item.title}</strong><small>{isPublished ? "Siap dipindai siswa" : isClosed ? "Akses siswa sudah ditutup" : "Draf tersimpan"}</small></td><td><span className={`lkpd-status ${isPublished ? "is-published" : "is-draft"}`}>{isPublished ? "Terpublikasi" : isClosed ? "Ditutup" : "Draf"}</span></td><td><div className="lkpd-row-actions"><button type="button" className="button secondary qr-copy-button" onClick={() => navigate(`/admin/qr-code/lkpd/${encodeURIComponent(item.title)}`)}>Edit</button>{isPublished ? <><button type="button" className="button primary qr-copy-button" onClick={() => setShownQr({ id: item.id, title: item.title, target })}>Tampilkan QR</button><button type="button" className="button secondary qr-copy-button" onClick={() => setPendingCloseLkpd(item)}>Batalkan publikasi</button></> : <span className="qr-draft-hint">{isClosed ? "Edit lalu publikasikan kembali untuk membuka akses siswa." : "Publikasikan LKPD terlebih dahulu untuk mengaktifkan QR."}</span>}<button type="button" className="button danger-button qr-copy-button" onClick={() => setPendingDeleteLkpd(item)}>Hapus</button></div></td></tr>;
        })}</tbody></table></div>}
      </section>
      {savedMedia.length > 0 && <section className="panel qr-table-panel"><div className="panel-heading"><div><p className="eyebrow">MEDIA TERSIMPAN</p><h2>QR media pembelajaran</h2></div></div><div className="activity-table-wrap qr-table-wrap"><table><thead><tr><th>Media</th><th>Aksi</th></tr></thead><tbody>{savedMedia.map((media) => <tr key={media.id}><td><strong>{media.title}</strong></td><td><button type="button" className="button secondary qr-copy-button" onClick={() => setShownQr({ id: media.id, title: media.title, target: media.public_url })}>Tampilkan QR</button> <button type="button" className="button danger-button qr-copy-button" disabled={deletingMediaId === media.id} onClick={() => setPendingDeleteMedia(media)}>{deletingMediaId === media.id ? "Menghapus..." : "Hapus"}</button></td></tr>)}</tbody></table></div></section>}
      {showLkpdPicker && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLkpdPicker(false); }}><form className="confirm-modal media-modal" onSubmit={(event) => { event.preventDefault(); const title = lkpdTitle.trim() || "LKPD Baru"; navigate(`/admin/qr-code/lkpd/${encodeURIComponent(title)}`); }} aria-labelledby="lkpd-picker-title"><p className="eyebrow">PENYUSUNAN LKPD</p><h2 id="lkpd-picker-title">Buat soal LKPD</h2><p>Buat kegiatan dan soal terlebih dahulu. QR Code dapat ditempelkan ke modul sebelum PDF diunggah ke aplikasi.</p><label className="upload-field">Judul LKPD<input autoFocus value={lkpdTitle} onChange={(event) => setLkpdTitle(event.target.value)} placeholder="Contoh: LKPD Ekosistem Kelas 5" /></label><div className="confirm-actions"><button className="button quiet" type="button" onClick={() => setShowLkpdPicker(false)}>Batal</button><button className="button primary" type="submit">Lanjutkan</button></div></form></div>}
      {showMedia && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowMedia(false); }}><section className="confirm-modal media-modal" role="dialog" aria-modal="true" aria-labelledby="media-title"><p className="eyebrow">MEDIA INTERAKTIF</p><h2 id="media-title">Tambah video atau audio</h2><p>Unggah media untuk membuat QR Code.</p><label className="qr-upload-control"><span>Pilih media</span><input type="file" accept="video/mp4,video/webm,audio/mpeg,audio/wav" onChange={chooseMediaFile}/><strong>{mediaFile?.name ?? "MP4, WebM, MP3, atau WAV"}</strong></label>{mediaError && <p className="settings-message" role="alert">{mediaError}</p>}{uploadedMediaUrl && <div className="qr-media-preview"><strong>{mediaName}</strong>{mediaFile?.type.startsWith("video/") ? <video controls playsInline preload="metadata" src={uploadedMediaUrl} /> : <audio controls preload="metadata" src={uploadedMediaUrl} />}</div>}<div className="confirm-actions"><button className="button quiet" type="button" onClick={() => setShowMedia(false)}>Batal</button><button className="button primary" type="button" disabled={!mediaFile || mediaSaving} onClick={() => void saveMedia()}>{mediaSaving ? "Menyimpan…" : "Simpan & buat QR"}</button></div></section></div>}
      {shownQr && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShownQr(null); }}><section className="confirm-modal share-modal qr-display-modal" role="dialog" aria-modal="true" aria-labelledby="shown-qr-title"><p className="eyebrow">QR CODE</p><h2 id="shown-qr-title">{shownQr.title}</h2><div className="share-modal-qr"><LocalQrCode value={shownQr.target} alt={`QR Code untuk ${shownQr.title}`} size={320} /></div><label className="share-link-field"><span>Tautan</span><input readOnly value={shownQr.target} /></label><div className="confirm-actions"><button className="button quiet" type="button" onClick={() => void copyQrImage(shownQr.id, shownQr.target)}>{copiedId === `${shownQr.id}-qr` ? "QR tersalin" : "Salin QR"}</button><button className="button primary" type="button" onClick={() => void copyQrLink(shownQr.id, shownQr.target)}>{copiedId === shownQr.id ? "Tautan tersalin" : "Salin tautan"}</button><button className="button quiet" type="button" onClick={() => setShownQr(null)}>Tutup</button></div></section></div>}
      {pendingDeleteMedia && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDeleteMedia(null); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-media-title"><div className="confirm-icon">!</div><p className="eyebrow">KONFIRMASI TINDAKAN</p><h2 id="delete-media-title">Hapus media ini?</h2><p>Media <strong>{pendingDeleteMedia.title}</strong> dan QR Code-nya akan dihapus. Tindakan ini tidak dapat dibatalkan.</p><div className="confirm-actions"><button className="button quiet" type="button" disabled={Boolean(deletingMediaId)} onClick={() => setPendingDeleteMedia(null)}>Batal</button><button className="button danger-solid" type="button" disabled={Boolean(deletingMediaId)} onClick={() => void deleteMedia(pendingDeleteMedia)}>{deletingMediaId ? "Menghapus…" : "Ya, hapus media"}</button></div></section></div>}
      {pendingDeleteLkpd && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDeleteLkpd(null); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-lkpd-title"><div className="confirm-icon">!</div><p className="eyebrow">KONFIRMASI TINDAKAN</p><h2 id="delete-lkpd-title">Hapus LKPD ini?</h2><p>LKPD <strong>{pendingDeleteLkpd.title}</strong>, soal, dan QR Code terkait akan dihapus.</p><div className="confirm-actions"><button className="button quiet" type="button" disabled={Boolean(deletingLkpdId)} onClick={() => setPendingDeleteLkpd(null)}>Batal</button><button className="button danger-solid" type="button" disabled={Boolean(deletingLkpdId)} onClick={() => void deleteLkpd(pendingDeleteLkpd)}>{deletingLkpdId ? "Menghapus…" : "Ya, hapus LKPD"}</button></div></section></div>}
      {pendingCloseLkpd && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingCloseLkpd(null); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="close-lkpd-title"><div className="confirm-icon">!</div><p className="eyebrow">TUTUP AKSES SISWA</p><h2 id="close-lkpd-title">Batalkan publikasi LKPD?</h2><p>LKPD <strong>{pendingCloseLkpd.title}</strong> tidak lagi dapat dibuka melalui QR Code. Soal dan hasil jawaban siswa tetap tersimpan.</p><div className="confirm-actions"><button className="button quiet" type="button" disabled={Boolean(closingLkpdId)} onClick={() => setPendingCloseLkpd(null)}>Batal</button><button className="button danger-solid" type="button" disabled={Boolean(closingLkpdId)} onClick={() => void closeLkpd(pendingCloseLkpd)}>{closingLkpdId ? "Menutup…" : "Ya, batalkan publikasi"}</button></div></section></div>}
      {showLink && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLink(false); }}><form className="confirm-modal media-modal" onSubmit={saveLink} aria-labelledby="link-title"><p className="eyebrow">TAUTAN EKSTERNAL</p><h2 id="link-title">Buat QR dari tautan</h2><p>Gunakan tautan video, audio, YouTube, atau sumber pembelajaran lain.</p><label className="upload-field">Judul tautan<input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Contoh: Video ekosistem" /></label><label className="upload-field">Tautan<input required type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://www.youtube.com/..." /></label>{mediaError && <p className="settings-message" role="alert">{mediaError}</p>}<div className="confirm-actions"><button className="button quiet" type="button" onClick={() => setShowLink(false)}>Batal</button><button className="button primary" type="submit" disabled={linkSaving}>{linkSaving ? "Menyimpan…" : "Simpan & buat QR"}</button></div></form></div>}
    </AdminInfoShell>
  );

  const [media, setMedia] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [label, setLabel] = useState("Media pembelajaran");
  const [copied, setCopied] = useState(false);
  const qrTarget = publicUrl.trim();
  const qrImage = qrTarget
    ? `https://quickchart.io/qr?size=360&margin=2&text=${encodeURIComponent(qrTarget)}`
    : "";

  useEffect(() => {
    return () => {
      if (mediaUrl.startsWith("blob:")) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);

  const chooseMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (mediaUrl.startsWith("blob:")) URL.revokeObjectURL(mediaUrl);
    setMedia(file);
    setMediaUrl(URL.createObjectURL(file));
    if (!label || label === "Media pembelajaran") {
      setLabel(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const copyLink = async () => {
    if (!qrTarget) return;
    try {
      await navigator.clipboard.writeText(qrTarget);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard can be unavailable in an insecure preview. */
    }
  };

  return (
    <AdminInfoShell active="qr" eyebrow="MEDIA INTERAKTIF" title="QR Code">
      <section className="qr-intro">
        <div>
          <p className="eyebrow">TAUTKAN MEDIA KE MODUL</p>
          <h2>QR Code media</h2>
          <p>
            Unggah video atau suara untuk dipratinjau, lalu masukkan tautan
            publik media agar QR dapat dipindai oleh siswa dari modul cetak.
          </p>
        </div>
        <span className="qr-badge">⌘ Siap dicetak</span>
      </section>

      <section className="qr-workspace">
        <form className="qr-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            Nama media
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Contoh: Video rantai makanan"
            />
          </label>
          <label className="qr-upload-control">
            <span>Video atau suara</span>
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={chooseMedia}
            />
            <strong>
              {media ? media.name : "Pilih berkas video atau suara"}
            </strong>
            <small>
              MP4, WebM, MP3, WAV, atau format media lain yang didukung
              perangkat.
            </small>
          </label>
          <label>
            Tautan publik media
            <input
              type="url"
              value={publicUrl}
              onChange={(event) => setPublicUrl(event.target.value)}
              placeholder="https://contoh.com/video-pembelajaran"
            />
            <small>
              QR hanya dapat dibuka siswa jika tautan ini dapat diakses publik.
            </small>
          </label>
          {mediaUrl && (
            <div className="qr-media-preview">
              <strong>Pratinjau lokal</strong>
              {media?.type.startsWith("video/") ? (
                <video controls src={mediaUrl} />
              ) : (
                <audio controls src={mediaUrl} />
              )}
            </div>
          )}
        </form>
        <aside className="qr-preview" aria-live="polite">
          <p className="eyebrow">QR UNTUK MODUL</p>
          {qrImage ? (
            <>
              <img src={qrImage} alt={`QR Code untuk ${label || "media"}`} />
              <strong>{label || "Media pembelajaran"}</strong>
              <small>{qrTarget}</small>
              <button
                type="button"
                className="button secondary"
                onClick={copyLink}
              >
                {copied ? "Tautan tersalin" : "Salin tautan"}
              </button>
            </>
          ) : (
            <div className="qr-empty">
              <span>⌘</span>
              <strong>Masukkan tautan publik</strong>
              <p>
                QR Code akan muncul di sini dan siap diunduh atau ditempel pada
                modul.
              </p>
            </div>
          )}
        </aside>
      </section>
    </AdminInfoShell>
  );
}

function DashboardRoute() {
  if (!supabase) {
    return <ErrorState title="Dashboard belum terhubung">Konfigurasi penyimpanan belum tersedia. Hubungkan Supabase untuk menampilkan data e-modul.</ErrorState>;
  }
  return <RealDashboardRoute />;
}

function FoundationBookProbe() {
  const location = useLocation();
  const staleProbeTriggered = useRef(false);
  const provisionTriggered = useRef(false);
  const idempotencyProbeTriggered = useRef(false);
  const idempotencyConcurrentProbeTriggered = useRef(false);
  const idempotencyRetentionProbeTriggered = useRef(false);
  const isolationTargetTriggered = useRef(false);
  const foreignWriteTriggered = useRef(false);
  const [books, setBooks] = useState<FoundationBook[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [casProbe, setCasProbe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (
      staleProbeTriggered.current ||
      new URLSearchParams(location.search).get("foundation") !== "stale-cas"
    )
      return;
    staleProbeTriggered.current = true;
    window.history.replaceState(null, "", location.pathname);
    void runStaleCasProbe();
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (
      idempotencyRetentionProbeTriggered.current ||
      new URLSearchParams(location.search).get("foundation") !==
        "idempotency-retention"
    )
      return;
    idempotencyRetentionProbeTriggered.current = true;
    window.history.replaceState(null, "", location.pathname);
    void runIdempotencyRetentionProbe();
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (
      idempotencyConcurrentProbeTriggered.current ||
      new URLSearchParams(location.search).get("foundation") !==
        "idempotency-concurrent"
    )
      return;
    idempotencyConcurrentProbeTriggered.current = true;
    window.history.replaceState(null, "", location.pathname);
    void runIdempotencyConcurrentProbe();
  }, [location.pathname, location.search]);
  useEffect(() => {
    const parameters = new URLSearchParams(location.search);
    const targetAdminId = parameters.get("target");
    if (
      provisionTriggered.current ||
      parameters.get("foundation") !== "provision-admin" ||
      !targetAdminId
    )
      return;
    provisionTriggered.current = true;
    window.history.replaceState(null, "", location.pathname);
    void provisionTestAdmin(
      targetAdminId,
      parameters.get("name") ?? "Admin uji kedua",
    );
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (
      idempotencyProbeTriggered.current ||
      new URLSearchParams(location.search).get("foundation") !==
        "idempotency-negative"
    )
      return;
    idempotencyProbeTriggered.current = true;
    window.history.replaceState(null, "", location.pathname);
    void runIdempotencyNegativeProbe();
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (
      isolationTargetTriggered.current ||
      new URLSearchParams(location.search).get("foundation") !==
        "isolation-target"
    )
      return;
    isolationTargetTriggered.current = true;
    window.history.replaceState(null, "", location.pathname);
    void createIsolationTarget();
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (
      foreignWriteTriggered.current ||
      new URLSearchParams(location.search).get("foundation") !== "foreign-write"
    )
      return;
    foreignWriteTriggered.current = true;
    window.history.replaceState(null, "", location.pathname);
    void runForeignWriteProbe();
  }, [location.pathname, location.search]);
  const load = async () => {
    if (!supabase) {
      setError("Konfigurasi Supabase belum tersedia.");
      return;
    }
    const { data, error: queryError } = await supabase
      .from("books")
      .select("id, title, draft_status, current_revision, updated_at")
      .order("created_at", { ascending: true });
    if (queryError) {
      setError("Buku foundation tidak dapat dibaca melalui policy saat ini.");
      return;
    }
    setBooks((data ?? []) as FoundationBook[]);
  };
  useEffect(() => {
    void load();
  }, []);
  const mutate = async (
    operation: "create" | "update_metadata" | "archive",
    book?: FoundationBook,
  ) => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const body =
      operation === "create"
        ? {
            operation,
            bookId: crypto.randomUUID(),
            draftId: crypto.randomUUID(),
            title: "Buku uji foundation dev",
          }
        : operation === "update_metadata"
          ? {
              operation,
              bookId: book?.id,
              expectedRevision: book?.current_revision,
              title: `${book?.title ?? "Buku"} · diperiksa`,
              draftMetadata: {
                source: "foundation-dev-check",
                updatedAt: new Date().toISOString(),
              },
            }
          : {
              operation,
              bookId: book?.id,
              expectedRevision: book?.current_revision,
            };
    const { error: invokeError } = await supabase.functions.invoke(
      "mutate-book-draft",
      { body },
    );
    if (invokeError) {
      const context = (invokeError as { context?: Response }).context;
      const status = context?.status;
      const payload = context
        ? ((await context
            .clone()
            .json()
            .catch(() => null)) as { error?: unknown } | null)
        : null;
      const code =
        typeof payload?.error === "string" ? payload.error : "unavailable";
      setError(
        `Operasi foundation ditolak atau belum dapat dijalankan (${status ?? "network"}: ${code}). Tidak ada detail sensitif ditampilkan.`,
      );
      setBusy(false);
      return;
    }
    await load();
    setBusy(false);
  };
  const runStaleCasProbe = async () => {
    if (!supabase) return;
    const client = supabase;
    setBusy(true);
    setError(null);
    setCasProbe(null);
    const bookId = crypto.randomUUID();
    const draftId = crypto.randomUUID();
    const title = "Buku uji konflik CAS";
    const created = await client.functions.invoke("mutate-book-draft", {
      body: { operation: "create", bookId, draftId, title },
    });
    if (created.error) {
      setError(
        "Buku konflik CAS tidak dapat dibuat. Tidak ada detail sensitif ditampilkan.",
      );
      setBusy(false);
      return;
    }
    const makeUpdate = (suffix: string) =>
      client.functions.invoke("mutate-book-draft", {
        body: {
          operation: "update_metadata",
          bookId,
          expectedRevision: 0,
          title: `${title} ${suffix}`,
          draftMetadata: { probe: "stale-cas", contender: suffix },
        },
      });
    const [first, second] = await Promise.all([
      makeUpdate("A"),
      makeUpdate("B"),
    ]);
    const successes = [first, second].filter((result) => !result.error).length;
    const rejections = [first, second].filter((result) =>
      Boolean(result.error),
    ).length;
    setCasProbe(
      successes === 1 && rejections === 1
        ? "PASS — satu update diterima dan satu revisi stale ditolak."
        : `FAIL — hasil konflik tidak sesuai: ${successes} diterima, ${rejections} ditolak.`,
    );
    await load();
    setBusy(false);
  };
  const provisionTestAdmin = async (
    targetAdminId: string,
    displayName = "Admin uji kedua",
  ) => {
    if (!supabase || !targetAdminId.trim()) return;
    setBusy(true);
    setError(null);
    setCasProbe(null);
    const { error: invokeError } = await supabase.functions.invoke(
      "provision-admin",
      {
        body: {
          targetAdminId: targetAdminId.trim(),
          displayName: displayName.trim() || null,
        },
      },
    );
    if (invokeError) {
      setError(
        "Provisioning admin uji ditolak atau belum dapat dijalankan. Tidak ada detail sensitif ditampilkan.",
      );
      setBusy(false);
      return;
    }
    setCasProbe(
      "PASS — admin uji kedua berhasil diprovision; masuk dengan akun itu untuk uji isolasi.",
    );
    setBusy(false);
  };
  const runIdempotencyNegativeProbe = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setCasProbe(null);
    const bookId = crypto.randomUUID();
    const draftId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const body = {
      operation: "create",
      bookId,
      draftId,
      title: "Buku uji replay idempotensi",
      idempotencyKey,
    };
    const first = await supabase.functions.invoke("mutate-book-draft", {
      body,
    });
    const second = await supabase.functions.invoke("mutate-book-draft", {
      body,
    });
    const firstAccepted = !first.error;
    const secondAccepted = !second.error;
    const firstData = first.data as {
      bookId?: string;
      draftId?: string;
      revision?: number;
    } | null;
    const secondData = second.data as {
      bookId?: string;
      draftId?: string;
      revision?: number;
    } | null;
    const sameResult =
      firstAccepted &&
      secondAccepted &&
      firstData?.bookId === secondData?.bookId &&
      firstData?.draftId === secondData?.draftId &&
      firstData?.revision === secondData?.revision;
    setCasProbe(
      sameResult
        ? "PASS — replay idempoten mengembalikan hasil operasi yang sama tanpa duplikasi operasi."
        : `HASIL TIDAK TERDUGA — request pertama ${firstAccepted ? "diterima" : "ditolak"}, replay ${secondAccepted ? "diterima" : "ditolak"}.`,
    );
    await load();
    setBusy(false);
  };
  const runIdempotencyConcurrentProbe = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setCasProbe(null);
    const bookId = crypto.randomUUID();
    const draftId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const body = {
      operation: "create",
      bookId,
      draftId,
      title: "Buku uji concurrency idempotensi",
      idempotencyKey,
    };
    const [first, second] = await Promise.all([
      supabase.functions.invoke("mutate-book-draft", { body }),
      supabase.functions.invoke("mutate-book-draft", { body }),
    ]);
    const firstData = first.data as {
      bookId?: string;
      draftId?: string;
      revision?: number;
    } | null;
    const secondData = second.data as {
      bookId?: string;
      draftId?: string;
      revision?: number;
    } | null;
    const sameResult =
      !first.error &&
      !second.error &&
      firstData?.bookId === secondData?.bookId &&
      firstData?.draftId === secondData?.draftId &&
      firstData?.revision === secondData?.revision;
    setCasProbe(
      sameResult
        ? "PASS — dua request paralel menghasilkan respons identik; klaim idempotensi terserialisasi."
        : `FAIL — hasil paralel tidak identik: request pertama ${first.error ? "ditolak" : "diterima"}, request kedua ${second.error ? "ditolak" : "diterima"}.`,
    );
    await load();
    setBusy(false);
  };
  const runIdempotencyRetentionProbe = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setCasProbe(null);
    const bookId = crypto.randomUUID();
    const draftId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const body = {
      operation: "create",
      bookId,
      draftId,
      title: "Buku uji retensi idempotensi",
      idempotencyKey,
    };
    const first = await supabase.functions.invoke("mutate-book-draft", {
      body,
    });
    const replay = await supabase.functions.invoke("mutate-book-draft", {
      body,
    });
    const mismatch = await supabase.functions.invoke("mutate-book-draft", {
      body: { ...body, title: "Payload berbeda" },
    });
    const firstResult = first.data as {
      status?: string;
      bookId?: string;
      draftId?: string;
      revision?: number;
    } | null;
    const replayResult = replay.data as {
      status?: string;
      bookId?: string;
      draftId?: string;
      revision?: number;
    } | null;
    const sameReplay =
      !first.error &&
      !replay.error &&
      firstResult?.status === replayResult?.status &&
      firstResult?.bookId === replayResult?.bookId &&
      firstResult?.draftId === replayResult?.draftId &&
      firstResult?.revision === replayResult?.revision;
    const mismatchRejected = Boolean(mismatch.error);
    setCasProbe(
      sameReplay && mismatchRejected
        ? "PASS — replay aktif identik, payload berbeda ditolak; retensi lifecycle tetap belum membuktikan expiry/cleanup."
        : `HASIL TIDAK LENGKAP — replay ${sameReplay ? "PASS" : "FAIL"}, mismatch ${mismatchRejected ? "ditolak" : "diterima"}.`,
    );
    await load();
    setBusy(false);
  };
  const createIsolationTarget = async () => {
    if (!supabase) return;
    const bookId = crypto.randomUUID();
    setBusy(true);
    setError(null);
    setCasProbe(null);
    const { error: invokeError } = await supabase.functions.invoke(
      "mutate-book-draft",
      {
        body: {
          operation: "create",
          bookId,
          draftId: crypto.randomUUID(),
          title: "Buku uji isolasi lintas admin",
        },
      },
    );
    if (invokeError) {
      setError(
        "Target uji isolasi tidak dapat dibuat. Tidak ada detail sensitif ditampilkan.",
      );
      setBusy(false);
      return;
    }
    window.localStorage.setItem(
      "foundation-isolation-target",
      JSON.stringify({ bookId, expectedRevision: 0 }),
    );
    setCasProbe(
      "PASS — target uji isolasi dibuat untuk admin aktif; lanjutkan dengan akun admin kedua.",
    );
    await load();
    setBusy(false);
  };
  const runForeignWriteProbe = async () => {
    if (!supabase) return;
    const stored = window.localStorage.getItem("foundation-isolation-target");
    let target: { bookId?: unknown; expectedRevision?: unknown } | null = null;
    try {
      target = stored
        ? (JSON.parse(stored) as {
            bookId?: unknown;
            expectedRevision?: unknown;
          })
        : null;
    } catch {
      target = null;
    }
    if (
      typeof target?.bookId !== "string" ||
      typeof target.expectedRevision !== "number"
    ) {
      setError(
        "Target uji isolasi tidak tersedia pada browser ini. Jalankan tahap target dengan admin pertama terlebih dahulu.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setCasProbe(null);
    const { error: invokeError } = await supabase.functions.invoke(
      "mutate-book-draft",
      {
        body: {
          operation: "update_metadata",
          bookId: target.bookId,
          expectedRevision: target.expectedRevision,
          title: "Mutasi lintas admin tidak sah",
          draftMetadata: { probe: "foreign-write" },
        },
      },
    );
    setCasProbe(
      invokeError
        ? "PASS — mutasi buku milik admin lain ditolak oleh batas server."
        : "FAIL — mutasi lintas admin tidak semestinya diterima.",
    );
    await load();
    setBusy(false);
  };
  return (
    <section className="panel" aria-labelledby="foundation-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SUPABASE DEV</p>
          <h2 id="foundation-title">Pemeriksaan buku foundation</h2>
          <p>
            Hanya data milik admin aktif. Tombol ini memanggil Edge Function
            terotentikasi, bukan mutasi browser langsung.
          </p>
        </div>
      </div>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {casProbe && (
        <p
          className={casProbe.startsWith("PASS") ? "notice" : "auth-error"}
          role="status"
        >
          {casProbe}
        </p>
      )}
      <div className="action-row">
        <button
          className="button quiet compact"
          disabled={busy}
          onClick={() => void runStaleCasProbe}
        >
          {busy ? "Memproses…" : "Uji konflik CAS stale"}
        </button>
        <p className="helper">
          Membuat satu buku sintetis, lalu dua update paralel dengan revisi awal
          yang sama.
        </p>
      </div>
      {books === null ? (
        <p className="helper">Memeriksa akses RLSâ€¦</p>
      ) : books.length === 0 ? (
        <div className="action-row">
          <p className="helper">
            Belum ada buku foundation. Buat satu data sintetis untuk uji
            nonproduksi.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void mutate("create")}
          >
            {busy ? "Memprosesâ€¦" : "Buat buku uji"}
          </button>
        </div>
      ) : (
        books.map((book) => (
          <div className="book-row" key={book.id}>
            <div>
              <strong>{book.title}</strong>
              <span>
                Status {book.draft_status} Â· revisi {book.current_revision}
              </span>
            </div>
            <div className="action-row">
              {book.draft_status === "draft" && (
                <>
                  <button
                    className="button compact"
                    disabled={busy}
                    onClick={() => void mutate("update_metadata", book)}
                  >
                    Uji simpan CAS
                  </button>
                  <button
                    className="button quiet compact"
                    disabled={busy}
                    onClick={() => void mutate("archive", book)}
                  >
                    Arsipkan uji
                  </button>
                </>
              )}
              <button
                className="button quiet compact"
                disabled={busy}
                onClick={() => void load()}
              >
                Muat ulang
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function DashboardFrame({
  books: sourceBooks,
  onCreate,
  creating = false,
}: {
  books: Array<{
    id: string;
    title: string;
    status: string;
    meta: string;
    href: string;
  }>;
  onCreate?: () => void;
  creating?: boolean;
}) {
  useEffect(() => {
    const updateName = () => {
      const name =
        localStorage.getItem("flipbook-studio-display-name") ||
        "Editor Redaksi";
      const email =
        localStorage.getItem("flipbook-studio-profile-email") || "admin@flipbook.id";
      const heading = document.querySelector(".dashboard-hero h1");
      if (heading) heading.textContent = `Selamat berkarya, ${name} 👋`;
      const profileName = document.querySelector(".dashboard-profile strong");
      const profileEmail = document.querySelector(".dashboard-profile small");
      if (profileName) profileName.textContent = name;
      if (profileEmail) profileEmail.textContent = email;
    };
    updateName();
    window.addEventListener("flipbook-profile-updated", updateName);
    return () =>
      window.removeEventListener("flipbook-profile-updated", updateName);
  }, []);
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (event: Event) => {
      const target = event.target as HTMLElement;
      const card = target.closest(".project-card");
      if (card?.textContent?.includes("Mulai Impor PDF")) {
        event.preventDefault();
        navigate("/admin/collection?upload=1");
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [navigate]);
  const [menuOpen, setMenuOpen] = useState(false);
  const books = sourceBooks;
  const active = books.filter((book) => book.status === "Terbit").length;
  const recentBooks = books.slice(0, 3);
  const draftCount = books.filter((book) => book.status === "Draf").length;
  return (
    <div className="admin-dashboard-page admin-layout">
      <aside className={`admin-nav${menuOpen ? " is-open" : ""}`}>
        <div className="admin-nav-brand">
          <span className="brand-mark">F</span>
          <strong>
            Flipbook
            <br />
            Studio
          </strong>
        </div>
        <button
          className="admin-menu-toggle"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="workspace-switcher">
          <small>Ruang Kerja</small>
          <strong>Koleksi Publikasi</strong>
          <span>⌃⌄</span>
        </div>
        <Link className="is-current" to="/admin">
          <span className="nav-icon" aria-hidden="true">
            <LayoutDashboard />
          </span>
          <span>Dashboard</span>
        </Link>
        <Link to="/admin/qr-code">
          <span className="nav-icon" aria-hidden="true">
            <QrCode />
          </span>
          <span>QR Code</span>
        </Link>
        <Link to="/admin/collection">
          <span className="nav-icon" aria-hidden="true">
            <BookOpen />
          </span>
          <span>Koleksi</span>
        </Link>
        <Link to="/admin/activity">
          <span className="nav-icon" aria-hidden="true">
            <ListChecks />
          </span>
          <span>Aktivitas</span>
        </Link>
        <Link to="/admin/settings">
          <span className="nav-icon" aria-hidden="true">
            <Settings />
          </span>
          <span>Pengaturan</span>
        </Link>
        <Link to="/admin/about">
          <span className="nav-icon" aria-hidden="true">
            <CircleHelp />
          </span>
          <span>Tentang Kami</span>
        </Link>
        <div className="storage-card">
          <strong>Penyimpanan Cloud</strong>
            <span>Informasi penyedia telemetri belum tersedia</span>
          <div className="storage-bar">
            <i />
          </div>
        </div>
      </aside>
      <section className="workspace">
        <header className="dashboard-header">
          <div className="dashboard-search">
            ⌕ <span>Cari flipbook, majalah, edisi...</span>
          </div>
          <div className="dashboard-profile">
            <span className="notification">♧</span>
            <span className="avatar">ER</span>
            <div>
              <strong>Editor Redaksi</strong>
              <small>admin@flipbook.id</small>
            </div>
          </div>
        </header>
        <div className="dashboard-hero">
          <div>
            <p className="workspace-badge">
              ● Ruang Kreasi Flipbook <em>Siap untuk berkarya</em>
            </p>
            <h1>
              Selamat berkarya, Sarah Amanda <span>👋</span>
            </h1>
            <p>
              Buat, susun, dan terbitkan flipbook interaktif yang menarik untuk
              dibagikan kepada pembaca Anda.
            </p>
          </div>
          <div className="dashboard-actions">
            <Link
              className="button quiet"
              to="/admin/books/book-ekosistem/editor"
            >
              ⇧ &nbsp;Unggah PDF Cepat
            </Link>
            <button
              className="button primary"
              disabled={creating}
              onClick={onCreate}
            >
              {creating ? "Membuat…" : "⊕ &nbsp; Buat Flipbook Baru"}
            </button>
          </div>
        </div>
        <div className="stats-grid reference-stats">
          <Stat
            label="Total Flipbook Aktif"
            value={String(active)}
            detail="Publikasi"
          />
          <Stat
            label="Total Pembaca & Tayangan"
            value="—"
            detail="Telemetry belum tersedia"
          />
          <Stat label="Interaksi & Hotspot" value="—" detail="Belum ada data" />
          <Stat
            label="Kapasitas Cloud"
            value="—"
            detail="Provider belum tersedia"
          />
        </div>
        {false && <section className="project-section">
          <div className="section-title">
            <h2>🚀 Mulai Proyek Baru</h2>
            <span>Pilih alur kerja sesuai tipe materi publikasi Anda</span>
          </div>
          <div className="project-grid">
            <Link
              className="project-card"
              to="/admin/books/book-ekosistem/editor"
            >
              <b className="project-pdf-icon" aria-label="Dokumen PDF">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 2.75h8l4 4v14.5H6z" />
                  <path d="M14 2.75v4h4M8.5 14h7M8.5 17h5" />
                </svg>
              </b>
              <h3>Konversi PDF ke Flipbook</h3>
              <p>
                Impor berkas dokumen majalah, brosur, atau e-book menjadi
                pengalaman digital.
              </p>
              <strong>Mulai Impor PDF →</strong>
            </Link>
            <Link
              className="project-card"
              to="/admin/books/book-ekosistem/editor"
            >
              <b>▦</b>
              <h3>Template Majalah & Katalog</h3>
              <p>Mulai dari kurasi layout editorial dengan tipografi modern.</p>
              <strong>Eksplor Galeri Template →</strong>
            </Link>
            <Link
              className="project-card"
              to="/admin/books/book-ekosistem/editor"
            >
              <b>▷</b>
              <h3>Presentasi Interaktif</h3>
              <p>Sisipkan audio, hotspot, dan interaksi halaman.</p>
              <strong>Buka Kanvas Interaktif →</strong>
            </Link>
          </div>
        </section>}
        <div className="publication-layout">
          <section className="panel publications-panel" id="books">
            <div className="panel-heading">
              <div>
                <h2>Publikasi Flipbook Terbaru</h2>
                <p>Daftar publikasi aktif dan draf editorial</p>
              </div>
              <Link className="panel-link" to="/admin/collection">Lihat koleksi →</Link>
              <div className="publication-tabs">
                <span className="active">Semua ({books.length})</span>
                <span>Live ({active})</span>
                <span>Draf ({draftCount})</span>
              </div>
            </div>
            {books.length === 0 ? (
              <EmptyState title="Belum ada buku">
                Buat buku baru untuk memulai.
              </EmptyState>
            ) : (
              recentBooks.map((book) => (
                <div className="book-row" key={book.id}>
                  <div className="book-thumb">FS</div>
                  <div>
                    <strong>{book.title}</strong>
                    <span>{book.meta}</span>
                  </div>
                  <span
                    className={`status ${book.status === "Draf" ? "draft" : "neutral"}`}
                  >
                    {book.status}
                  </span>
                  <Link className="button compact" to={book.href}>
                    Edit
                  </Link>
                </div>
              ))
            )}
          </section>
          <aside className="analytics-stack">
            <div className="analytics-card">
              <h3>Statistik Pembaca Harian</h3>
              <strong>—</strong>
              <p>Data telemetry belum tersedia.</p>
            </div>
            <div className="analytics-card">
              <h3>Perangkat Pembaca</h3>
              <p>Belum ada data pembaca.</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function LegacyDashboardRoute() {
  if (supabase) return <RealDashboardRoute />;
  const [resource, setResource] = useState<Resource<MockBook[]>>({
    status: "loading",
  });
  useEffect(() => {
    mockBookRepository
      .listAdminBooks()
      .then((data) => setResource({ status: "ready", data }))
      .catch(() => setResource({ status: "error" }));
  }, []);
  if (resource.status === "loading")
    return <LoadingState label="Memuat dashboard mock…" />;
  if (resource.status === "error")
    return (
      <ErrorState title="Dashboard tidak tersedia">
        Repository mock gagal merespons.
      </ErrorState>
    );
  if (resource.status !== "ready") return null;
  return (
    <DashboardFrame
      books={resource.data.map((book) => ({
        id: book.id,
        title: book.title,
        status: book.publicationStatus,
        meta: `Draf revisi ${book.draftRevision} · ${book.pages.length} halaman`,
        href: `/admin/books/${book.id}/editor`,
      }))}
    />
  );
  return (
    <div className="admin-dashboard-page admin-layout">
      <aside className="admin-nav">
        <div className="admin-nav-brand">
          <span className="brand-mark">F</span>
          <strong>E-Modul Flipbook</strong>
        </div>
        <div className="workspace-switcher">
          KOLEKSI PUBLIKASI<span>⌄</span>
        </div>
        <p className="admin-nav-label">WORKSPACE</p>
        <Link className="is-current" to="/admin">
          ⌂ <span>Dashboard</span>
        </Link>
        <a href="#books">
          ▣ <span>Koleksi Flipbook</span>
        </a>
        <Link to="/admin/books/book-ekosistem/editor">
          ✦ <span>Editor Interaktif</span>
        </Link>
        <a href="#settings">
          ⚙ <span>Pengaturan</span>
        </a>
        <a href="#about">
          ⓘ <span>Tentang Kami</span>
        </a>
        <div className="storage-card">
          <strong>Penyimpanan</strong>
          <span>Telemetry provider belum tersedia</span>
          <div className="storage-bar">
            <i />
          </div>
        </div>
      </aside>
      <section className="workspace">
        <nav className="breadcrumbs">Dashboard</nav>
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">WORKSPACE ADMINISTRATOR</p>
            <h1>Selamat datang kembali 👋</h1>
            <p>Kelola publikasi dan pantau pengalaman pembaca Anda.</p>
          </div>
          <div className="dashboard-actions">
            <Link
              className="button quiet"
              to="/admin/books/book-ekosistem/editor"
            >
              Unggah PDF Cepat
            </Link>
            <Link
              className="button primary"
              to="/admin/books/book-ekosistem/editor"
            >
              + Buat Flipbook Baru
            </Link>
          </div>
        </div>
        <div className="stats-grid">
          <Stat
            label="Buku draf"
            value={String(
              resource.data.filter((book) => book.publicationStatus === "Draf")
                .length,
            )}
            detail="Data mock"
          />
          <Stat
            label="Versi terbit"
            value={String(
              resource.data.filter(
                (book) => book.publicationStatus === "Terbit",
              ).length,
            )}
            detail="Tanpa data aktual"
          />
          <Stat
            label="Pembaca & tayangan"
            value="—"
            detail="Belum ada telemetry"
          />
          <Stat
            label="Penyimpanan"
            value="—"
            detail="Membutuhkan telemetry provider"
          />
        </div>
        <section className="panel" id="books">
          <div className="panel-heading">
            <div>
              <h2>Daftar buku</h2>
              <p>Data dari repository mock.</p>
            </div>
            <a href="#books" className="panel-link">
              Lihat semua →
            </a>
          </div>
          {resource.data.length === 0 ? (
            <EmptyState title="Belum ada buku">
              Buat buku saat backend siap.
            </EmptyState>
          ) : (
            resource.data.map((book) => (
              <div className="book-row" key={book.id}>
                <div className="book-thumb">{book.subject}</div>
                <div>
                  <strong>{book.title}</strong>
                  <span>
                    Draf revisi {book.draftRevision} · {book.pages.length}{" "}
                    halaman
                  </span>
                </div>
                <span
                  className={`status ${book.publicationStatus === "Draf" ? "draft" : "neutral"}`}
                >
                  {book.publicationStatus}
                </span>
                <Link
                  className="button compact"
                  to={`/admin/books/${book.id}/editor`}
                >
                  Edit
                </Link>
              </div>
            ))
          )}
        </section>
      </section>
    </div>
  );
}

function RealDashboardRoute() {
  const [books, setBooks] = useState<FoundationBook[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const refresh = () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    void supabase
      .from("books")
      .select("id, title, draft_status, current_revision, updated_at")
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (queryError)
          setError("Daftar buku tidak dapat dimuat melalui policy aktif.");
        else setBooks((data ?? []) as FoundationBook[]);
        setLoading(false);
      });
  };
  useEffect(() => {
    refresh();
  }, []);
  const createBook = async () => {
    if (!supabase) return;
    setCreating(true);
    setError(null);
    const { error: invokeError } = await supabase.functions.invoke(
      "mutate-book-draft",
      {
        body: {
          operation: "create",
          bookId: crypto.randomUUID(),
          draftId: crypto.randomUUID(),
          title: "Buku baru",
        },
      },
    );
    if (invokeError)
      setError("Buku baru tidak dapat dibuat. Periksa sesi admin dan policy.");
    else refresh();
    setCreating(false);
  };
  if (loading) return <LoadingState label="Memuat koleksi flipbook…" />;
  if (error)
    return <ErrorState title="Dashboard tidak tersedia">{error}<button className="button primary" onClick={refresh}>Coba lagi</button></ErrorState>;
  return (
    <DashboardFrame
      books={books.map((book) => ({
        id: book.id,
        title: book.title,
        status: book.draft_status === "draft" ? "Draf" : "Arsip",
        meta: `Revisi ${book.current_revision} · diperbarui ${new Date(book.updated_at).toLocaleString("id-ID")}`,
        href: `/admin/books/${book.id}/editor`,
      }))}
      onCreate={() => void createBook()}
      creating={creating}
    />
  );
  return (
    <div className="admin-dashboard-page admin-layout">
      <aside className="admin-nav">
        <div className="admin-nav-brand">
          <span className="brand-mark">F</span>
          <strong>E-Modul Flipbook</strong>
        </div>
        <div className="workspace-switcher">
          KOLEKSI PUBLIKASI<span>⌄</span>
        </div>
        <p className="admin-nav-label">WORKSPACE</p>
        <Link className="is-current" to="/admin">
          ⌂ <span>Dashboard</span>
        </Link>
        <Link to="/admin#books">
          ▣ <span>Koleksi Flipbook</span>
        </Link>
        <Link to="/admin/books/book-ekosistem/editor">
          ✦ <span>Editor Interaktif</span>
        </Link>
        <Link to="/admin#settings">
          ⚙ <span>Pengaturan</span>
        </Link>
        <a href="#about">
          ⓘ <span>Tentang Kami</span>
        </a>
        <div className="storage-card">
          <strong>Penyimpanan</strong>
          <span>Telemetry provider belum tersedia</span>
          <div className="storage-bar">
            <i />
          </div>
        </div>
      </aside>
      <section className="workspace">
        <nav className="breadcrumbs">Dashboard</nav>
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">WORKSPACE ADMINISTRATOR · DATA NYATA</p>
            <h1>Selamat datang kembali 👋</h1>
            <p>Buku dimuat dari Supabase dev.</p>
          </div>
          <div className="dashboard-actions">
            <Link
              className="button quiet"
              to="/admin/books/book-ekosistem/editor"
            >
              Unggah PDF Cepat
            </Link>
            <button
              className="button primary"
              disabled={creating}
              onClick={() => void createBook()}
            >
              {creating ? "Membuat…" : "+ Buat Flipbook Baru"}
            </button>
          </div>
        </div>
        <div className="stats-grid">
          <Stat
            label="Buku draf"
            value={String(
              books.filter((book) => book.draft_status === "draft").length,
            )}
            detail="Supabase dev"
          />
          <Stat
            label="Buku diarsipkan"
            value={String(
              books.filter((book) => book.draft_status === "archived").length,
            )}
            detail="Lifecycle foundation"
          />
          <Stat
            label="Pembaca & tayangan"
            value="—"
            detail="Belum ada telemetry"
          />
          <Stat
            label="Penyimpanan"
            value="—"
            detail="Telemetry belum tersedia"
          />
        </div>
        <section className="panel" id="books">
          <div className="panel-heading">
            <div>
              <h2>Daftar buku</h2>
              <p>Data persisten administrator aktif.</p>
            </div>
            <a href="#books" className="panel-link">
              Lihat semua →
            </a>
          </div>
          {books.length === 0 ? (
            <EmptyState title="Belum ada buku">
              Klik “Buat buku” untuk membuat draf di Supabase dev.
            </EmptyState>
          ) : (
            books.map((book) => (
              <div className="book-row" key={book.id}>
                <div className="book-thumb">FS</div>
                <div>
                  <strong>{book.title}</strong>
                  <span>
                    Revisi {book.current_revision} · diperbarui{" "}
                    {new Date(book.updated_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <span
                  className={`status ${book.draft_status === "draft" ? "draft" : "neutral"}`}
                >
                  {book.draft_status === "draft" ? "Draf" : "Arsip"}
                </span>
                {book.draft_status === "draft" && (
                  <Link
                    className="button compact"
                    to={`/admin/books/${book.id}/editor`}
                  >
                    Edit
                  </Link>
                )}
              </div>
            ))
          )}
        </section>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function CollectionRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBooks = [
    {
      title: "Peran Manusia dalam Ekosistem",
      meta: "Terbit · 3 halaman",
      status: "Terbit",
      href: "/admin/books/book-ekosistem/editor",
    },
    {
      title: "Jelajah Samudra",
      meta: "Draf · siap disusun",
      status: "Draf",
      href: "/admin/books/book-ekosistem/editor",
    },
  ];
  const [books, setBooks] = useState(() => {
    try {
      const saved = window.localStorage.getItem(
        "flipbook-studio-collection-books",
      );
      if (saved) {
        const parsed = JSON.parse(saved) as typeof initialBooks;
        const cleaned = parsed.filter(
          (book) =>
            !/^Buku (uji|baru)|^Buku uji|^Jelajah Samudra$|^Peran Manusia dalam Ekosistem$/.test(
              book.title,
            ),
        );
        return cleaned.map((book) => {
          const legacyFile =
            new URLSearchParams(book.href.split("?")[1] ?? "").get("file") ??
            undefined;
          return {
            ...book,
            meta: book.meta.split(" · diimpor")[0],
            href: bookEditorHref(book.title, legacyFile),
          };
        });
      }
    } catch {
      /* gunakan data awal bila penyimpanan lokal tidak tersedia */
    }
    return [];
  });
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingPublish, setPendingPublish] = useState<(typeof books)[number] | null>(null);
  const [shareBook, setShareBook] = useState<(typeof books)[number] | null>(null);
  const [shareCopied, setShareCopied] = useState<"link" | "qr" | "">("");
  const [publishing, setPublishing] = useState(false);
  const [publicationAction, setPublicationAction] = useState<"publish" | "unpublish" | null>(null);
  const [collectionError, setCollectionError] = useState("");
  const [showCreateChoice, setShowCreateChoice] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(
    searchParams.get("upload") === "1",
  );
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const publicationKey = (title: string) => `flipbook-studio-publication-status-${bookSlug(title)}`;
  const [publicationStatuses, setPublicationStatuses] = useState<Record<string, "Draf" | "Terpublikasi">>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("flipbook-studio-collection-publications") ?? "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(
        "flipbook-studio-collection-books",
        JSON.stringify(books),
      );
      window.dispatchEvent(new Event("flipbook-collection-updated"));
    } catch {
      /* optional local persistence */
    }
  }, [books]);
  useEffect(() => {
    try {
      window.localStorage.setItem("flipbook-studio-collection-publications", JSON.stringify(publicationStatuses));
      window.dispatchEvent(new Event("flipbook-collection-updated"));
    } catch {
      /* optional local persistence */
    }
  }, [publicationStatuses]);
  const getPublicationStatus = (book: (typeof books)[number]) =>
    publicationStatuses[book.title] ?? (book.status === "Terbit" ? "Terpublikasi" : "Draf");
  const setPublicationStatus = (book: (typeof books)[number], status: "Draf" | "Terpublikasi") => {
    setPublicationStatuses((current) => ({ ...current, [book.title]: status }));
    try {
      window.localStorage.setItem(publicationKey(book.title), status);
    } catch {
      /* status tetap berlaku pada sesi ini */
    }
  };
  const createPublicationSnapshot = async (collectionBook: (typeof books)[number]) => {
    let pages = [{ id: `cover-${bookSlug(collectionBook.title)}`, label: collectionBook.title, kind: "Sampul", body: "" }];
    let blocks: Record<string, unknown> = {};
    let canvasHeader = "E-MODUL INTERAKTIF";
    try {
      const storageKey = `flipbook-studio-interactive-pages-module-${bookSlug(collectionBook.title)}`;
      const savedDocument = window.localStorage.getItem(`${storageKey}-document`);
      const documentState = savedDocument ? JSON.parse(savedDocument) : null;
      if (documentState?.pages && Array.isArray(documentState.pages)) {
        pages = documentState.pages;
        blocks = documentState.blocks && typeof documentState.blocks === "object" ? documentState.blocks : {};
        canvasHeader = typeof documentState.canvasHeader === "string" ? documentState.canvasHeader : canvasHeader;
      } else {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) pages = JSON.parse(saved);
      }
      const indexedDocument = await readEditorDocument(storageKey);
      if (indexedDocument?.pages && Array.isArray(indexedDocument.pages)) {
        pages = indexedDocument.pages;
        blocks = indexedDocument.blocks && typeof indexedDocument.blocks === "object" ? indexedDocument.blocks : blocks;
        canvasHeader = typeof indexedDocument.canvasHeader === "string" ? indexedDocument.canvasHeader : canvasHeader;
      }
    } catch {
      /* gunakan halaman dasar bila data editor belum tersedia */
    }
    return {
      book: { title: collectionBook.title }, pages, blocks,
      canvasHeader, title: pages[0]?.label ?? collectionBook.title, selectedIndex: 0,
    };
  };
  const previewBook = (collectionBook: (typeof books)[number]) => {
    navigate(`/admin/preview/${encodeURIComponent(collectionBook.title)}`);
  };
  // QR selalu mengarah ke ruang baca siswa, bukan halaman pratinjau/admin.
  const publicFlipbookLink = (book: (typeof books)[number]) =>
    `${window.location.origin}/siswa/flipbook/${bookSlug(book.title)}`;
  const publishBook = async (book: (typeof books)[number]) => {
    if (!supabase) return;
    setPublishing(true); setPublicationAction("publish"); setCollectionError("");
    try {
      const snapshot = await createPublicationSnapshot(book);
      const { error } = await supabase.functions.invoke("publish-flipbook", { body: { slug: bookSlug(book.title), title: book.title, snapshot } });
      if (error) { setCollectionError("Publikasi gagal. Periksa koneksi dan pastikan draf dapat dipublikasikan."); return; }
      setPublicationStatus(book, "Terpublikasi");
      setPendingPublish(null);
      setShareBook(book);
    } catch { setCollectionError("Publikasi gagal. Periksa koneksi dan pastikan draf dapat dipublikasikan."); }
    finally { setPublishing(false); setPublicationAction(null); }
  };
  const unpublishBook = async (book: (typeof books)[number]) => {
    if (!supabase) return;
    setPublishing(true); setPublicationAction("unpublish"); setCollectionError("");
    try {
      const { error } = await supabase.functions.invoke("unpublish-flipbook", { body: { slug: bookSlug(book.title) } });
      if (error) { setCollectionError("Pembatalan publikasi gagal. Konten publik tetap aktif."); return; }
      setPublicationStatus(book, "Draf");
    } catch { setCollectionError("Pembatalan publikasi gagal. Konten publik tetap aktif."); }
    finally { setPublishing(false); setPublicationAction(null); }
  };
  const copyShareLink = async (book: (typeof books)[number]) => {
    try {
      await navigator.clipboard?.writeText(publicFlipbookLink(book));
      setShareCopied("link");
    } catch {
      setShareCopied("");
      setCollectionError("Tautan tidak dapat disalin. Coba salin dari kolom tautan.");
      return;
    }
    window.setTimeout(() => setShareCopied(""), 2200);
  };
  const copyShareQr = async (book: (typeof books)[number]) => {
    const link = publicFlipbookLink(book);
    try {
      const dataUrl = await QRCode.toDataURL(link, { width: 480, margin: 1, errorCorrectionLevel: "M" });
      const blob = await (await fetch(dataUrl)).blob();
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("clipboard-image-unsupported");
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setShareCopied("qr");
    } catch {
      setShareCopied("");
      setCollectionError("Gambar QR tidak dapat disalin di browser ini. Coba browser lain atau gunakan tangkapan layar.");
      return;
    }
    window.setTimeout(() => setShareCopied(""), 2200);
  };
  const removeBook = async () => {
    if (pendingDelete) {
      const book = books.find((item) => item.title === pendingDelete);
      if (book && getPublicationStatus(book) === "Terpublikasi") await unpublishBook(book);
      deletePdfBlob(pendingDelete);
      uploadedPdfUrls.delete(pendingDelete);
      try { window.localStorage.removeItem(`flipbook-studio-pdf-${pendingDelete}`); } catch { /* penyimpanan lokal tidak tersedia */ }
      setBooks((current) => current.filter((item) => item.title !== pendingDelete));
    }
    setPendingDelete(null);
  };
  const createFromPdf = (event: FormEvent) => {
    event.preventDefault();
    if (!uploadFile) return;
    const file = uploadFile;
    const title = uploadTitle.trim() || file.name.replace(/\.pdf$/i, "");
    uploadedPdfUrls.set(title, URL.createObjectURL(file));
    savePdfBlob(title, file);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        window.localStorage.setItem(
          `flipbook-studio-pdf-${title}`,
          String(reader.result),
        );
      } catch {
        /* object URL tetap dipakai selama sesi */
      }
      setBooks((current) => [
        {
          title,
          meta: "Draf",
          status: "Draf",
          href: bookEditorHref(title, file.name),
        },
        ...current,
      ]);
      setUploadTitle("");
      setUploadFile(null);
      setShowUploadModal(false);
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="admin-dashboard-page admin-layout">
      <aside className="admin-nav">
        <div className="admin-nav-brand">
          <span className="brand-mark">F</span>
          <strong>E-Modul Flipbook</strong>
        </div>
        <div className="workspace-switcher">
          KOLEKSI PUBLIKASI<span>⌄</span>
        </div>
        <p className="admin-nav-label">WORKSPACE</p>
        <Link to="/admin">
          <span className="nav-icon" aria-hidden="true">
            <LayoutDashboard />
          </span>
          <span>Dashboard</span>
        </Link>
        <Link to="/admin/qr-code">
          <span className="nav-icon" aria-hidden="true">
            <QrCode />
          </span>
          <span>QR Code</span>
        </Link>
        <Link className="is-current" to="/admin/collection">
          <span className="nav-icon" aria-hidden="true">
            <BookOpen />
          </span>
          <span>Koleksi</span>
        </Link>
        <Link to="/admin/activity">
          <span className="nav-icon" aria-hidden="true">
            <ListChecks />
          </span>
          <span>Aktivitas</span>
        </Link>
        <Link to="/admin/settings">
          <span className="nav-icon" aria-hidden="true">
            <Settings />
          </span>
          <span>Pengaturan</span>
        </Link>
        <Link to="/admin/about">
          <span className="nav-icon" aria-hidden="true">
            <CircleHelp />
          </span>
          <span>Tentang Kami</span>
        </Link>
        <div className="storage-card">
          <strong>Penyimpanan</strong>
          <span>Telemetry provider belum tersedia</span>
          <div className="storage-bar">
            <i />
          </div>
        </div>
      </aside>
      <section className="workspace">
        <header className="dashboard-header">
          <div className="dashboard-search">
            ⌕ <span>Cari flipbook, majalah, edisi...</span>
          </div>
          <div className="dashboard-profile">
            <span className="notification">♧</span>
            <span className="avatar">ER</span>
            <div>
              <strong>Editor Redaksi</strong>
              <small>admin@flipbook.id</small>
            </div>
          </div>
        </header>
        <nav className="breadcrumbs">
          <Link to="/admin">Dashboard</Link>
          <span>/</span>
          <span>Koleksi E-Modul Flipbook</span>
        </nav>
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">KOLEKSI PUBLIKASI</p>
            <h1>Koleksi E-Modul Flipbook</h1>
            <p>
              Kelola semua buku, draf, dan publikasi yang tersedia di workspace
              Anda.
            </p>
          </div>
          <button className="button primary" type="button" onClick={() => setShowUploadModal(true)}>
            + Unggah PDF
          </button>
        </div>
        <section className="panel collection-panel">
          <div className="panel-heading">
            <div>
              <h2>Publikasi dan draf</h2>
              <p>Daftar buku yang dapat Anda kelola.</p>
            </div>
            <span className="status neutral">{books.length} buku</span>
          </div>
          {books.length === 0 ? (
            <EmptyState title="Koleksi kosong">
              Belum ada buku untuk ditampilkan.
            </EmptyState>
          ) : (
            books.map((book) => (
              <div className="book-row" key={book.title}>
                <div className="book-thumb">
                  {getSavedCover(book.title) ? (
                    <img
                      src={getSavedCover(book.title)}
                      alt={`Sampul ${book.title}`}
                    />
                  ) : (
                    "FS"
                  )}
                </div>
                <div className="book-details">
                  <strong>{book.title}</strong>
                  <span>{book.meta}</span>
                </div>
                <div className="book-actions">
                  <span className={`status ${getPublicationStatus(book) === "Draf" ? "draft" : "neutral"}`}>
                    {getPublicationStatus(book)}
                  </span>
                  <div className="book-primary-actions">
                    <button className={`button compact ${getPublicationStatus(book) === "Terpublikasi" ? "unpublish-button" : "primary"}`} type="button" disabled={publishing} onClick={() => getPublicationStatus(book) === "Terpublikasi" ? void unpublishBook(book) : setPendingPublish(book)}>
                      {getPublicationStatus(book) === "Terpublikasi" && publicationAction === "unpublish" ? <><span className="button-spinner" aria-hidden="true" />Membatalkan…</> : getPublicationStatus(book) === "Terpublikasi" ? "Batalkan publikasi" : "Publikasikan"}
                    </button>
                    <button className="button compact" type="button" onClick={() => previewBook(book)}>
                      Pratinjau
                    </button>
                    <button className="button compact" type="button" onClick={() => setShareBook(book)}>
                      Bagikan
                    </button>
                  </div>
                  <button className="button compact danger-button" type="button" aria-label={`Hapus ${book.title}`} onClick={() => setPendingDelete(book.title)}>
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
        {collectionError && <p className="settings-message" role="alert">{collectionError}</p>}
      </section>
      {pendingPublish && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingPublish(null); }}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title">
            <p className="eyebrow">KONFIRMASI PUBLIKASI</p>
            <h2 id="publish-title">Publikasikan e-modul?</h2>
            <p>E-modul <strong>{pendingPublish.title}</strong> akan siap dibagikan melalui tautan dan QR Code.</p>
            <div className="confirm-actions">
              <button className="button quiet" type="button" disabled={publishing} onClick={() => setPendingPublish(null)}>Batal</button>
              <button className="button primary" type="button" disabled={publishing} onClick={() => void publishBook(pendingPublish)}>{publicationAction === "publish" ? <><span className="button-spinner" aria-hidden="true" />Menerbitkan…</> : "Ya, publikasikan"}</button>
            </div>
          </section>
        </div>
      )}
      {shareBook && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShareBook(null); }}>
          <section className="confirm-modal share-modal flipbook-share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
            <p className="eyebrow">BAGIKAN E-MODUL</p>
            <h2 id="share-title">{shareBook.title}</h2>
            <p className="share-help">Pindai QR atau salin gambar QR dan tautan sesuai kebutuhan.</p>
            <div className="share-modal-qr"><LocalQrCode value={publicFlipbookLink(shareBook)} alt={`QR Code ${shareBook.title}`} size={230} /></div>
            <label className="share-link-field"><span>Tautan flipbook</span><input readOnly value={publicFlipbookLink(shareBook)} /></label>
            {shareCopied && <p className="share-copy-status" role="status">{shareCopied === "qr" ? "Gambar QR berhasil disalin." : "Tautan berhasil disalin."}</p>}
            <div className="confirm-actions">
              <button className="button primary" type="button" onClick={() => void copyShareQr(shareBook)}>{shareCopied === "qr" ? "QR tersalin" : "Salin QR"}</button>
              <button className="button quiet" type="button" onClick={() => void copyShareLink(shareBook)}>{shareCopied === "link" ? "Tautan tersalin" : "Salin tautan"}</button>
              <button className="button quiet" type="button" onClick={() => setShareBook(null)}>Tutup</button>
            </div>
          </section>
        </div>
      )}
      {pendingDelete && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingDelete(null);
          }}
        >
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <div className="confirm-icon">!</div>
            <p className="eyebrow">KONFIRMASI TINDAKAN</p>
            <h2 id="delete-title">Hapus e-modul ini?</h2>
            <p>
              E-modul <strong>{pendingDelete}</strong> akan dihapus dari koleksi
              dan penyimpanan lokal. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="confirm-actions">
              <button
                className="button quiet"
                onClick={() => setPendingDelete(null)}
              >
                Batal
              </button>
              <button className="button danger-solid" onClick={() => void removeBook()}>
                Ya, hapus e-modul
              </button>
            </div>
          </section>
        </div>
      )}
      {showCreateChoice && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setShowCreateChoice(false);
          }}
        >
          <section
            className="confirm-modal create-choice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
          >
            <p className="eyebrow">PROYEK BARU</p>
            <h2 id="create-title">Unggah flipbook baru</h2>
            <p>Pilih dokumen PDF untuk membuat flipbook baru.</p>
            <div className="choice-grid">
              <button
                className="choice-card"
                onClick={() => {
                  setShowCreateChoice(false);
                  setShowUploadModal(true);
                }}
              >
                <span>⇧</span>
                <strong>Upload PDF</strong>
                <small>Impor dokumen PDF untuk dijadikan flipbook.</small>
              </button>
            </div>
            <div className="confirm-actions">
              <button
                className="button quiet"
                onClick={() => setShowCreateChoice(false)}
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      )}
      {showUploadModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowUploadModal(false);
          }}
        >
          <form className="confirm-modal upload-modal" onSubmit={createFromPdf}>
            <p className="eyebrow">IMPOR DOKUMEN</p>
            <h2>Unggah PDF</h2>
            <p>Pilih file PDF untuk membuat draf flipbook baru.</p>
            <label className="upload-field">
              Judul flipbook
              <input
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
                placeholder="Contoh: Majalah Sekolah 2026"
              />
            </label>
            <label className="upload-dropzone">
              {uploadFile ? (
                <>
                  <strong>{uploadFile.name}</strong>
                  <small>File siap diimpor</small>
                </>
              ) : (
                <>
                  <strong>Pilih file PDF</strong>
                  <small>Format PDF, maksimal sesuai batas penyimpanan</small>
                </>
              )}
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) =>
                  setUploadFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
            <div className="confirm-actions">
              <button
                type="button"
                className="button quiet"
                onClick={() => setShowUploadModal(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={!uploadFile}
              >
                Buat Flipbook
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function EditorRoute() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importedTitle = searchParams.get("title");
  const importedFile = searchParams.get("file");
  const savedRoute = getBookRouteMetadata(bookId);
  const uploadedTitle = importedTitle ?? savedRoute?.title;
  const uploadedFile = importedFile ?? savedRoute?.fileName;
  useEffect(() => {
    if (!importedTitle || !bookId) return;
    saveBookRouteMetadata(importedTitle, importedFile ?? undefined);
    navigate(`/admin/books/${bookSlug(importedTitle)}/editor`, {
      replace: true,
    });
  }, [bookId, importedFile, importedTitle, navigate]);
  if (uploadedTitle)
    return (
      <UploadedEditor
        title={uploadedTitle}
        fileName={uploadedFile ?? "Dokumen PDF"}
      />
    );
  if (bookId === "book-ekosistem" && !searchParams.has("local"))
    return <InteractiveEditorRoute />;
  if (
    supabase &&
    bookId !== "book-ekosistem" &&
    !importedTitle &&
    !searchParams.has("local")
  )
    return <RealEditorRoute bookId={bookId ?? ""} />;
  const resource = useBook(
    () => mockBookRepository.getDraftBook(bookId ?? ""),
    [bookId],
  );
  if (resource.status === "loading")
    return <LoadingState label="Memuat draf mock…" />;
  if (resource.status === "not-found")
    return (
      <ErrorState title="Draf tidak ditemukan">
        ID buku tidak ada di repository mock.
      </ErrorState>
    );
  if (resource.status === "error")
    return (
      <ErrorState title="Editor tidak tersedia">
        Repository mock gagal merespons.
      </ErrorState>
    );
  return <Editor book={resource.data} />;
}

function InteractiveEditorRoute() {
  const [searchParams] = useSearchParams();
  const editingTitle = searchParams.get("module") ?? "";
  const [moduleTitle, setModuleTitle] = useState(editingTitle);
  const [saveError, setSaveError] = useState("");
  const moduleId = editingTitle
    ? `module-${bookSlug(editingTitle)}`
    : "new-interactive-book";
  const blankBook: MockBook = {
    id: moduleId,
    slug: "flipbook-baru",
    title: editingTitle || "Modul Baru",
    description: "Susun flipbook interaktif dari awal.",
    subject: "Umum",
    grade: "-",
    draftRevision: 0,
    publicationStatus: "Draf",
    pages: [
      {
        id: "new-page-1",
        label: "Halaman 1",
        kind: "Halaman",
        body: "",
      },
    ],
  };
  const [hasChanges, setHasChanges] = useState(false);
  useEffect(() => {
    const sync = (event: Event) =>
      setHasChanges(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("interactive-editor-changes", sync);
    return () => window.removeEventListener("interactive-editor-changes", sync);
  }, []);
  const saveEditor = () => {
    const title = moduleTitle.trim();
    if (!title) {
      setSaveError("Masukkan judul modul sebelum menyimpan.");
      return;
    }
    setSaveError("");
    const savedModuleId = `module-${bookSlug(title)}`;
    window.dispatchEvent(
      new CustomEvent("interactive-editor-save", {
        detail: { storageKey: `flipbook-studio-interactive-pages-${savedModuleId}` },
      }),
    );
    try {
      const collectionKey = "flipbook-studio-collection-books";
      const saved = window.localStorage.getItem(collectionKey);
      const current = saved ? JSON.parse(saved) : [];
      const next = Array.isArray(current) ? current.filter((item) => item.title !== title) : [];
      next.unshift({
        title,
        meta: "Draf · modul interaktif",
        status: "Draf",
        href: `/admin/editor?module=${encodeURIComponent(title)}`,
      });
      window.localStorage.setItem(collectionKey, JSON.stringify(next));
    } catch {
      /* koleksi tetap dapat digunakan selama penyimpanan lokal tersedia */
    }
    document.querySelector(".save-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = "save-toast";
    toast.innerHTML =
      "<span>✓</span><div><strong>Perubahan tersimpan</strong><small>Halaman dan pengaturan editor berhasil disimpan.</small></div>";
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    }, 2600);
  };
  return (
    <AdminInfoShell
      active="editor"
      eyebrow="EDITOR INTERAKTIF"
      title="Editor Interaktif"
    >
      <section className="editor-module-settings" aria-label="Pengaturan modul">
        <label>
          Judul modul
          <input
            value={moduleTitle}
            onChange={(event) => {
              setModuleTitle(event.target.value);
              setSaveError("");
              setHasChanges(true);
            }}
            placeholder="Contoh: Ekosistem untuk Kelas V"
            required
          />
        </label>
        <button
          className="button primary editor-page-save"
          disabled={!hasChanges && Boolean(editingTitle)}
          onClick={saveEditor}
        >
          Simpan
        </button>
      </section>
      {saveError && <p className="editor-save-error" role="alert">{saveError}</p>}
      <Editor book={blankBook} />
    </AdminInfoShell>
  );
}

function LegacyBookEditorEntry() {
  const [searchParams] = useSearchParams();
  if (!searchParams.get("title") && !searchParams.get("file"))
    return <Navigate replace to="/admin/collection" />;
  return <EditorRoute />;
}

function UploadedEditor({
  title,
  fileName,
}: {
  title: string;
  fileName: string;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [coverPdfUrl, setCoverPdfUrl] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState(() => getSavedCover(title));
  const [coverPlacement, setCoverPlacement] = useState<"insert" | "replace">(
    () => getCoverPlacement(title),
  );
  const [coverMode, setCoverMode] = useState<
    "pdf" | "image" | "custom" | "settings"
  >("pdf");
  const [pdfPage, setPdfPage] = useState(1);
  const [view, setView] = useState<"editor" | "preview">("editor");
  const [activeSection, setActiveSection] = useState<
    "cover" | "content" | "activity"
  >("cover");
  const [workflowMenuOpen, setWorkflowMenuOpen] = useState(false);
  useEffect(() => {
    const host = document.querySelector(".pdf-reader-toolbar");
    if (!host || host.querySelector(".share-tools")) return;
    const tools = document.createElement("div");
    tools.className = "share-tools";
    const back = document.createElement("button");
    back.className = "button compact";
    back.textContent = "← Dashboard";
    back.onclick = () => {
      window.location.assign("/admin");
    };
    const link = window.location.href;
    const qr = document.createElement("img");
    qr.src = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=220`;
    qr.alt = "QR code flipbook";
    qr.className = "share-qr";
    const show = document.createElement("button");
    show.className = "button compact";
    show.textContent = "Tampilkan QR";
    show.onclick = () => {
      qr.classList.toggle("is-visible");
      show.textContent = qr.classList.contains("is-visible")
        ? "Sembunyikan QR"
        : "Tampilkan QR";
    };
    const copy = document.createElement("button");
    copy.className = "button compact";
    copy.textContent = "Salin link";
    copy.onclick = async () => {
      await navigator.clipboard?.writeText(link);
      copy.textContent = "Tersalin ✓";
      setTimeout(() => {
        copy.textContent = "Salin link";
      }, 1600);
    };
    const full = document.createElement("button");
    full.className = "button compact";
    full.textContent = "⛶ Layar penuh";
    full.onclick = () => {
      const target = document.querySelector(
        ".pdf-import-editor",
      ) as HTMLElement | null;
      if (!document.fullscreenElement) void target?.requestFullscreen?.();
      else void document.exitFullscreen?.();
    };
    tools.append(back, qr, show, copy, full);
    host.appendChild(tools);
    return () => tools.remove();
  }, []);
  useEffect(() => {
    const controls = document.querySelector(".pdf-page-controls");
    if (!controls) return;
    const handler = (event: Event) => {
      const target = event.target as HTMLElement;
      const text = target?.textContent ?? "";
      if (text.includes("Sebelumnya"))
        window.dispatchEvent(new Event("flipbook-prev"));
      if (text.includes("Berikutnya"))
        window.dispatchEvent(new Event("flipbook-next"));
    };
    controls.addEventListener("click", handler);
    return () => controls.removeEventListener("click", handler);
  }, []);
  useEffect(() => {
    const current = uploadedPdfUrls.get(title);
    if (current) {
      setPdfUrl(current);
      return;
    }
    try {
      const saved = window.localStorage.getItem(`flipbook-studio-pdf-${title}`);
      if (saved) {
        setPdfUrl(saved);
        return;
      }
    } catch {
      /* lanjutkan ke IndexedDB */
    }
    loadPdfBlob(title, setPdfUrl);
  }, [title]);
  const sections = {
    cover: {
      icon: "▣",
      title: "Sampul flipbook",
      text: "Tetapkan judul, gambar sampul, dan keterangan edisi agar publikasi mudah dikenali.",
      action: "Atur sampul",
    },
    content: {
      icon: "▤",
      title: "Halaman dan materi",
      text: "Susun urutan halaman, sorot bagian penting, dan tambahkan penjelasan untuk pembaca.",
      action: "Kelola halaman",
    },
    activity: {
      icon: "✦",
      title: "Aktivitas pembaca",
      text: "Tambahkan soal refleksi, kuis singkat, atau hotspot untuk membuat flipbook lebih interaktif.",
      action: "Tambah aktivitas",
    },
  } as const;
  const current = sections[activeSection];
  useEffect(() => {
    const panel = document.querySelector(
      ".pdf-editor-panel",
    ) as HTMLElement | null;
    if (!panel) return;
    const existing = panel.querySelector(
      ".cover-designer",
    ) as HTMLElement | null;
    const regularChildren = Array.from(panel.children).filter(
      (child) => !child.classList.contains("cover-designer"),
    ) as HTMLElement[];
    if (activeSection !== "cover") {
      existing?.remove();
      regularChildren.forEach((child) => {
        child.style.display = "";
      });
      return;
    }
    regularChildren.forEach((child) => {
      child.style.display = "none";
    });
    if (existing) existing.remove();
    const designer = document.createElement("section");
    designer.className = "cover-designer";
    const savedCover = coverImage || getSavedCover(title);
    const safeTitle = escapeHtml(title);
    designer.innerHTML = `<div class="cover-source-tabs" role="tablist"><button class="${coverMode === "pdf" ? "is-active" : ""}" data-mode="pdf">▤ Dari PDF</button><button class="${coverMode === "image" ? "is-active" : ""}" data-mode="image">▧ Unggah gambar</button><button class="${coverMode === "custom" ? "is-active" : ""}" data-mode="custom">✦ Buat sendiri</button><button class="${coverMode === "settings" ? "is-active" : ""}" data-mode="settings">⚙ Pengaturan sampul</button></div><div class="cover-designer-grid"><div class="cover-controls"><div class="cover-pdf-option" ${coverMode === "pdf" ? "" : "hidden"}><strong>Gunakan halaman pertama PDF</strong><p>Sampul diambil dari halaman pertama dokumen yang Anda impor.</p><button class="button quiet" type="button">Pilih halaman PDF</button></div><div class="cover-image-option" ${coverMode === "image" ? "" : "hidden"}><strong>Unggah gambar untuk sampul</strong><p>Gunakan JPG, PNG, atau WebP. Gambar akan langsung dipakai sebagai sampul.</p><input class="cover-background" type="file" accept="image/jpeg,image/png,image/webp" hidden /><button class="button quiet cover-image-upload" type="button">▧ Pilih gambar sampul</button><div class="cover-upload-status" aria-live="polite">${savedCover ? "Gambar sampul telah tersimpan" : "Belum ada gambar dipilih"}</div></div><div class="cover-custom-option" ${coverMode === "custom" ? "" : "hidden"}><label>Gambar latar sampul<input class="cover-background" type="file" accept="image/*" /></label><label>Gambar tambahan<input class="cover-illustration" type="file" accept="image/*" /></label><label>Judul sampul<input class="cover-title" value="${safeTitle}" /></label><div class="cover-control-row"><label>Jenis font<select class="cover-font"><option value="Caveat">Caveat</option><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="Trebuchet MS">Trebuchet</option></select></label><label>Warna font<input class="cover-color" type="color" value="#442a22" /></label></div><label>Ukuran teks <output class="cover-size-output">42px</output><input class="cover-size" type="range" min="24" max="72" value="42" /></label></div><div class="cover-settings-option" ${coverMode === "settings" ? "" : "hidden"}><strong>Pengaturan posisi sampul</strong><p>Tentukan apakah sampul baru menambah halaman atau menggantikan halaman pertama PDF.</p></div></div><div class="cover-live-preview mode-${coverMode}"><span class="cover-preview-label">PRATINJAU SAMPUL</span><b>PDF</b><strong>${safeTitle}</strong></div></div><button class="button primary cover-continue" type="button">Simpan sampul & lanjutkan →</button>`;
    panel.appendChild(designer);
    const preview = designer.querySelector(
      ".cover-live-preview",
    ) as HTMLElement;
    if (savedCover) {
      preview.style.backgroundImage = `linear-gradient(rgba(255,253,250,.08), rgba(255,253,250,.08)), url(${savedCover})`;
      preview.style.backgroundSize = "contain";
      preview.style.backgroundRepeat = "no-repeat";
      const savedLabel = preview.querySelector(".cover-preview-label");
      if (savedLabel) savedLabel.textContent = "SAMPUL TERSIMPAN";
      if (coverMode !== "custom")
        preview.innerHTML =
          '<span class="cover-preview-label">SAMPUL TERSIMPAN</span>';
    }
    if (coverMode === "custom")
      preview.innerHTML = `<span class="cover-preview-label">KANVAS SAMPUL</span><h4>${safeTitle}</h4><small>Studio Flipbook</small>`;
    const pdfOption = designer.querySelector(
      ".cover-pdf-option",
    ) as HTMLElement;
    const imageOption = designer.querySelector(
      ".cover-image-option",
    ) as HTMLElement;
    const customOption = designer.querySelector(
      ".cover-custom-option",
    ) as HTMLElement;
    const settingsOption = designer.querySelector(
      ".cover-settings-option",
    ) as HTMLElement;
    const pdfPageButton = designer.querySelector(
      ".cover-pdf-option .button",
    ) as HTMLButtonElement | null;
    const pdfOptionTitle = pdfOption.querySelector("strong");
    const pdfOptionDescription = pdfOption.querySelector("p");
    if (pdfOptionTitle)
      pdfOptionTitle.textContent = coverPdfUrl
        ? "Pilih halaman dari PDF sampul"
        : "Unggah PDF untuk sampul";
    if (pdfOptionDescription)
      pdfOptionDescription.textContent = coverPdfUrl
        ? "Pilih halaman yang ingin digunakan sebagai sampul flipbook."
        : "Pilih berkas PDF baru yang ingin digunakan khusus sebagai sampul.";
    if (pdfPageButton)
      pdfPageButton.textContent = coverPdfUrl
        ? "Pilih halaman PDF"
        : "Unggah PDF sampul";
    const placementLabel = document.createElement("label");
    placementLabel.className = "cover-placement";
    placementLabel.innerHTML =
      'Posisi sampul<select aria-label="Posisi sampul"><option value="insert">Jadikan halaman pertama</option><option value="replace">Timpa halaman pertama PDF</option></select><small>Halaman asli PDF tetap ada jika sampul dijadikan halaman pertama.</small>';
    const placementSelect = placementLabel.querySelector(
      "select",
    ) as HTMLSelectElement;
    placementSelect.value = coverPlacement;
    placementSelect.addEventListener("change", () => {
      const placement =
        placementSelect.value === "replace" ? "replace" : "insert";
      saveCoverPlacement(title, placement);
      setCoverPlacement(placement);
    });
    settingsOption.appendChild(placementLabel);
    pdfPageButton?.addEventListener("click", async () => {
      if (!coverPdfUrl) {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "application/pdf,.pdf";
        fileInput.addEventListener("change", async () => {
          const file = fileInput.files?.[0];
          if (!file) return;
          const validationError = validatePdfFile(file);
          if (validationError) {
            pdfPageButton.textContent = validationError;
            return;
          }
          const objectUrl = URL.createObjectURL(file);
          const sourceBytes = await file.arrayBuffer();
          coverPdfBytes.set(title, sourceBytes);
          setCoverPdfUrl(objectUrl);
          try {
            const coverDocument = await pdfjsLib.getDocument({
              data: sourceBytes.slice(0),
            }).promise;
            const firstPage = await coverDocument.getPage(1);
            const viewport = firstPage.getViewport({ scale: 1.1 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await firstPage.render({
              canvasContext: canvas.getContext("2d")!,
              viewport,
            }).promise;
            const coverImage = canvas.toDataURL("image/jpeg", 0.86);
            saveCover(title, coverImage);
            setCoverImage(coverImage);
            preview.style.backgroundImage = `linear-gradient(rgba(255,253,250,.08), rgba(255,253,250,.08)), url(${coverImage})`;
            preview.style.backgroundSize = "contain";
            preview.style.backgroundRepeat = "no-repeat";
            const label = preview.querySelector(".cover-preview-label");
            if (label) label.textContent = "SAMPUL · HALAMAN 1";
          } catch {
            pdfPageButton.textContent = "PDF tidak dapat dibaca";
          }
        });
        fileInput.click();
        return;
      }
      const picker = document.createElement("div");
      picker.className = "cover-page-picker";
      picker.innerHTML =
        '<section role="dialog" aria-modal="true" aria-label="Pilih halaman PDF"><button class="cover-picker-close" type="button" aria-label="Tutup">×</button><p class="eyebrow">PILIH SAMPUL</p><h4>Gunakan halaman PDF sebagai sampul</h4><p class="cover-picker-info">Menyiapkan daftar halaman…</p><div class="cover-page-list"></div></section>';
      document.body.appendChild(picker);
      const closePicker = () => picker.remove();
      picker.addEventListener("mousedown", (event) => {
        if (event.target === picker) closePicker();
      });
      picker
        .querySelector(".cover-picker-close")
        ?.addEventListener("click", closePicker);
      try {
        const sourceBytes = coverPdfBytes.get(title);
        const documentPdf = sourceBytes
          ? await pdfjsLib.getDocument({ data: sourceBytes.slice(0) }).promise
          : await pdfjsLib.getDocument(coverPdfUrl).promise;
        const list = picker.querySelector(".cover-page-list") as HTMLElement;
        const info = picker.querySelector(".cover-picker-info") as HTMLElement;
        info.textContent = `Pilih satu dari ${documentPdf.numPages} halaman.`;
        for (let index = 1; index <= documentPdf.numPages; index += 1) {
          const pageButton = document.createElement("button");
          pageButton.type = "button";
          pageButton.textContent = `Halaman ${index}`;
          pageButton.addEventListener("click", async () => {
            const page = await documentPdf.getPage(index);
            const viewport = page.getViewport({ scale: 1.1 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({
              canvasContext: canvas.getContext("2d")!,
              viewport,
            }).promise;
            const coverImage = canvas.toDataURL("image/jpeg", 0.86);
            saveCover(title, coverImage);
            setCoverImage(coverImage);
            preview.style.backgroundImage = `linear-gradient(rgba(255,253,250,.08), rgba(255,253,250,.08)), url(${coverImage})`;
            preview.style.backgroundSize = "contain";
            preview.style.backgroundRepeat = "no-repeat";
            preview.querySelector(".cover-preview-label")!.textContent =
              `SAMPUL · HALAMAN ${index}`;
            pdfPageButton.textContent = `Halaman ${index} dipilih`;
            closePicker();
          });
          list.appendChild(pageButton);
        }
      } catch {
        const info = picker.querySelector(".cover-picker-info") as HTMLElement;
        info.textContent =
          "PDF tidak dapat dibaca dari penyimpanan perangkat ini.";
      }
    });
    const changeMode = (mode: string) => {
      const nextMode =
        mode === "image" || mode === "custom" || mode === "settings"
          ? mode
          : "pdf";
      setCoverMode(nextMode);
      designer
        .querySelectorAll("[data-mode]")
        .forEach((button) =>
          button.classList.toggle(
            "is-active",
            (button as HTMLElement).dataset.mode === nextMode,
          ),
        );
      pdfOption.hidden = nextMode !== "pdf";
      imageOption.hidden = nextMode !== "image";
      customOption.hidden = nextMode !== "custom";
      settingsOption.hidden = nextMode !== "settings";
      preview.className = `cover-live-preview mode-${nextMode}`;
      preview.innerHTML =
        nextMode === "pdf"
          ? `<span class="cover-preview-label">PRATINJAU SAMPUL</span><b>PDF</b><strong>${safeTitle}</strong>`
          : `<span class="cover-preview-label">PRATINJAU SAMPUL</span><h4>${safeTitle}</h4><small>Studio Flipbook</small>`;
    };
    designer.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () =>
        changeMode((button as HTMLElement).dataset.mode ?? "pdf"),
      );
    });
    const updatePreview = () => {
      const text =
        (designer.querySelector(".cover-title") as HTMLInputElement | null)
          ?.value || "Judul Flipbook";
      const font =
        (designer.querySelector(".cover-font") as HTMLSelectElement | null)
          ?.value || "Caveat";
      const color =
        (designer.querySelector(".cover-color") as HTMLInputElement | null)
          ?.value || "#442a22";
      const size =
        (designer.querySelector(".cover-size") as HTMLInputElement | null)
          ?.value || "42";
      const heading = preview.querySelector("h4") as HTMLElement | null;
      if (heading) {
        heading.textContent = text;
        heading.style.fontFamily = font;
        heading.style.color = color;
        heading.style.fontSize = `${size}px`;
      }
      const output = designer.querySelector(".cover-size-output");
      if (output) output.textContent = `${size}px`;
    };
    designer
      .querySelectorAll(".cover-title, .cover-font, .cover-color, .cover-size")
      .forEach((input) => input.addEventListener("input", updatePreview));
    const imageUploadButton = designer.querySelector(
      ".cover-image-upload",
    ) as HTMLButtonElement | null;
    const imageUploadInput = imageOption.querySelector(
      ".cover-background",
    ) as HTMLInputElement | null;
    imageUploadButton?.addEventListener("click", () =>
      imageUploadInput?.click(),
    );
    designer.querySelectorAll(".cover-background").forEach((input) =>
      input.addEventListener("change", (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const image = String(reader.result || "");
          if (!image) return;
          preview.style.backgroundImage = `linear-gradient(rgba(255,253,250,.08), rgba(255,253,250,.08)), url(${image})`;
          preview.style.backgroundSize = "contain";
          preview.style.backgroundRepeat = "no-repeat";
          saveCover(title, image);
          setCoverImage(image);
          const label = preview.querySelector(".cover-preview-label");
          if (label) label.textContent = "SAMPUL GAMBAR TERSIMPAN";
          const status = imageOption.querySelector(".cover-upload-status");
          if (status)
            status.textContent = `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB siap digunakan`;
        });
        reader.readAsDataURL(file);
      }),
    );
    designer.querySelectorAll(".cover-illustration").forEach((input) =>
      input.addEventListener("change", (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const image = document.createElement("img");
        image.src = URL.createObjectURL(file);
        image.alt = "Gambar tambahan sampul";
        preview.prepend(image);
      }),
    );
    const continueButton = designer.querySelector(
      ".cover-continue",
    ) as HTMLButtonElement | null;
    if (continueButton) {
      continueButton.textContent = "Simpan sampul";
      continueButton.addEventListener("click", () => {
        continueButton.textContent = "Sampul tersimpan ✓";
        window.setTimeout(() => {
          continueButton.textContent = "Simpan sampul";
        }, 1600);
      });
    }
    return () => designer.remove();
  }, [
    activeSection,
    title,
    coverPdfUrl,
    coverImage,
    coverPlacement,
    coverMode,
  ]);
  useEffect(() => {
    if (activeSection !== "cover") return;
    const designer = document.querySelector(
      ".cover-designer",
    ) as HTMLElement | null;
    if (!designer) return;
    const preview = designer.querySelector(
      ".cover-live-preview",
    ) as HTMLElement | null;
    const customOptions = designer.querySelector(
      ".cover-custom-option",
    ) as HTMLElement | null;
    if (!preview || !customOptions) return;
    const rotateLabel = document.createElement("label");
    rotateLabel.className = "cover-rotate-control";
    rotateLabel.innerHTML =
      'Putar teks <output>0°</output><input type="range" min="-180" max="180" value="0" />';
    customOptions.appendChild(rotateLabel);
    const rotateInput = rotateLabel.querySelector("input") as HTMLInputElement;
    rotateInput.addEventListener("input", () => {
      const heading = preview.querySelector("h4") as HTMLElement | null;
      if (heading) heading.style.rotate = `${rotateInput.value}deg`;
      const output = rotateLabel.querySelector("output");
      if (output) output.textContent = `${rotateInput.value}°`;
    });
    const makeDraggable = (element: HTMLElement) => {
      if (element.dataset.draggable) return;
      element.dataset.draggable = "true";
      element.classList.add("cover-draggable");
      element.addEventListener("pointerdown", (event) => {
        if (!preview.classList.contains("mode-custom")) return;
        event.preventDefault();
        const frame = preview.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        const shiftX = event.clientX - box.left;
        const shiftY = event.clientY - box.top;
        element.style.left = `${box.left - frame.left}px`;
        element.style.top = `${box.top - frame.top}px`;
        element.style.transform = "none";
        element.setPointerCapture(event.pointerId);
        const move = (moveEvent: PointerEvent) => {
          const maxX = preview.clientWidth - element.offsetWidth;
          const maxY = preview.clientHeight - element.offsetHeight;
          element.style.left = `${Math.max(0, Math.min(maxX, moveEvent.clientX - frame.left - shiftX))}px`;
          element.style.top = `${Math.max(0, Math.min(maxY, moveEvent.clientY - frame.top - shiftY))}px`;
        };
        const stop = () => {
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerup", stop);
          element.removeEventListener("pointercancel", stop);
        };
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerup", stop);
        element.addEventListener("pointercancel", stop);
      });
    };
    const bindPreviewItems = () => {
      const heading = preview.querySelector("h4") as HTMLElement | null;
      const image = preview.querySelector("img") as HTMLElement | null;
      if (heading) makeDraggable(heading);
      if (image) makeDraggable(image);
    };
    bindPreviewItems();
    const observer = new MutationObserver(bindPreviewItems);
    observer.observe(preview, { childList: true, subtree: true });
    designer
      .querySelectorAll("[data-mode]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          queueMicrotask(bindPreviewItems),
        ),
      );
    return () => {
      observer.disconnect();
      rotateLabel.remove();
    };
  }, [activeSection]);
  return (
    <div className="admin-dashboard-page admin-layout editor-workflow-page">
      <aside
        className={`admin-nav editor-workflow-nav ${workflowMenuOpen ? "is-open" : ""}`}
        aria-label="Tahapan penyusunan flipbook"
      >
        <button
          className="workflow-menu-toggle"
          type="button"
          aria-label={
            workflowMenuOpen ? "Tutup menu editor" : "Buka menu editor"
          }
          aria-expanded={workflowMenuOpen}
          onClick={() => setWorkflowMenuOpen((open) => !open)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="admin-nav-brand">
          <span className="brand-mark">F</span>
          <strong>E-Modul Flipbook</strong>
        </div>
        <div className="editor-workflow-menu">
          {(Object.keys(sections) as Array<keyof typeof sections>).map(
            (key, index) => (
              <button
                key={key}
                className={activeSection === key ? "is-active" : ""}
                onClick={() => {
                  setActiveSection(key);
                  setWorkflowMenuOpen(false);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{sections[key].title}</strong>
                <small>
                  {key === "cover" ? "Wajib dilengkapi" : "Opsional"}
                </small>
              </button>
            ),
          )}
        </div>
        <button
          className="editor-preview-menu"
          type="button"
          onClick={() => {
            setView("preview");
            setWorkflowMenuOpen(false);
          }}
        >
          <span>04</span>
          <strong>Buka pratinjau</strong>
          <small>Lihat hasil flipbook</small>
        </button>
        <Link className="button quiet editor-workflow-back" to="/admin">
          ← Kembali ke dashboard
        </Link>
        <button
          className="editor-workflow-logout"
          type="button"
          onClick={async () => {
            if (supabase) await supabase.auth.signOut();
            window.history.replaceState(null, "", "/admin/login");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
        >
          ↪ Keluar
        </button>
      </aside>
      <section className="workspace">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">PENYUSUNAN FLIPBOOK</p>
            <h1>{title}</h1>
            <p>
              Lengkapi setiap bagian sebelum flipbook dipratinjau atau
              dibagikan.
            </p>
          </div>
        </div>
        <section className="editor pdf-import-editor editor-dashboard-shell">
          {view === "editor" ? (
            <main className="pdf-editor-workspace">
              <section className="pdf-editor-layout">
                <section className="pdf-editor-panel">
                  <span className="editor-panel-icon">{current.icon}</span>
                  <p className="eyebrow">
                    LANGKAH{" "}
                    {activeSection === "cover"
                      ? "01"
                      : activeSection === "content"
                        ? "02"
                        : "03"}
                  </p>
                  <h3>{current.title}</h3>
                  <p>{current.text}</p>
                  <div className="editor-checklist">
                    <label>
                      <input
                        type="checkbox"
                        defaultChecked={activeSection !== "activity"}
                      />{" "}
                      Judul dan informasi utama sudah sesuai
                    </label>
                    <label>
                      <input type="checkbox" /> Siap ditampilkan kepada pembaca
                    </label>
                  </div>
                  <button
                    className="button primary"
                    onClick={() =>
                      setActiveSection(
                        activeSection === "cover"
                          ? "content"
                          : activeSection === "content"
                            ? "activity"
                            : "cover",
                      )
                    }
                  >
                    {current.action} →
                  </button>
                </section>
                <aside className="pdf-editor-preview-note">
                  <div className="pdf-badge">PDF</div>
                  <strong>{fileName}</strong>
                  <small>
                    Dokumen sumber tersimpan lokal dan dapat dipratinjau kapan
                    saja.
                  </small>
                  <button
                    className="button quiet"
                    onClick={() => setView("preview")}
                  >
                    Buka pratinjau →
                  </button>
                </aside>
              </section>
            </main>
          ) : (
            <main className="pdf-reader-preview">
              <div className="pdf-reader-toolbar">
                <div>
                  <strong>{fileName}</strong>
                  <small>
                    Mode flipbook · drag sudut halaman atau gunakan tombol
                  </small>
                </div>
                <div className="pdf-page-controls">
                  <button
                    className="button compact"
                    disabled={pdfPage <= 1}
                    onClick={() => setPdfPage((page) => Math.max(1, page - 1))}
                  >
                    ‹ Sebelumnya
                  </button>
                  <span>Halaman {pdfPage}</span>
                  <button
                    className="button compact"
                    onClick={() => setPdfPage((page) => page + 1)}
                  >
                    Berikutnya ›
                  </button>
                </div>
                <button
                  className="button quiet"
                  onClick={() => setView("editor")}
                >
                  ← Kembali menyusun
                </button>
              </div>
              {pdfUrl ? (
                <PdfFlipbook
                  url={pdfUrl}
                  title={title}
                  coverImage={coverImage}
                  placement={coverPlacement}
                />
              ) : (
                <div className="uploaded-preview-card">
                  <div className="pdf-badge">PDF</div>
                  <h2>Pratinjau belum tersedia</h2>
                  <p>
                    File PDF tidak ditemukan di penyimpanan lokal browser ini.
                  </p>
                </div>
              )}
            </main>
          )}
        </section>
      </section>
    </div>
  );
  return (
    <AdminInfoShell active="editor" eyebrow="PENYUSUNAN FLIPBOOK" title={title}>
      <section className="editor pdf-import-editor editor-dashboard-shell">
        {view === "editor" ? (
          <main className="pdf-editor-workspace">
            <p className="pdf-editor-context">
              Lengkapi setiap bagian sebelum flipbook dipratinjau atau
              dibagikan.
            </p>
            <section className="pdf-editor-layout">
              <aside
                className="pdf-editor-steps"
                aria-label="Tahapan penyusunan"
              >
                {(Object.keys(sections) as Array<keyof typeof sections>).map(
                  (key, index) => (
                    <button
                      key={key}
                      className={activeSection === key ? "is-active" : ""}
                      onClick={() => setActiveSection(key)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{sections[key].title}</strong>
                      <small>
                        {key === "cover" ? "Wajib dilengkapi" : "Opsional"}
                      </small>
                    </button>
                  ),
                )}
                <Link
                  className="button quiet editor-back-link"
                  to="/admin/books"
                >
                  ← Kembali ke koleksi
                </Link>
              </aside>
              <section className="pdf-editor-panel">
                <span className="editor-panel-icon">{current.icon}</span>
                <p className="eyebrow">
                  LANGKAH{" "}
                  {activeSection === "cover"
                    ? "01"
                    : activeSection === "content"
                      ? "02"
                      : "03"}
                </p>
                <h3>{current.title}</h3>
                <p>{current.text}</p>
                <div className="editor-checklist">
                  <label>
                    <input
                      type="checkbox"
                      defaultChecked={activeSection !== "activity"}
                    />{" "}
                    Judul dan informasi utama sudah sesuai
                  </label>
                  <label>
                    <input type="checkbox" /> Siap ditampilkan kepada pembaca
                  </label>
                </div>
                <button
                  className="button primary"
                  onClick={() =>
                    setActiveSection(
                      activeSection === "cover"
                        ? "content"
                        : activeSection === "content"
                          ? "activity"
                          : "cover",
                    )
                  }
                >
                  {current.action} →
                </button>
              </section>
              <aside className="pdf-editor-preview-note">
                <div className="pdf-badge">PDF</div>
                <strong>{fileName}</strong>
                <small>
                  Dokumen sumber tersimpan lokal dan dapat dipratinjau kapan
                  saja.
                </small>
                <button
                  className="button quiet"
                  onClick={() => setView("preview")}
                >
                  Buka pratinjau →
                </button>
              </aside>
            </section>
          </main>
        ) : (
          <main className="pdf-reader-preview">
            <div className="pdf-reader-toolbar">
              <div>
                <strong>{fileName}</strong>
                <small>
                  Mode flipbook · drag sudut halaman atau gunakan tombol
                </small>
              </div>
              <div className="pdf-page-controls">
                <button
                  className="button compact"
                  disabled={pdfPage <= 1}
                  onClick={() => setPdfPage((page) => Math.max(1, page - 1))}
                >
                  ‹ Sebelumnya
                </button>
                <span>Halaman {pdfPage}</span>
                <button
                  className="button compact"
                  onClick={() => setPdfPage((page) => page + 1)}
                >
                  Berikutnya ›
                </button>
              </div>
              <span className="status draft">Draf impor</span>
              <button
                className="button quiet"
                onClick={() => setView("editor")}
              >
                ← Kembali menyusun
              </button>
            </div>
            {pdfUrl ? (
              <PdfFlipbook url={pdfUrl} title={title} />
            ) : (
              <div className="uploaded-preview-card">
                <div className="pdf-badge">PDF</div>
                <h2>Pratinjau belum tersedia</h2>
                <p>
                  File PDF tidak ditemukan di penyimpanan lokal browser ini.
                </p>
              </div>
            )}
          </main>
        )}
      </section>
    </AdminInfoShell>
  );
}

function CoverDesigner({
  title,
  onContinue,
}: {
  title: string;
  onContinue: () => void;
}) {
  const [mode, setMode] = useState<"pdf" | "image" | "custom">("pdf");
  const [background, setBackground] = useState<string | null>(null);
  const [illustration, setIllustration] = useState<string | null>(null);
  const [coverTitle, setCoverTitle] = useState(title);
  const [font, setFont] = useState("Caveat");
  const [fontSize, setFontSize] = useState(42);
  const [fontColor, setFontColor] = useState("#442a22");
  const readImage = (
    event: ChangeEvent<HTMLInputElement>,
    setImage: (value: string | null) => void,
  ) => {
    const file = event.target.files?.[0];
    if (file) setImage(URL.createObjectURL(file));
  };
  const previewStyle =
    mode === "custom" && background
      ? {
          backgroundImage: `linear-gradient(rgba(255,253,250,.16), rgba(255,253,250,.16)), url(${background})`,
        }
      : mode === "image" && background
        ? { backgroundImage: `url(${background})` }
        : undefined;
  return (
    <section className="cover-designer">
      <div className="cover-source-tabs" role="tablist">
        <button
          className={mode === "pdf" ? "is-active" : ""}
          onClick={() => setMode("pdf")}
        >
          ▤ Dari PDF
        </button>
        <button
          className={mode === "image" ? "is-active" : ""}
          onClick={() => setMode("image")}
        >
          ▧ Unggah gambar
        </button>
        <button
          className={mode === "custom" ? "is-active" : ""}
          onClick={() => setMode("custom")}
        >
          ✦ Buat sendiri
        </button>
      </div>
      <div className="cover-designer-grid">
        <div className="cover-controls">
          {mode === "pdf" ? (
            <>
              <strong>Gunakan halaman pertama PDF</strong>
              <p>
                Sampul diambil dari halaman pertama dokumen yang Anda impor.
              </p>
              <button className="button quiet" type="button">
                Pilih halaman PDF
              </button>
            </>
          ) : (
            <>
              <label>
                Gambar latar sampul
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => readImage(event, setBackground)}
                />
              </label>
              {mode === "custom" && (
                <>
                  <label>
                    Gambar tambahan
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => readImage(event, setIllustration)}
                    />
                  </label>
                  <label>
                    Judul sampul
                    <input
                      value={coverTitle}
                      onChange={(event) => setCoverTitle(event.target.value)}
                    />
                  </label>
                  <div className="cover-control-row">
                    <label>
                      Jenis font
                      <select
                        value={font}
                        onChange={(event) => setFont(event.target.value)}
                      >
                        <option value="Caveat">Caveat</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Arial">Arial</option>
                        <option value="Trebuchet MS">Trebuchet</option>
                      </select>
                    </label>
                    <label>
                      Warna font
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(event) => setFontColor(event.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    Ukuran teks <output>{fontSize}px</output>
                    <input
                      type="range"
                      min="24"
                      max="72"
                      value={fontSize}
                      onChange={(event) =>
                        setFontSize(Number(event.target.value))
                      }
                    />
                  </label>
                </>
              )}
            </>
          )}
        </div>
        <div className={`cover-live-preview mode-${mode}`} style={previewStyle}>
          <span className="cover-preview-label">PRATINJAU SAMPUL</span>
          {mode === "pdf" ? (
            <>
              <b>PDF</b>
              <strong>{title}</strong>
            </>
          ) : (
            <>
              {illustration && (
                <img src={illustration} alt="Gambar tambahan sampul" />
              )}
              <h4 style={{ fontFamily: font, fontSize, color: fontColor }}>
                {coverTitle || "Judul Flipbook"}
              </h4>
              <small>Studio Flipbook</small>
            </>
          )}
        </div>
      </div>
      <button className="button primary" type="button" onClick={onContinue}>
        Simpan sampul & lanjutkan →
      </button>
    </section>
  );
}

function PdfPreviewRoute() {
  const navigate = useNavigate();
  const { title: encodedTitle = "" } = useParams();
  const title = decodeURIComponent(encodedTitle);
  const [pdfUrl, setPdfUrl] = useState("");
  const [missing, setMissing] = useState(false);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(150);
  useEffect(() => {
    if (!title) { setMissing(true); return; }
    const cached = uploadedPdfUrls.get(title);
    if (cached) { setPdfUrl(cached); return; }
    let active = true;
    loadPdfBlob(title, (url) => { if (active) setPdfUrl(url); });
    const timeout = window.setTimeout(() => { if (active) setMissing(true); }, 700);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [title]);
  const printPdf = () => {
    if (!pdfUrl) return;
    const pdfWindow = window.open(pdfUrl, "_blank");
    if (!pdfWindow) return;
    let printed = false;
    const openPrintDialog = () => {
      if (printed || pdfWindow.closed) return;
      printed = true;
      pdfWindow.focus();
      pdfWindow.print();
    };
    pdfWindow.addEventListener("load", openPrintDialog, { once: true });
    window.setTimeout(openPrintDialog, 1200);
  };
  useEffect(() => {
    const browserPrint = window.print;
    window.print = printPdf;
    return () => { window.print = browserPrint; };
  }, [pdfUrl]);
  if (missing && !pdfUrl) return <main className="standalone-flipbook-reader"><ErrorState title="PDF tidak tersedia">File hanya tersimpan di browser tempat PDF diunggah. Unggah kembali PDF tersebut dari halaman Koleksi.</ErrorState><button type="button" className="button quiet" onClick={() => navigate("/admin/collection")}>Kembali ke koleksi</button></main>;
  return <main className="standalone-flipbook-reader" aria-label="Pratinjau flipbook"><header><strong>{title || "Pratinjau flipbook"}</strong><div className="reader-actions"><button type="button" className="button quiet" onClick={() => window.print()}>Cetak</button><button type="button" className="button quiet" onClick={() => navigate("/admin/collection")}>Keluar</button></div></header><section className="standalone-flipbook-stage">{pdfUrl ? <PdfFlipbook url={pdfUrl} title={title} magnifierEnabled={magnifierEnabled} zoomPercent={zoomPercent} /> : <LoadingState label="Memuat PDF…" />}</section><footer className="preview-footer-controls"><button type="button" className={`button quiet ${magnifierEnabled ? "is-active" : ""}`} onClick={() => setMagnifierEnabled((enabled) => !enabled)}>{magnifierEnabled ? "Kaca pembesar aktif" : "Aktifkan kaca pembesar"}</button>{magnifierEnabled && <label>Zoom <select value={zoomPercent} onChange={(event) => setZoomPercent(Number(event.target.value))}><option value={125}>125%</option><option value={150}>150%</option><option value={175}>175%</option><option value={200}>200%</option></select></label>}</footer></main>;
}

function PdfFlipbook({
  url,
  title,
  coverImage,
  placement,
  magnifierEnabled: controlledMagnifierEnabled,
  zoomPercent: controlledZoomPercent,
}: {
  url: string;
  title: string;
  coverImage?: string;
  placement?: "insert" | "replace";
  magnifierEnabled?: boolean;
  zoomPercent?: number;
}) {
  type PdfQrRegion = { data: string; left: number; top: number; width: number; height: number };
  const flipRef = useRef<any>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const next = () => flipRef.current?.pageFlip?.().flipNext("bottom");
    const previous = () => flipRef.current?.pageFlip?.().flipPrev("bottom");
    window.addEventListener("flipbook-next", next);
    window.addEventListener("flipbook-prev", previous);
    return () => { window.removeEventListener("flipbook-next", next); window.removeEventListener("flipbook-prev", previous); };
  }, []);
  useEffect(() => {
    const stopClickTurn = (event: MouseEvent) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
      if ((event.target as Element).closest(".pdf-flipbook-navigation, .flipbook-zoom-control, .flipbook-lens-size-control")) return;
      const stage = stageRef.current;
      if (!stage?.contains(event.target as Node)) return;
      const rect = stage.getBoundingClientRect();
      flipRef.current?.pageFlip?.().userStop?.({ x: rect.width / 2, y: rect.height / 2 });
      event.stopImmediatePropagation();
    };
    window.addEventListener("mouseup", stopClickTurn, true);
    return () => window.removeEventListener("mouseup", stopClickTurn, true);
  }, []);
  const [pages, setPages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [renderError, setRenderError] = useState(false);
  const [qrRegions, setQrRegions] = useState<Record<number, PdfQrRegion[]>>({});
  const [activeQr, setActiveQr] = useState<string | null>(null);
  const [localZoomPercent, setLocalZoomPercent] = useState(150);
  const [localMagnifierEnabled, setLocalMagnifierEnabled] = useState(false);
  const [lensRadius, setLensRadius] = useState(() => window.innerWidth <= 700 ? 85 : 110);
  const [lensCornerRadius, setLensCornerRadius] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  const [lens, setLens] = useState<{ src: string; x: number; y: number; backgroundX: number; backgroundY: number; backgroundWidth: number; backgroundHeight: number } | null>(null);
  const zoomPercent = controlledZoomPercent ?? localZoomPercent;
  const magnifierEnabled = controlledMagnifierEnabled ?? localMagnifierEnabled;
  useEffect(() => { if (!magnifierEnabled) setLens(null); }, [magnifierEnabled]);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [pageHeight, setPageHeight] = useState(() => Math.max(420, Math.floor(window.innerHeight * 0.98) - (window.innerWidth <= 700 ? 146 : 84)));
  useEffect(() => {
    const resize = () => {
      setViewportWidth(window.innerWidth);
      setPageHeight(Math.max(420, Math.floor(window.innerHeight * 0.98) - (window.innerWidth <= 700 ? 146 : 84)));
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setProgress(0);
    setRenderError(false);
    setQrRegions({});
    void fetch(url)
      .then((response) => {
        const length = Number(response.headers.get("content-length") ?? 0);
        if (!response.ok || (Number.isFinite(length) && length > MAX_PDF_BYTES)) {
          throw new Error("pdf_too_large_or_unavailable");
        }
        return response.arrayBuffer();
      })
      .then((data) => {
        if (data.byteLength > MAX_PDF_BYTES) throw new Error("pdf_too_large");
        return pdfjsLib.getDocument({ data }).promise;
      })
      .then(async (pdf) => {
        if (pdf.numPages > MAX_PDF_PAGES) throw new Error("pdf_too_many_pages");
        const rendered: string[] = [];
        const renderScale = Math.max(2.25, Math.min(3, window.devicePixelRatio * 1.5));
        for (let i = 1; i <= pdf.numPages; i += 1) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: renderScale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({
            canvasContext: canvas.getContext("2d")!,
            viewport,
          }).promise;
          try {
            let data = "";
            let left = 0; let top = 0; let width = 0; let height = 0;
            const NativeBarcodeDetector = (window as any).BarcodeDetector;
            if (NativeBarcodeDetector) {
              const detector = new NativeBarcodeDetector({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "data_matrix"] });
              const code = (await detector.detect(canvas))[0];
              if (code?.rawValue && code.boundingBox) {
                data = code.rawValue;
                left = Math.max(0, code.boundingBox.x / canvas.width * 100);
                top = Math.max(0, code.boundingBox.y / canvas.height * 100);
                width = Math.min(100 - left, code.boundingBox.width / canvas.width * 100);
                height = Math.min(100 - top, code.boundingBox.height / canvas.height * 100);
              }
            }
            if (!data) {
              const result = await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
              const xs = result.cornerPoints.map((point) => point.x);
              const ys = result.cornerPoints.map((point) => point.y);
              data = result.data;
              left = Math.max(0, Math.min(...xs) / canvas.width * 100);
              top = Math.max(0, Math.min(...ys) / canvas.height * 100);
              width = Math.min(100 - left, (Math.max(...xs) - Math.min(...xs)) / canvas.width * 100);
              height = Math.min(100 - top, (Math.max(...ys) - Math.min(...ys)) / canvas.height * 100);
            }
            if (!cancelled && /^https?:\/\//i.test(data)) setQrRegions((current) => ({ ...current, [i - 1]: [{ data, left, top, width, height }] }));
          } catch { /* tidak ada QR/barcode yang dapat dibaca pada halaman ini */ }
          rendered.push(canvas.toDataURL("image/jpeg", 0.97));
          if (!cancelled) setProgress(Math.round((i / pdf.numPages) * 100));
        }
        if (!cancelled) setPages(rendered);
      })
      .catch(() => {
        if (!cancelled) setRenderError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (renderError)
    return (
      <div className="uploaded-preview-card">
        <div className="pdf-badge">PDF</div>
        <h2>PDF tidak dapat dirender</h2>
        <p>Silakan unggah ulang file atau gunakan viewer PDF bawaan browser.</p>
      </div>
    );
  if (!pages.length)
    return (
      <div className="uploaded-preview-card flipbook-preparation-card">
        <div className="pdf-badge">PDF</div>
        <h2>Menyiapkan flipbook…</h2>
        <p>Merender halaman {progress}%</p>
        <div className="render-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <small className="render-progress-label">{progress}% selesai</small>
      </div>
    );
  const selectedCover = coverImage || getSavedCover(title);
  const coverPlacement = placement ?? getCoverPlacement(title);
  const flipbookPages = selectedCover
    ? coverPlacement === "replace"
      ? [selectedCover, ...pages.slice(1)]
      : [selectedCover, ...pages]
    : pages;
  const isPortrait = viewportWidth <= 700;
  const pageWidth = isPortrait
    ? Math.max(280, Math.min(Math.round(pageHeight * 0.707), viewportWidth - 24))
    : Math.max(280, Math.min(Math.round(pageHeight * 0.707), Math.floor((viewportWidth - 32) / 2)));
  const moveLens = (event: any) => {
    if (!magnifierEnabled) { setLens(null); return; }
    if (event.buttons) { setLens(null); return; }
    const image = (event.target as HTMLElement).closest(".flip-page img") as HTMLImageElement | null;
    if (!image) { setLens(null); return; }
    const rect = image.getBoundingClientRect();
    const stageRect = event.currentTarget.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const offsetY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const scale = zoomPercent / 100;
    setLens({ src: image.currentSrc || image.src, x: event.clientX - stageRect.left, y: event.clientY - stageRect.top, backgroundX: lensRadius - offsetX * scale, backgroundY: lensRadius - offsetY * scale, backgroundWidth: rect.width * scale, backgroundHeight: rect.height * scale });
  };
  const turnPage = (direction: "previous" | "next") => {
    const pageFlip = flipRef.current?.pageFlip?.();
    if (!pageFlip) return;
    // Controls live outside the page-turn gesture area, so preserve the
    // animated turn rather than jumping directly to the adjacent page.
    if (direction === "previous") pageFlip.flipPrev("bottom");
    else pageFlip.flipNext("bottom");
  };
  return (
    <div ref={stageRef} className="flipbook-stage flipbook-zoom-stage" onMouseDownCapture={(event) => { if (!(event.target as Element).closest(".pdf-flipbook-navigation, .flipbook-zoom-control, .flipbook-lens-size-control")) pointerStartRef.current = { x: event.clientX, y: event.clientY }; }} onMouseMove={magnifierEnabled ? moveLens : undefined} onMouseLeave={() => setLens(null)}>
      {typeof controlledMagnifierEnabled === "undefined" && <div className="flipbook-zoom-control"><button type="button" className={magnifierEnabled ? "is-active" : ""} onClick={(event) => { event.stopPropagation(); setLocalMagnifierEnabled((enabled) => !enabled); setLens(null); }}>{magnifierEnabled ? "Kaca pembesar aktif" : "Aktifkan kaca pembesar"}</button>{magnifierEnabled && <label>Zoom <select value={zoomPercent} onClick={(event) => event.stopPropagation()} onChange={(event) => setLocalZoomPercent(Number(event.target.value))}><option value={125}>125%</option><option value={150}>150%</option><option value={175}>175%</option><option value={200}>200%</option></select></label>}</div>}
      {magnifierEnabled && <div className="flipbook-lens-size-control"><label>Ukuran <input type="range" min="85" max="400" step="5" value={lensRadius} onChange={(event) => setLensRadius(Number(event.target.value))} aria-label="Ukuran kaca pembesar" /><output>{lensRadius}px</output></label><label>Sudut <input type="range" min="0" max="50" step="1" value={lensCornerRadius} onChange={(event) => setLensCornerRadius(Number(event.target.value))} aria-label="Kelengkungan sudut kaca pembesar" /><output>{lensCornerRadius}%</output></label></div>}
      <div className="flipbook-scale-wrap"><HTMLFlipBook key={isPortrait ? "portrait" : "spread"} ref={flipRef} width={pageWidth} height={pageHeight} size="stretch" minWidth={pageWidth} maxWidth={pageWidth} minHeight={pageHeight} maxHeight={pageHeight} showCover drawShadow flippingTime={900} usePortrait={isPortrait} showPageCorners={false} disableFlipByClick clickEventForward={false} className="flipbook" startPage={0} onFlip={(event: { data: number }) => setCurrentPage(event.data)}>
        {flipbookPages.map((page, index) => {
          const sourcePageIndex = selectedCover ? (coverPlacement === "replace" ? index : index - 1) : index;
          return <div className="flip-page" key={`${title}-${index}`}><img src={page} alt={index === 0 && selectedCover ? `${title} sampul` : `${title} halaman ${index + 1}`} />{sourcePageIndex >= 0 && (qrRegions[sourcePageIndex] ?? []).map((qr, qrIndex) => <button key={`${index}-${qrIndex}`} type="button" className="pdf-qr-hotspot" aria-label="Buka media dari QR atau barcode" style={{ left: `${qr.left}%`, top: `${qr.top}%`, width: `${qr.width}%`, height: `${qr.height}%` }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }} onTouchStart={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setActiveQr(qr.data); }} />)}</div>;
        })}
      </HTMLFlipBook></div>
      <div className="pdf-flipbook-navigation" aria-label="Navigasi halaman"><button type="button" className="button quiet" disabled={currentPage <= 0} onClick={(event) => { event.preventDefault(); event.stopPropagation(); turnPage("previous"); }}>Sebelumnya</button><span className="flipbook-page-status" aria-live="polite">{currentPage + 1} / {flipbookPages.length}</span><button type="button" className="button primary" disabled={currentPage >= flipbookPages.length - 1} onClick={(event) => { event.preventDefault(); event.stopPropagation(); turnPage("next"); }}>Berikutnya</button></div>
      {lens && <span className="flipbook-magnifier" aria-hidden="true" style={{ left: lens.x, top: lens.y, width: lensRadius * 2, height: lensRadius * 2, borderRadius: `${lensCornerRadius}%`, backgroundImage: `url("${lens.src}")`, backgroundSize: `${lens.backgroundWidth}px ${lens.backgroundHeight}px`, backgroundPosition: `${lens.backgroundX}px ${lens.backgroundY}px` }} />}
      {activeQr && <div className="modal-backdrop pdf-qr-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveQr(null); }}><section className="confirm-modal qr-media-modal" role="dialog" aria-modal="true" aria-labelledby="pdf-qr-title"><p className="eyebrow">MEDIA DARI QR / BARCODE</p><h2 id="pdf-qr-title">Konten pembelajaran</h2>{youtubeEmbedUrl(activeQr) ? <iframe className="pdf-qr-player" src={youtubeEmbedUrl(activeQr)} title="Video dari QR atau barcode" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : /\.(mp3|wav|ogg|m4a)(?:$|\?)/i.test(activeQr) ? <audio className="pdf-qr-audio" controls src={activeQr}>Browser Anda tidak mendukung pemutar audio.</audio> : /\.(mp4|webm)(?:$|\?)/i.test(activeQr) ? <video className="pdf-qr-player" controls src={activeQr}>Browser Anda tidak mendukung pemutar video.</video> : <><p>Tautan hasil pemindaian siap dibuka.</p><a className="button primary" href={activeQr} target="_blank" rel="noreferrer">Buka tautan</a></>}<label className="share-link-field"><span>Tautan</span><input readOnly value={activeQr} /></label><div className="confirm-actions"><button className="button quiet" type="button" onClick={() => setActiveQr(null)}>Tutup</button></div></section></div>}
    </div>
  );
}

function RealEditorRoute({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<FoundationBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase || !bookId) return;
    void supabase
      .from("books")
      .select("id, title, draft_status, current_revision, updated_at")
      .eq("id", bookId)
      .eq("draft_status", "draft")
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (queryError)
          setError("Draf tidak dapat dimuat melalui policy aktif.");
        else if (!data) setError("Draf tidak ditemukan atau sudah diarsipkan.");
        else setBook(data as FoundationBook);
      });
  }, [bookId]);
  if (error)
    return <ErrorState title="Editor tidak tersedia">{error}</ErrorState>;
  if (!book) return <LoadingState label="Memuat draf dari Supabase dev…" />;
  return <RealEditor book={book} onSaved={setBook} />;
}

function RealEditor({
  book,
  onSaved,
}: {
  book: FoundationBook;
  onSaved: (book: FoundationBook) => void;
}) {
  const [title, setTitle] = useState(book.title);
  const [status, setStatus] = useState("Tersimpan");
  const [busy, setBusy] = useState(false);
  const [pages, setPages] = useState<
    Array<{ id: string; position: number; content: Record<string, unknown> }>
  >([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("Halaman baru");
  useEffect(() => {
    if (!supabase) return;
    void supabase.functions
      .invoke("mutate-book-draft", {
        body: { operation: "list_structure", bookId: book.id },
      })
      .then(({ data }) => {
        const rows = Array.isArray(data?.structure) ? data.structure : [];
        const next = rows
          .filter((row: any) => row.node_kind === "page")
          .map((row: any) => ({
            id: row.node_id,
            position: row.position,
            content: row.content ?? {},
          }));
        setPages(next);
        if (next[0]) {
          setSelectedPage(next[0].id);
          setPageTitle(String(next[0].content.title ?? "Halaman baru"));
        }
      });
  }, [book.id]);
  const save = async () => {
    if (!supabase || !title.trim()) return;
    setBusy(true);
    setStatus("Menyimpan…");
    const { data, error } = await supabase.functions.invoke(
      "mutate-book-draft",
      {
        body: {
          operation: "update_metadata",
          bookId: book.id,
          expectedRevision: book.current_revision,
          title: title.trim(),
          draftMetadata: {
            source: "admin-editor",
            savedAt: new Date().toISOString(),
          },
        },
      },
    );
    if (error) {
      setStatus("Gagal: revisi mungkin berubah, muat ulang lalu coba lagi.");
      setBusy(false);
      return;
    }
    const revision =
      typeof data?.revision === "number"
        ? data.revision
        : book.current_revision + 1;
    onSaved({
      ...book,
      title: title.trim(),
      current_revision: revision,
      updated_at: new Date().toISOString(),
    });
    setStatus(`Tersimpan · revisi ${revision}`);
    setBusy(false);
  };
  const savePage = async () => {
    if (!supabase) return;
    const pageId = selectedPage ?? crypto.randomUUID();
    setBusy(true);
    setStatus("Menyimpan halaman…");
    const { data, error } = await supabase.functions.invoke(
      "mutate-book-draft",
      {
        body: {
          operation: "upsert_page",
          bookId: book.id,
          pageId,
          expectedRevision: book.current_revision,
          position: selectedPage
            ? (pages.find((p) => p.id === pageId)?.position ?? pages.length)
            : pages.length,
          content: { title: pageTitle.trim() || "Halaman baru" },
        },
      },
    );
    if (error) {
      setStatus("Gagal menyimpan halaman: revisi berubah atau akses ditolak.");
      setBusy(false);
      return;
    }
    const revision =
      typeof data?.revision === "number"
        ? data.revision
        : book.current_revision + 1;
    const next = {
      id: pageId,
      position: selectedPage
        ? (pages.find((p) => p.id === pageId)?.position ?? pages.length)
        : pages.length,
      content: { title: pageTitle.trim() || "Halaman baru" },
    };
    setPages((current) =>
      current.some((p) => p.id === pageId)
        ? current.map((p) => (p.id === pageId ? next : p))
        : [...current, next],
    );
    setSelectedPage(pageId);
    onSaved({
      ...book,
      current_revision: revision,
      updated_at: new Date().toISOString(),
    });
    setStatus(`Halaman tersimpan · revisi ${revision}`);
    setBusy(false);
  };
  const addPage = () => {
    setSelectedPage(null);
    setPageTitle("Halaman baru");
    setStatus("Halaman baru belum disimpan");
  };
  return (
    <section className="editor">
      <header className="editor-bar">
        <div>
          <p className="eyebrow">EDITOR · DRAF SUPABASE DEV</p>
          <h1>{book.title}</h1>
        </div>
        <div className="editor-actions">
          <span className="save-status saved">{status}</span>
          <Link className="button quiet" to="/admin">
            Kembali
          </Link>
          <button
            className="button primary"
            disabled={busy || title.trim() === book.title}
            onClick={() => void save()}
          >
            {busy ? "Menyimpan…" : "Simpan metadata"}
          </button>
        </div>
      </header>
      <div className="editor-grid">
        <aside className="editor-left">
          <div className="tabs">
            <button className="is-active">Halaman</button>
          </div>
          <div className="page-list">
            {pages.map((page, index) => (
              <button
                key={page.id}
                className={selectedPage === page.id ? "is-selected" : ""}
                onClick={() => {
                  setSelectedPage(page.id);
                  setPageTitle(String(page.content.title ?? "Halaman baru"));
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{String(page.content.title ?? "Halaman")}</span>
              </button>
            ))}
            <button className="add-row" onClick={addPage}>
              + Tambah halaman
            </button>
            <p className="helper">
              Halaman dan metadata disimpan melalui endpoint server dengan CAS.
            </p>
          </div>
        </aside>
        <section className="canvas-wrap">
          <div className="canvas-header">
            <span>{selectedPage ? "Halaman tersimpan" : "Halaman baru"}</span>
          </div>
          <article className="canvas">
            <p className="eyebrow">BUKU DRAF</p>
            <h2>{pageTitle || "Halaman baru"}</h2>
            <p>Struktur draft nyata tersimpan di Supabase dev.</p>
          </article>
        </section>
        <aside className="inspector">
          <h2>Properti</h2>
          <label>
            Judul buku
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setStatus("Perubahan belum disimpan");
              }}
            />
          </label>
          <label>
            Judul halaman
            <input
              value={pageTitle}
              onChange={(event) => {
                setPageTitle(event.target.value);
                setStatus("Perubahan belum disimpan");
              }}
            />
          </label>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void savePage()}
          >
            {busy ? "Menyimpan…" : "Simpan halaman"}
          </button>
          <p className="helper">
            Revisi saat ini: {book.current_revision}. Konflik stale ditolak
            server.
          </p>
        </aside>
      </div>
    </section>
  );
}

function PreviewRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeSnapshot = location.state as any;
  const [snapshot] = useState(() => {
    if (routeSnapshot?.pages?.length) {
      try {
        window.sessionStorage.setItem("flipbook-studio-preview-snapshot", JSON.stringify(routeSnapshot));
      } catch {
        /* snapshot hanya tersedia selama navigasi ini */
      }
      return routeSnapshot;
    }
    try {
      const stored = window.sessionStorage.getItem("flipbook-studio-preview-snapshot");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewFlipRef = useRef<any>(null);
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});

  // PDF impor tetap disimpan sebagai berkas asli, bukan diubah menjadi bitmap.
  useEffect(() => {
    const allBlocks = Object.values(snapshot?.blocks ?? {}).flat() as Array<any>;
    const keys = [...new Set(allBlocks.map((block) => block.pdfKey).filter(Boolean))] as string[];
    keys.forEach((key) => {
      const cached = uploadedPdfUrls.get(key);
      if (cached) {
        setPdfUrls((current) => current[key] ? current : { ...current, [key]: cached });
        return;
      }
      loadPdfBlob(key, (url) => {
        uploadedPdfUrls.set(key, url);
        setPdfUrls((current) => current[key] ? current : { ...current, [key]: url });
      });
    });
  }, [snapshot]);

  if (!snapshot?.pages?.length) {
    return <ErrorState title="Pratinjau belum tersedia">Buka pratinjau dari editor untuk melihat halaman yang sedang dibuat.</ErrorState>;
  }

  const pages = snapshot.pages as Array<{ id: string; label: string; body: string }>;
  const blocks = snapshot.blocks ?? {};
  const pageHeight = Math.max(360, window.innerHeight - Math.round(window.innerHeight * 0.02) - 84);
  const pageWidth = Math.round(pageHeight * (210 / 297));
  // The editor canvas is an A4 page with a 560px content width plus 43px
  // padding on both sides. Components are stored in that editor coordinate space.
  const editorCanvasWidth = 646;
  const editorCanvasHeight = 914;
  const scaleX = pageWidth / editorCanvasWidth;
  const scaleY = pageHeight / editorCanvasHeight;
  const bookPages = pages;
  const fillsPageHeight = (block: any) =>
    block.type === "Gambar" && block.y <= 0 && (block.height ?? 0) >= editorCanvasHeight * .85;
  const renderPage = (page: (typeof pages)[number], index: number) => {
    const pageBlocks = blocks[page.id] ?? [];
    const isText = (block: any) => block.type === "Judul" || block.type === "Paragraf";
    const blank = page.body === "" || page.body.startsWith("Gambar impor:") || (pageBlocks.length === 0 && page.id.startsWith("import-"));
    const fullPage = pageBlocks.some((block: any) => block.fullPage || block.id.startsWith("import-"));
    return <div className="flipbook-canvas-page" key={page.id}>
      {!blank && !fullPage && <><div className="preview-canvas-header">{snapshot.canvasHeader}</div><p className="preview-canvas-eyebrow">BAGIAN {String(index + 1).padStart(2, "0")}</p><h3>{index === snapshot.selectedIndex ? snapshot.title : page.label}</h3><p className="preview-canvas-intro">{page.body}</p></>}
      {pageBlocks.map((block: any) => <section key={block.id} className={`preview-canvas-block type-${block.type.toLowerCase()}${block.fullPage ? " is-full-page" : ""}${fillsPageHeight(block) ? " fills-page-height" : ""}${block.preserveAspectRatio ? " preserve-aspect" : ""}${block.showQr ? " is-qr" : ""}`} style={{ left: block.x * scaleX, top: block.y * scaleY, bottom: fillsPageHeight(block) ? 0 : undefined, width: isText(block) ? (block.width ?? 320) * scaleX : (block.showQr || block.type === "Gambar") ? (block.width ?? 260) * scaleX : undefined, height: !block.fullPage && !fillsPageHeight(block) && (block.showQr || block.type === "Gambar") ? (block.height ?? (block.showQr ? 260 : 220)) * scaleY : undefined, minHeight: isText(block) ? (block.height ?? (block.type === "Judul" ? 72 : 112)) * scaleY : undefined }}>
        {block.showQr && block.url && <img className="flipbook-qr" src={`https://quickchart.io/qr?size=360&margin=2&text=${encodeURIComponent(block.url)}`} alt={`QR Code untuk ${block.text}`} />}
        {block.type === "Gambar" ? block.pdfKey ? (pdfUrls[block.pdfKey] ? <iframe className="embedded-pdf-page" src={`${pdfUrls[block.pdfKey]}#page=${block.pdfPage ?? 1}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`} title={block.text} /> : <span className="flipbook-preview-media">Memuat PDF…</span>) : block.imageSrc ? <img src={block.imageSrc} alt={block.text} /> : <span className="flipbook-preview-media">Gambar · {block.text}</span> : isText(block) ? <div style={{ color: block.fontColor ?? "#315e62", fontFamily: block.fontFamily ?? "Arial", fontSize: `${block.fontSize ?? (block.type === "Judul" ? 28 : 16)}px`, fontWeight: block.fontWeight ?? (block.type === "Judul" ? "bold" : "normal"), fontStyle: block.fontStyle ?? "normal", textAlign: block.textAlign ?? "left", textDecoration: block.textDecoration ?? "none" }}>{block.text}</div> : <span className="flipbook-preview-media">{block.type} · {block.text}</span>}
      </section>)}
    </div>;
  };

  return <main className="standalone-flipbook-reader" aria-label="Pratinjau flipbook">
    <header><strong>{snapshot.book?.title ?? "Pratinjau flipbook"}</strong><div className="reader-actions"><button type="button" className="button quiet" onClick={() => window.print()}>Cetak</button><button type="button" className="button quiet" onClick={() => navigate("/admin/collection")}>Keluar</button></div></header>
    <section className="standalone-flipbook-stage">
      <HTMLFlipBook ref={previewFlipRef} width={pageWidth} height={pageHeight} size="stretch" minWidth={260} maxWidth={pageWidth} minHeight={368} maxHeight={pageHeight} showCover drawShadow flippingTime={650} usePortrait={false} className="editor-preview-flipbook" startPage={0} showPageCorners={false} disableFlipByClick clickEventForward={false} mobileScrollSupport={false} onInit={() => { const cover = previewFlipRef.current?.pageFlip().getPageCollection().getPage(0) as { setDensity: (density: "soft") => void } | undefined; cover?.setDensity("soft"); }} onFlip={(event: { data: number }) => setPreviewIndex(event.data)}>
        {bookPages.map((page, index) => renderPage(page, pages.indexOf(page)))}
      </HTMLFlipBook>
    </section>
    <footer><button className="button quiet" type="button" disabled={previewIndex === 0} onClick={() => previewFlipRef.current?.pageFlip().flipPrev("bottom")}>Sebelumnya</button><button className="button primary" type="button" disabled={previewIndex >= bookPages.length - 1} onClick={() => previewFlipRef.current?.pageFlip().flipNext("bottom")}>Berikutnya</button></footer>
  </main>;
}

function Editor({
  book,
}: {
  book: MockBook;
}) {
  const navigate = useNavigate();
  type CanvasBlock = {
    id: string;
    type:
      | "Judul"
      | "Paragraf"
      | "Gambar"
      | "Tombol"
      | "Aktivitas"
      | "Video"
      | "Suara";
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    textDecoration?: "none" | "underline";
    textAlign?: "left" | "center" | "right" | "justify";
    fontColor?: string;
    imageSrc?: string;
    pdfKey?: string;
    pdfPage?: number;
    pdfAspectRatio?: number;
    pdfName?: string;
    url?: string;
    showQr?: boolean;
    fullPage?: boolean;
    preserveAspectRatio?: boolean;
  };
  const editorPagesKey = `flipbook-studio-interactive-pages-${book.id}`;
  const [pages, setPages] = useState(() => {
    if (book.id === "new-interactive-book") return book.pages;
    try {
      const raw = window.localStorage.getItem(editorPagesKey);
      const stored = raw ? JSON.parse(raw) : null;
      return Array.isArray(stored) && stored.length ? stored : book.pages;
    } catch {
      return book.pages;
    }
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saved, setSaved] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const publicationKey = `flipbook-studio-publication-status-${book.id}`;
  const [publicationStatus, setPublicationStatus] = useState<"Draf" | "Terpublikasi">(() => {
    const stored = window.localStorage.getItem(publicationKey);
    return stored === "Terpublikasi" ? "Terpublikasi" : "Draf";
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewDirection, setPreviewDirection] = useState<"forward" | "backward">("forward");
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const previewFlipRef = useRef<any>(null);
  const [pagesToDelete, setPagesToDelete] = useState<string[]>([]);
  const [pageSelection, setPageSelection] = useState("");
  const [confirmAllDelete, setConfirmAllDelete] = useState(false);
  useEffect(() => {
    if (!deleteDialogOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [deleteDialogOpen]);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("interactive-editor-changes", { detail: !saved }),
    );
  }, [saved]);
  const [title, setTitle] = useState(book.pages[0]?.label ?? "Halaman baru");
  const [canvasHeader, setCanvasHeader] = useState(
    "E-MODUL IPAS KELAS V  |  PERAN MANUSIA DALAM EKOSISTEM",
  );
  const [blocks, setBlocks] = useState<Record<string, CanvasBlock[]>>({});
  const [editorPdfUrls, setEditorPdfUrls] = useState<Record<string, string>>({});
  const [importError, setImportError] = useState("");
  const [availableVideos, setAvailableVideos] = useState<Array<{ id: string; title: string; public_url: string }>>([]);
  const [availableAudios, setAvailableAudios] = useState<Array<{ id: string; title: string; public_url: string }>>([]);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showAudioLibrary, setShowAudioLibrary] = useState(false);
  const [showVideoSourcePicker, setShowVideoSourcePicker] = useState(false);
  const [showYoutubeLinkModal, setShowYoutubeLinkModal] = useState(false);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [youtubeLinkError, setYoutubeLinkError] = useState("");
  const [videoTargetBlockId, setVideoTargetBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [insertAt, setInsertAt] = useState(1);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorHistoryRef = useRef<string[]>([]);
  const editorHistoryPositionRef = useRef(-1);
  const restoringHistoryRef = useRef(false);
  const [historyControls, setHistoryControls] = useState({ canUndo: false, canRedo: false });
  const selected = pages[selectedIndex];
  useEffect(() => {
    const snapshot = JSON.stringify({ pages, blocks, canvasHeader });
    if (restoringHistoryRef.current) {
      restoringHistoryRef.current = false;
      return;
    }
    const history = editorHistoryRef.current.slice(0, editorHistoryPositionRef.current + 1);
    if (history[history.length - 1] === snapshot) return;
    history.push(snapshot);
    editorHistoryRef.current = history.slice(-50);
    editorHistoryPositionRef.current = editorHistoryRef.current.length - 1;
    setHistoryControls({ canUndo: editorHistoryPositionRef.current > 0, canRedo: false });
  }, [pages, blocks, canvasHeader]);
  const restoreHistory = (direction: -1 | 1) => {
    const nextPosition = editorHistoryPositionRef.current + direction;
    const snapshot = editorHistoryRef.current[nextPosition];
    if (!snapshot) return;
    const next = JSON.parse(snapshot);
    restoringHistoryRef.current = true;
    editorHistoryPositionRef.current = nextPosition;
    setPages(next.pages);
    setBlocks(next.blocks);
    setCanvasHeader(next.canvasHeader);
    const nextIndex = Math.min(selectedIndex, Math.max(0, next.pages.length - 1));
    setSelectedIndex(nextIndex);
    setTitle(next.pages[nextIndex]?.label ?? "Halaman baru");
    setSelectedBlockId(null);
    setSaved(false);
    setHistoryControls({
      canUndo: nextPosition > 0,
      canRedo: nextPosition < editorHistoryRef.current.length - 1,
    });
  };
  useEffect(() => {
    const save = (event: Event) => {
      const storageKey = (event as CustomEvent<{ storageKey?: string }>).detail?.storageKey ?? editorPagesKey;
      try {
        const documentState = { version: 1, pages, blocks, canvasHeader, title, publicationStatus };
        saveEditorDocument(storageKey, documentState);
        window.localStorage.setItem(storageKey, JSON.stringify(pages));
        window.localStorage.setItem(`${storageKey}-document`, JSON.stringify(documentState));
      } catch {
        // Draf lengkap tetap tersimpan di IndexedDB; localStorage hanya cache kompatibilitas.
      }
      setSaved(true);
    };
    window.addEventListener("interactive-editor-save", save);
    return () => window.removeEventListener("interactive-editor-save", save);
  }, [editorPagesKey, pages, blocks, canvasHeader, title, publicationStatus]);
  useEffect(() => {
    let active = true;
    const restoreDocument = (documentState: any) => {
      if (!active || !documentState || !Array.isArray(documentState.pages)) return;
      setPages(documentState.pages);
      if (documentState.blocks && typeof documentState.blocks === "object") setBlocks(documentState.blocks);
      if (typeof documentState.canvasHeader === "string") setCanvasHeader(documentState.canvasHeader);
      if (typeof documentState.title === "string") setTitle(documentState.title);
    };
    try {
      const raw = window.localStorage.getItem(`${editorPagesKey}-document`);
      const documentState = raw ? JSON.parse(raw) : null;
      restoreDocument(documentState);
    } catch {
      setImportError("Draf lokal tidak dapat dipulihkan. Periksa penyimpanan browser.");
    }
    loadEditorDocument(editorPagesKey, restoreDocument);
    return () => { active = false; };
  }, [editorPagesKey]);
  useEffect(() => {
    const keys = [...new Set(Object.values(blocks).flat().map((block) => block.pdfKey).filter(Boolean))] as string[];
    keys.forEach((key) => {
      const cached = uploadedPdfUrls.get(key);
      if (cached) {
        setEditorPdfUrls((current) => current[key] ? current : { ...current, [key]: cached });
        return;
      }
      loadPdfBlob(key, (url) => {
        uploadedPdfUrls.set(key, url);
        setEditorPdfUrls((current) => current[key] ? current : { ...current, [key]: url });
      });
    });
  }, [blocks]);
  useEffect(() => {
    const missingRatios = Object.values(blocks)
      .flat()
      .filter((block) => block.pdfKey && !block.pdfAspectRatio) as CanvasBlock[];
    const keys = [...new Set(missingRatios.map((block) => block.pdfKey!))];
    keys.forEach((key) => {
      const hydrate = async (url: string) => {
        const pdf = await pdfjsLib.getDocument({ url }).promise;
        const ratios = new Map<number, number>();
        for (const block of missingRatios.filter((item) => item.pdfKey === key)) {
          const pageNumber = block.pdfPage ?? 1;
          if (!ratios.has(pageNumber)) {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1 });
            ratios.set(pageNumber, viewport.width / viewport.height);
          }
        }
        setBlocks((current) => Object.fromEntries(Object.entries(current).map(([pageId, pageBlocks]) => [
          pageId,
          pageBlocks.map((block) => block.pdfKey === key && !block.pdfAspectRatio
            ? { ...block, pdfAspectRatio: ratios.get(block.pdfPage ?? 1) }
            : block),
        ])));
      };
      const cached = uploadedPdfUrls.get(key);
      if (cached) void hydrate(cached).catch(() => undefined);
      else loadPdfBlob(key, (url) => void hydrate(url).catch(() => undefined));
    });
  }, [blocks]);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: media } = await supabase.from("published_media").select("id,title,public_url,media_type").eq("owner_admin_id", data.user.id).order("created_at", { ascending: false });
      if (media) { setAvailableVideos(media.filter((item) => item.media_type === "video")); setAvailableAudios(media.filter((item) => item.media_type === "audio")); }
    });
  }, []);
  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!saved) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [saved]);
  const selectedBlocks = selected ? (blocks[selected.id] ?? []) : [];
  const selectedBlock = selectedBlocks.find((block) => block.id === selectedBlockId);
  const isTextBlock = (block?: CanvasBlock) =>
    block?.type === "Judul" || block?.type === "Paragraf";
  const isBlankCanvas =
    selected?.body === "" ||
    selected?.body.startsWith("Gambar impor:") ||
    (selectedBlocks.length === 0 && selected?.id.startsWith("import-"));
  const isFullPage = selectedBlocks.some(
    (block) => block.fullPage || block.id.startsWith("import-"),
  );
  const nativePdfBlock = selectedBlocks.find(
    (block) => block.fullPage && block.pdfKey,
  );
  const previewPage = pages[previewIndex];
  const previewBlocks = previewPage ? (blocks[previewPage.id] ?? []) : [];
  const previewIsBlank =
    previewPage?.body === "" ||
    previewPage?.body.startsWith("Gambar impor:") ||
    (previewBlocks.length === 0 && previewPage?.id.startsWith("import-"));
  const previewIsFullPage = previewBlocks.some(
    (block) => block.fullPage || block.id.startsWith("import-"),
  );
  const previewPageHeight = previewFullscreen
    ? Math.max(360, window.innerHeight - Math.round(window.innerHeight * 0.02) - 84)
    : 594;
  const previewPageWidth = previewFullscreen
    ? Math.round(previewPageHeight * (210 / 297))
    : 420;
  const previewBookPages = pages;
  const setPublication = (status: "Draf" | "Terpublikasi") => {
    setPublicationStatus(status);
    window.localStorage.setItem(publicationKey, status);
  };
  const renderPreviewCanvas = (page: (typeof pages)[number], index: number) => {
    const pageBlocks = blocks[page.id] ?? [];
    const blank = page.body === "" || page.body.startsWith("Gambar impor:") || (pageBlocks.length === 0 && page.id.startsWith("import-"));
    const fullPage = pageBlocks.some((block) => block.fullPage || block.id.startsWith("import-"));
    return <div className="flipbook-canvas-page" key={page.id}>
      {!blank && !fullPage && <><div className="preview-canvas-header">{canvasHeader}</div><p className="preview-canvas-eyebrow">BAGIAN {String(index + 1).padStart(2, "0")}</p><h3>{index === selectedIndex ? title : page.label}</h3><p className="preview-canvas-intro">{page.body}</p></>}
      {pageBlocks.map((block) => <section key={block.id} className={`preview-canvas-block type-${block.type.toLowerCase()}${block.fullPage ? " is-full-page" : ""}${block.preserveAspectRatio ? " preserve-aspect" : ""}`} style={{ left: block.x, top: block.y, width: isTextBlock(block) ? block.width ?? 320 : (block.showQr || block.type === "Gambar") ? block.width ?? 260 : undefined, height: !block.fullPage && (block.showQr || block.type === "Gambar") ? block.height ?? (block.showQr ? 260 : 220) : undefined, minHeight: isTextBlock(block) ? block.height ?? (block.type === "Judul" ? 72 : 112) : undefined }}>
        {block.type === "Gambar" ? block.pdfKey ? (editorPdfUrls[block.pdfKey] ? <iframe className="embedded-pdf-page" src={`${editorPdfUrls[block.pdfKey]}#page=${block.pdfPage ?? 1}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`} title={block.text} /> : <span className="flipbook-preview-media">Memuat PDF…</span>) : block.imageSrc ? <img src={block.imageSrc} alt={block.text} /> : <span className="flipbook-preview-media">Gambar · {block.text}</span> : isTextBlock(block) ? <div style={{ color: block.fontColor ?? "#315e62", fontFamily: block.fontFamily ?? "Arial", fontSize: `${block.fontSize ?? (block.type === "Judul" ? 28 : 16)}px`, fontWeight: block.fontWeight ?? (block.type === "Judul" ? "bold" : "normal"), fontStyle: block.fontStyle ?? "normal", textAlign: block.textAlign ?? "left", textDecoration: block.textDecoration ?? "none" }}>{block.text}</div> : <span className="flipbook-preview-media">{block.type} · {block.text}</span>}
      </section>)}
    </div>;
  };
  const addPage = () => {
    const next = {
      id: `page-${Date.now()}`,
      label: `Halaman ${pages.length + 1}`,
      kind: "Halaman" as const,
      body: "",
    };
    setPages((current) => [...current, next]);
    setSelectedIndex(pages.length);
    setTitle(next.label);
    setSaved(false);
  };
  const openDeleteDialog = () => {
    if (!selected) return;
    setPagesToDelete([selected.id]);
    setPageSelection(String(selectedIndex + 1));
    setConfirmAllDelete(false);
    setDeleteDialogOpen(true);
  };
  const selectPagesFromText = (value: string) => {
    setPageSelection(value);
    const numbers = new Set<number>();
    value.split(",").forEach((part) => {
      const [fromText, toText] = part.trim().split("-");
      const from = Number(fromText);
      const to = Number(toText ?? fromText);
      if (!Number.isInteger(from) || !Number.isInteger(to)) return;
      for (let number = Math.max(1, Math.min(from, to)); number <= Math.min(pages.length, Math.max(from, to)); number += 1) numbers.add(number);
    });
    setPagesToDelete(pages.filter((_page, index) => numbers.has(index + 1)).map((page) => page.id));
  };
  const deletePages = () => {
    if (!pagesToDelete.length) return;
    const selectedIds = new Set(pagesToDelete);
    const remainingPages = pages.filter((page) => !selectedIds.has(page.id));
    const nextPages = remainingPages.length
      ? remainingPages
      : [{ id: `page-${Date.now()}`, label: "Halaman 1", kind: "Halaman" as const, body: "" }];
    setBlocks((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([id]) => !selectedIds.has(id)),
      ),
    );
    const nextIndex = Math.min(selectedIndex, nextPages.length - 1);
    setSelectedIndex(nextIndex);
    setTitle(nextPages[nextIndex].label);
    setDeleteDialogOpen(false);
    setSaved(false);
  };
  const addComponent = (type: CanvasBlock["type"]) => {
    if (!selected) return;
    const copy: Record<CanvasBlock["type"], string> = {
      Judul: "Judul baru",
      Paragraf: "Tulis paragraf untuk halaman ini.",
      Gambar: "Area gambar",
      Tombol: "Tombol aksi",
      Aktivitas: "Pertanyaan interaktif",
      Video: "Video YouTube",
      Suara: "Audio",
    };
    const next = {
      id: `${type}-${Date.now()}`,
      type,
      text: copy[type],
      x: 36,
      y: 190 + ((selectedBlocks.length * 86) % 330),
      ...(type === "Judul"
        ? { width: 320, height: 72, fontSize: 28, fontFamily: "Arial", fontWeight: "bold" as const }
        : type === "Paragraf"
          ? { width: 320, height: 112, fontSize: 16, fontFamily: "Arial", fontWeight: "normal" as const }
          : {}),
    };
    setBlocks((current) => ({
      ...current,
      [selected.id]: [...(current[selected.id] ?? []), next],
    }));
    setSelectedBlockId(next.id);
    if (type === "Video") {
      setVideoTargetBlockId(next.id);
      setShowVideoSourcePicker(true);
    }
    if (type === "Suara") {
      setVideoTargetBlockId(next.id);
      setShowAudioLibrary(true);
    }
    setSaved(false);
  };
  const updateBlock = (id: string, text: string) => {
    if (!selected) return;
    setBlocks((current) => ({
      ...current,
      [selected.id]: (current[selected.id] ?? []).map((block) =>
        block.id === id ? { ...block, text } : block,
      ),
    }));
    setSaved(false);
  };
  const updateBlockUrl = (id: string, url: string) => {
    if (!selected) return;
    setBlocks((current) => ({
      ...current,
      [selected.id]: (current[selected.id] ?? []).map((block) =>
        block.id === id ? { ...block, url, showQr: false } : block,
      ),
    }));
    setSaved(false);
  };
  const setVideoFromQrCollection = (id: string, url: string) => {
    if (!selected) return;
    setBlocks((current) => ({ ...current, [selected.id]: (current[selected.id] ?? []).map((block) => block.id === id ? { ...block, url, showQr: true } : block) }));
    setSaved(false);
  };
  const updateBlockStyle = (
    id: string,
    style: Pick<CanvasBlock, "fontSize" | "fontFamily" | "fontWeight" | "fontStyle" | "textDecoration" | "textAlign" | "fontColor">,
  ) => {
    if (!selected) return;
    setBlocks((current) => ({
      ...current,
      [selected.id]: (current[selected.id] ?? []).map((block) =>
        block.id === id ? { ...block, ...style } : block,
      ),
    }));
    setSaved(false);
  };
  const removeBlock = (id: string) => {
    if (!selected) return;
    const removed = selectedBlocks.find((block) => block.id === id);
    setBlocks((current) => ({
      ...current,
      [selected.id]: (current[selected.id] ?? []).filter(
        (block) => block.id !== id,
      ),
    }));
    if (removed?.fullPage || removed?.id.startsWith("import-")) {
      setPages((current) =>
        current.map((page) =>
          page.id === selected.id ? { ...page, body: "" } : page,
        ),
      );
    }
    if (selectedBlockId === id) setSelectedBlockId(null);
    setSaved(false);
  };
  const cancelPendingMedia = () => {
    if (selected && videoTargetBlockId) {
      setBlocks((current) => ({ ...current, [selected.id]: (current[selected.id] ?? []).filter((block) => block.id !== videoTargetBlockId) }));
      setSelectedBlockId(null);
      setSaved(false);
    }
    setShowYoutubeLinkModal(false); setShowVideoSourcePicker(false); setShowVideoLibrary(false); setShowAudioLibrary(false); setVideoTargetBlockId(null);
  };
  const youtubeEmbedUrl = (value?: string) => {
    if (!value) return "";
    try {
      const url = new URL(value);
      const id = url.hostname.includes("youtu.be")
        ? url.pathname.slice(1)
        : url.searchParams.get("v") ||
          url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
    } catch {
      return "";
    }
  };
  const insertYoutubeVideo = () => {
    if (!videoTargetBlockId || !youtubeEmbedUrl(youtubeLink)) { setYoutubeLinkError("Masukkan tautan YouTube yang valid."); return; }
    setVideoFromQrCollection(videoTargetBlockId, youtubeLink.trim());
    setShowYoutubeLinkModal(false); setVideoTargetBlockId(null); setYoutubeLink(""); setYoutubeLinkError("");
  };
  const moveBlock = (
    event: React.PointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    if (!selected) return;
    event.preventDefault();
    const canvas = event.currentTarget.closest(".canvas") as HTMLElement | null;
    const block = (blocks[selected.id] ?? []).find((item) => item.id === id);
    if (!canvas || !block) return;
    const originX = event.clientX;
    const originY = event.clientY;
    const initialX = block.x;
    const initialY = block.y;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const blockWidth = block.width ?? (block.showQr ? 260 : block.type === "Gambar" ? 260 : isTextBlock(block) ? 320 : 185);
      const blockHeight = block.height ?? (block.showQr ? 260 : block.type === "Gambar" ? 220 : block.type === "Judul" ? 72 : isTextBlock(block) ? 112 : 110);
      const maxX = Math.max(0, canvas.clientWidth - blockWidth);
      const maxY = Math.max(0, canvas.clientHeight - blockHeight);
      const x = Math.max(
        0,
        Math.min(maxX, initialX + moveEvent.clientX - originX),
      );
      const y = Math.max(
        0,
        Math.min(maxY, initialY + moveEvent.clientY - originY),
      );
      setBlocks((current) => ({
        ...current,
        [selected.id]: (current[selected.id] ?? []).map((item) =>
          item.id === id ? { ...item, x, y } : item,
        ),
      }));
      setSaved(false);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };
  const resizeBlock = (
    event: React.PointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    if (!selected) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = event.currentTarget.closest(".canvas") as HTMLElement | null;
    const block = (blocks[selected.id] ?? []).find((item) => item.id === id);
    if (!canvas || !block) return;
    const originX = event.clientX;
    const originY = event.clientY;
    const initialWidth = block.width ?? (block.showQr ? 260 : block.type === "Gambar" ? 260 : 320);
    const initialHeight = block.height ?? (block.showQr ? 260 : block.type === "Gambar" ? 220 : block.type === "Judul" ? 72 : 112);
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const maxWidth = Math.max(1, canvas.clientWidth - block.x);
      const maxHeight = Math.max(1, canvas.clientHeight - block.y);
      const clamp = (value: number, minimum: number, maximum: number) =>
        Math.min(Math.max(value, Math.min(minimum, maximum)), maximum);
      const side = clamp(
        initialWidth + moveEvent.clientX - originX,
        120,
        Math.min(maxWidth, maxHeight),
      );
      const width = block.showQr
        ? side
        : clamp(initialWidth + moveEvent.clientX - originX, 120, maxWidth);
      const height = block.showQr
        ? side
        : clamp(initialHeight + moveEvent.clientY - originY, 48, maxHeight);
      setBlocks((current) => ({
        ...current,
        [selected.id]: (current[selected.id] ?? []).map((item) =>
          item.id === id ? { ...item, width, height } : item,
        ),
      }));
      setSaved(false);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };
  const insertImportedPages = async (file: File) => {
    setImporting(true);
    setImportError("");
    try {
      const baseName = file.name.replace(/\.[^/.]+$/, "") || "Dokumen impor";
      const imported: Array<{
        page: (typeof pages)[number];
        block: CanvasBlock;
      }> = [];
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        const validationError = validatePdfFile(file);
        if (validationError) throw new Error(validationError);
        // Hanya membaca metadata dan jumlah halaman. PDF tidak dirender ke
        // canvas agar teks/vector asli dari Word tetap tajam.
        const documentPdf = await pdfjsLib.getDocument({
          data: await file.arrayBuffer(),
        }).promise;
        if (documentPdf.numPages > MAX_PDF_PAGES) {
          throw new Error(`PDF maksimal ${MAX_PDF_PAGES} halaman.`);
        }
        const pdfKey = `editor-pdf-${book.id}-${Date.now()}`;
        const pdfUrl = URL.createObjectURL(file);
        uploadedPdfUrls.set(pdfKey, pdfUrl);
        setEditorPdfUrls((current) => ({ ...current, [pdfKey]: pdfUrl }));
        savePdfBlob(pdfKey, file);
        for (let index = 1; index <= documentPdf.numPages; index += 1) {
          const sourcePage = await documentPdf.getPage(index);
          const sourceViewport = sourcePage.getViewport({ scale: 1 });
          const id = `import-${Date.now()}-${index}`;
          imported.push({
            page: {
              id,
              label: `${baseName} · ${index}`,
              kind: "Halaman" as const,
              body: `Halaman ${index} dari ${file.name}`,
            },
            block: {
              id: `${id}-image`,
              type: "Gambar",
              text: `Halaman ${index}`,
              pdfKey,
              pdfPage: index,
              pdfAspectRatio: sourceViewport.width / sourceViewport.height,
              pdfName: file.name,
              x: 0,
              y: 0,
              fullPage: true,
            },
          });
        }
      } else if (file.type.startsWith("image/")) {
        const imageSrc = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
          image.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
          image.src = imageSrc;
        });
        const id = `image-${Date.now()}`;
        const width = 260;
        const height = Math.max(120, Math.min(330, Math.round(width * dimensions.height / dimensions.width)));
        setBlocks((current) => ({
          ...current,
          [selected.id]: [...(current[selected.id] ?? []), {
            id,
            type: "Gambar",
            text: baseName,
            imageSrc,
            x: 48,
            y: 48,
            width,
            height,
            preserveAspectRatio: true,
          }],
        }));
        setSelectedBlockId(id);
        setSaved(false);
        return;
      }
      if (!imported.length) return;
      const position = Math.max(0, Math.min(pages.length, insertAt - 1));
      setPages((current) => [
        ...current.slice(0, position),
        ...imported.map((item) => item.page),
        ...current.slice(position),
      ]);
      setBlocks((current) => ({
        ...current,
        ...Object.fromEntries(
          imported.map((item) => [item.page.id, [item.block]]),
        ),
      }));
      setSelectedIndex(position);
      setTitle(imported[0].page.label);
      setSaved(false);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Dokumen tidak dapat diimpor.");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };
  if (!selected)
    return (
      <ErrorState title="Draf kosong">
        Tambahkan halaman untuk mulai menyusun flipbook.
      </ErrorState>
    );
  const components: Array<{ type: CanvasBlock["type"]; icon: ReactNode }> = [
    { type: "Judul", icon: <Type /> },
    { type: "Paragraf", icon: <AlignLeft /> },
    { type: "Gambar", icon: <ImageIcon /> },
    { type: "Video", icon: <Video /> },
    { type: "Suara", icon: <Music2 /> },
  ];
  if (previewOpen) return (
    <main className="standalone-flipbook-reader" aria-label="Pratinjau flipbook">
      <header><strong>{book.title}</strong><button type="button" className="button quiet" onClick={() => { setPreviewOpen(false); setPreviewFullscreen(false); }}>Keluar</button></header>
      <section className="standalone-flipbook-stage">
        <HTMLFlipBook ref={previewFlipRef} width={previewPageWidth} height={previewPageHeight} size="stretch" minWidth={260} maxWidth={previewPageWidth} minHeight={368} maxHeight={previewPageHeight} showCover drawShadow flippingTime={800} usePortrait className="editor-preview-flipbook" startPage={previewIndex} showPageCorners={false} disableFlipByClick={false} clickEventForward={false} mobileScrollSupport={false} onInit={() => { const cover = previewFlipRef.current?.pageFlip().getPageCollection().getPage(0) as { setDensity: (density: "soft") => void } | undefined; cover?.setDensity("soft"); }} onFlip={(event: { data: number }) => setPreviewIndex(event.data)}>
          {previewBookPages.map((page) => renderPreviewCanvas(page, pages.indexOf(page)))}
        </HTMLFlipBook>
      </section>
      <footer><button className="button quiet" type="button" disabled={previewIndex === 0} onClick={() => previewFlipRef.current?.pageFlip().flipPrev()}>Sebelumnya</button><button className="button primary" type="button" disabled={previewIndex === previewBookPages.length - 1} onClick={() => previewFlipRef.current?.pageFlip().flipNext()}>Berikutnya</button></footer>
    </main>
  );
  return (
    <section className="editor interactive-editor">
      <div className="editor-grid">
        <aside className="editor-left editor-sidebar">
          <section className="sidebar-section page-picker">
            <h2>Halaman</h2>
            <div
              className="page-stepper"
              aria-label={`Halaman ${selectedIndex + 1} dari ${pages.length}`}
            >
              <button
                type="button"
                aria-label="Halaman sebelumnya"
                disabled={selectedIndex === 0}
                onClick={() => {
                  const index = selectedIndex - 1;
                  setSelectedIndex(index);
                  setTitle(pages[index].label);
                }}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <div className="page-number-field" aria-live="polite">
                <strong>{selectedIndex + 1}</strong>
              </div>
              <button
                type="button"
                aria-label="Halaman berikutnya"
                disabled={selectedIndex === pages.length - 1}
                onClick={() => {
                  const index = selectedIndex + 1;
                  setSelectedIndex(index);
                  setTitle(pages[index].label);
                }}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>
          <section id="aktivitas" className="sidebar-section component-section">
            <h2>Komponen</h2>
            <div className="component-list">
              {components.map((item) => (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => item.type === "Gambar" ? imageInputRef.current?.click() : addComponent(item.type)}
                >
                  <span>{item.icon}</span>
                  <strong>{item.type}</strong>
                  <small>{item.type === "Gambar" ? "Pilih file gambar" : "Tambahkan ke kanvas"}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>
        <section className="canvas-wrap">
          <div className="canvas-header">
            <span>
              Halaman {selectedIndex + 1} dari {pages.length}
            </span>
            <span>{nativePdfBlock ? "PDF asli" : "A4 · 210 × 297 mm"}</span>
          </div>
          <article
            className={`canvas${nativePdfBlock ? " native-pdf-canvas" : ""}`}
            aria-label={nativePdfBlock ? "Halaman PDF asli" : "Kanvas A4"}
            style={nativePdfBlock ? { aspectRatio: `${nativePdfBlock.pdfAspectRatio ?? (210 / 297)}` } : undefined}
          >
            {!isBlankCanvas && !isFullPage && (
              <>
                <div
                  className="canvas-page-header"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(event) => {
                    setCanvasHeader(
                      event.currentTarget.textContent || "HEADER MODUL",
                    );
                    setSaved(false);
                  }}
                >
                  {canvasHeader}
                </div>
                <p className="eyebrow">
                  BAGIAN {String(selectedIndex + 1).padStart(2, "0")}
                </p>
                <h2
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(event) => {
                    const nextTitle = event.currentTarget.textContent || "Halaman baru";
                    setTitle(nextTitle);
                    setPages((current) => current.map((page, index) => index === selectedIndex ? { ...page, label: nextTitle } : page));
                    setSaved(false);
                  }}
                >
                  {title}
                </h2>
                <p className="canvas-intro">{selected.body}</p>
              </>
            )}
            {selectedBlocks.map((block) => (
              <section
                className={`canvas-block type-${block.type.toLowerCase()}${block.fullPage ? " is-full-page" : ""}${block.preserveAspectRatio ? " preserve-aspect" : ""}${selectedBlockId === block.id ? " is-selected" : ""}`}
                style={{ left: block.x, top: block.y, width: isTextBlock(block) ? block.width ?? 320 : (block.showQr || block.type === "Gambar") ? block.width ?? 260 : undefined, height: !block.fullPage && (block.showQr || block.type === "Gambar") ? block.height ?? (block.showQr ? 260 : 220) : undefined, minHeight: isTextBlock(block) ? block.height ?? (block.type === "Judul" ? 72 : 112) : undefined }}
                key={block.id}
                onMouseDown={() => setSelectedBlockId(block.id)}
              >
                {!block.fullPage && <>
                  <button
                    className="canvas-drag-handle"
                    type="button"
                    aria-label={`Pindahkan ${block.type}`}
                    title="Geser komponen"
                    onPointerDown={(event) => moveBlock(event, block.id)}
                  >
                    ⠿
                  </button>
                  <button
                    className="canvas-delete-control"
                    type="button"
                    aria-label={`Hapus ${block.type}`}
                    title="Hapus komponen"
                    onClick={() => removeBlock(block.id)}
                  >
                    ×
                  </button>
                  {(isTextBlock(block) || block.showQr || block.type === "Gambar") && selectedBlockId === block.id && (
                    <button
                      className="canvas-resize-handle"
                      type="button"
                      aria-label={`Ubah ukuran ${block.showQr ? "QR Code" : `kotak ${block.type}`}`}
                      title={block.showQr ? "Tarik untuk memperbesar atau memperkecil QR Code" : "Tarik untuk mengubah ukuran kotak"}
                      onPointerDown={(event) => resizeBlock(event, block.id)}
                    >
                      ↘
                    </button>
                  )}
                </>}
                {block.type === "Gambar" ? (
                  <div className="canvas-image-placeholder">
                    {block.pdfKey ? (
                      editorPdfUrls[block.pdfKey] ? (
                        <iframe className="embedded-pdf-page" src={`${editorPdfUrls[block.pdfKey]}#page=${block.pdfPage ?? 1}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`} title={block.text} />
                      ) : <small>Memuat PDF…</small>
                    ) : block.imageSrc ? (
                      <img src={block.imageSrc} alt={block.text} />
                    ) : (
                      <>
                        ▧<small>{block.text}</small>
                      </>
                    )}
                  </div>
                ) : block.type === "Tombol" ? (
                  <button type="button">{block.text}</button>
                ) : block.type === "Aktivitas" ? (
                  <fieldset>
                    <legend>{block.text}</legend>
                    <label>
                      <input type="radio" name={block.id} /> Pilihan jawaban
                    </label>
                    <label>
                      <input type="radio" name={block.id} /> Pilihan lain
                    </label>
                  </fieldset>
                ) : block.type === "Video" ? (
                  <div className="canvas-media">
                    {!block.showQr && <input
                      id={`video-url-${block.id}`}
                      value={block.url || ""}
                      onChange={(event) =>
                        updateBlockUrl(block.id, event.target.value)
                      }
                      placeholder="Tempel link YouTube"
                    />}
                    {!block.showQr && <button type="button" className="button quiet" onClick={() => { setVideoTargetBlockId(block.id); setShowVideoLibrary(true); }}>Pilih video dari Koleksi QR Code</button>}
                    {block.showQr && block.url ? (
                      <div className="video-qr-preview"><img src={`https://quickchart.io/qr?size=360&margin=2&text=${encodeURIComponent(block.url)}`} alt={`QR Code untuk ${block.text}`} /></div>
                    ) : youtubeEmbedUrl(block.url) ? (
                      <iframe
                        src={youtubeEmbedUrl(block.url)}
                        title={block.text}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : block.url ? (
                      <video controls playsInline src={block.url}>Browser tidak mendukung video.</video>
                    ) : (
                      <small>Tempel tautan YouTube atau pilih video yang telah dibuat di halaman QR Code.</small>
                    )}
                  </div>
                ) : block.type === "Suara" ? (
                  <div className="canvas-media">
                    {block.showQr && block.url ? <div className="video-qr-preview"><img src={`https://quickchart.io/qr?size=360&margin=2&text=${encodeURIComponent(block.url)}`} alt={`QR Code untuk ${block.text}`} /></div> : <button type="button" className="button quiet" onClick={() => { setVideoTargetBlockId(block.id); setShowAudioLibrary(true); }}>Pilih audio dari Koleksi QR Code</button>}
                  </div>
                ) : (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    style={isTextBlock(block) ? {
                      fontSize: `${block.fontSize ?? (block.type === "Judul" ? 28 : 16)}px`,
                      fontFamily: block.fontFamily ?? "Arial",
                      fontWeight: block.fontWeight ?? (block.type === "Judul" ? "bold" : "normal"),
                      fontStyle: block.fontStyle ?? "normal",
                      textDecoration: block.textDecoration ?? "none",
                      textAlign: block.textAlign ?? "left",
                      color: block.fontColor ?? "#315e62",
                    } : undefined}
                    onBlur={(event) =>
                      updateBlock(
                        block.id,
                        event.currentTarget.textContent || "",
                      )
                    }
                  >
                    {block.text}
                  </div>
                )}
              </section>
            ))}
          </article>
        </section>
        <aside className="inspector">
          <h2>Properti</h2>
          <div className="page-actions">
            <div className="history-actions">
              <button
                className="button quiet"
                type="button"
                disabled={!historyControls.canUndo}
                onClick={() => restoreHistory(-1)}
              >
                ↶ Undo
              </button>
              <button
                className="button quiet"
                type="button"
                disabled={!historyControls.canRedo}
                onClick={() => restoreHistory(1)}
              >
                ↷ Redo
              </button>
            </div>
            <button
              className="button danger"
              type="button"
              disabled={pages.length === 0}
              onClick={openDeleteDialog}
            >
              Hapus halaman
            </button>
          </div>
          <div className="import-panel">
            <strong>Sisipkan PDF</strong>
            <small>
              Semua halaman PDF akan disisipkan sekaligus.
            </small>
            <label>
              Mulai pada halaman
              <select
                value={insertAt}
                onChange={(event) => setInsertAt(Number(event.target.value))}
              >
                {Array.from({ length: pages.length + 1 }, (_, index) => (
                  <option key={index} value={index + 1}>
                    Halaman {index + 1}
                  </option>
                ))}
              </select>
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void insertImportedPages(file);
              }}
            />
            <input
              ref={importInputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void insertImportedPages(file);
              }}
            />
            <button
              className="button quiet"
              type="button"
              disabled={importing}
              onClick={() => importInputRef.current?.click()}
            >
              {importing ? "Mengimpor…" : "⇧ Sisipkan PDF"}
            </button>
          </div>
          <button
            className="button quiet add-page-button"
            type="button"
            onClick={addPage}
          >
            + Tambah halaman
          </button>
          {importError && <p className="settings-message" role="alert">{importError}</p>}
          <div className="inspector-summary">
            <strong>{selectedBlocks.length} komponen</strong>
            <span>pada halaman aktif</span>
          </div>
          {isTextBlock(selectedBlock) && selectedBlock && (
            <section className="text-format-panel" aria-label="Format teks">
              <strong>Format teks</strong>
              <label>
                Jenis font
                <select
                  value={selectedBlock.fontFamily ?? "Arial"}
                  onChange={(event) => updateBlockStyle(selectedBlock.id, { fontFamily: event.target.value })}
                >
                  <option value="Arial">Arial</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </label>
              <label className="font-size-control">
                <span>Ukuran huruf <output>{selectedBlock.fontSize ?? (selectedBlock.type === "Judul" ? 28 : 16)} px</output></span>
                <div>
                  <input type="range" min="10" max="72" value={selectedBlock.fontSize ?? (selectedBlock.type === "Judul" ? 28 : 16)} onChange={(event) => updateBlockStyle(selectedBlock.id, { fontSize: Number(event.target.value) })} />
                </div>
              </label>
              <label className="font-color-control">
                <span>Warna font</span>
                <input
                  type="color"
                  value={selectedBlock.fontColor ?? "#315e62"}
                  onChange={(event) => updateBlockStyle(selectedBlock.id, { fontColor: event.target.value })}
                  aria-label="Pilih warna font"
                />
              </label>
              <span className="format-group-label">Gaya</span>
              <div className="text-style-buttons" aria-label="Gaya teks">
                <button type="button" className={(selectedBlock.fontWeight ?? (selectedBlock.type === "Judul" ? "bold" : "normal")) === "bold" ? "is-active" : ""} aria-pressed={(selectedBlock.fontWeight ?? (selectedBlock.type === "Judul" ? "bold" : "normal")) === "bold"} onClick={() => updateBlockStyle(selectedBlock.id, { fontWeight: (selectedBlock.fontWeight ?? (selectedBlock.type === "Judul" ? "bold" : "normal")) === "bold" ? "normal" : "bold" })}><b>B</b><span className="sr-only">Tebal</span></button>
                <button type="button" className={selectedBlock.fontStyle === "italic" ? "is-active" : ""} aria-pressed={selectedBlock.fontStyle === "italic"} onClick={() => updateBlockStyle(selectedBlock.id, { fontStyle: selectedBlock.fontStyle === "italic" ? "normal" : "italic" })}><i>I</i><span className="sr-only">Miring</span></button>
                <button type="button" className={selectedBlock.textDecoration === "underline" ? "is-active" : ""} aria-pressed={selectedBlock.textDecoration === "underline"} onClick={() => updateBlockStyle(selectedBlock.id, { textDecoration: selectedBlock.textDecoration === "underline" ? "none" : "underline" })}><u>U</u><span className="sr-only">Garis bawah</span></button>
              </div>
              <span className="format-group-label">Perataan</span>
              <div className="text-align-buttons" role="group" aria-label="Perataan teks">
                <button type="button" className={(selectedBlock.textAlign ?? "left") === "left" ? "is-active" : ""} aria-pressed={(selectedBlock.textAlign ?? "left") === "left"} onClick={() => updateBlockStyle(selectedBlock.id, { textAlign: "left" })} title="Rata kiri"><AlignLeft aria-hidden="true" /><span className="sr-only">Rata kiri</span></button>
                <button type="button" className={selectedBlock.textAlign === "center" ? "is-active" : ""} aria-pressed={selectedBlock.textAlign === "center"} onClick={() => updateBlockStyle(selectedBlock.id, { textAlign: "center" })} title="Rata tengah"><AlignCenter aria-hidden="true" /><span className="sr-only">Rata tengah</span></button>
                <button type="button" className={selectedBlock.textAlign === "right" ? "is-active" : ""} aria-pressed={selectedBlock.textAlign === "right"} onClick={() => updateBlockStyle(selectedBlock.id, { textAlign: "right" })} title="Rata kanan"><AlignRight aria-hidden="true" /><span className="sr-only">Rata kanan</span></button>
                <button type="button" className={selectedBlock.textAlign === "justify" ? "is-active" : ""} aria-pressed={selectedBlock.textAlign === "justify"} onClick={() => updateBlockStyle(selectedBlock.id, { textAlign: "justify" })} title="Justify"><AlignJustify aria-hidden="true" /><span className="sr-only">Justify</span></button>
              </div>
            </section>
          )}
          <p className="helper">
            Tarik ikon ⠿ pada setiap komponen untuk memindahkannya. Klik teks
            untuk mengedit.
          </p>
        </aside>
      </div>
      {deleteDialogOpen && (
        <div className="modal-backdrop page-delete-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteDialogOpen(false); }}>
          <section className="confirm-modal page-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="page-delete-title">
            <p className="eyebrow">HAPUS HALAMAN</p>
            {confirmAllDelete ? <><h2 id="page-delete-title">Hapus semua halaman?</h2><p>Sebanyak {pages.length} halaman akan dihapus. Tindakan ini tidak dapat dikembalikan.</p><div className="confirm-actions"><button className="button quiet" onClick={() => { setPagesToDelete(selected ? [selected.id] : []); setPageSelection(String(selectedIndex + 1)); setConfirmAllDelete(false); }}>Kembali</button><button className="danger-solid" onClick={deletePages}>Ya, hapus semua</button></div></> : <><h2 id="page-delete-title">Pilih halaman yang akan dihapus</h2><p>Halaman yang sedang tampil telah dipilih secara otomatis.</p><label className="page-range-input">Nomor halaman atau rentang<input value={pageSelection} onChange={(event) => selectPagesFromText(event.target.value)} placeholder="Contoh: 1, 4, 8-12" /></label><div className="confirm-actions"><button className="button quiet" onClick={() => setDeleteDialogOpen(false)}>Batal</button><button className="button quiet" onClick={() => { setPagesToDelete(pages.map((page) => page.id)); setConfirmAllDelete(true); }}>Semua halaman</button><button className="danger-solid" disabled={!pagesToDelete.length} onClick={deletePages}>{pageSelection === String(selectedIndex + 1) ? "Hapus halaman aktif" : `Hapus ${pagesToDelete.length} halaman`}</button></div></>}
          </section>
        </div>
      )}
      {previewOpen && (
        <div className="modal-backdrop flipbook-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}>
          <section className={`flipbook-preview-modal${previewFullscreen ? " is-fullscreen" : ""}`} role="dialog" aria-modal="true" aria-labelledby="flipbook-preview-title">
            <header>
              <div><p className="eyebrow">PRATINJAU FLIPBOOK</p><h2 id="flipbook-preview-title">{book.title}</h2></div>
              <div className="preview-header-actions"><button type="button" className="button quiet preview-fullscreen" onClick={() => { setPreviewOpen(false); setPreviewFullscreen(false); }}>Keluar</button></div>
            </header>
            <div className="flipbook-reader-stage">
            <HTMLFlipBook ref={previewFlipRef} width={previewPageWidth} height={previewPageHeight} size="stretch" minWidth={260} maxWidth={previewFullscreen ? previewPageWidth : 560} minHeight={368} maxHeight={previewFullscreen ? previewPageHeight : 760} showCover drawShadow flippingTime={800} usePortrait className="editor-preview-flipbook" startPage={previewIndex} showPageCorners={false} disableFlipByClick={false} clickEventForward={false} mobileScrollSupport={false} onInit={() => { const cover = previewFlipRef.current?.pageFlip().getPageCollection().getPage(0) as { setDensity: (density: "soft") => void } | undefined; cover?.setDensity("soft"); }} onFlip={(event: { data: number }) => setPreviewIndex(event.data)}>
              {previewBookPages.map((page) => renderPreviewCanvas(page, pages.indexOf(page)))}
            </HTMLFlipBook>
            </div>
            <footer>
              <button className="button quiet" type="button" disabled={previewIndex === 0} onClick={() => previewFlipRef.current?.pageFlip().flipPrev()}>Sebelumnya</button>
              <button className="button primary" type="button" disabled={previewIndex === pages.length - 1} onClick={() => previewFlipRef.current?.pageFlip().flipNext()}>Berikutnya</button>
            </footer>
          </section>
        </div>
      )}
      {showYoutubeLinkModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelPendingMedia(); }}>
          <section className="confirm-modal video-source-modal" role="dialog" aria-modal="true" aria-labelledby="youtube-link-title">
            <p className="eyebrow">VIDEO YOUTUBE</p>
            <h2 id="youtube-link-title">Tempel link YouTube</h2>
            <p>Gunakan tautan video YouTube atau YouTube Shorts yang ingin disisipkan.</p>
            <label className="youtube-link-field">Tautan YouTube<input autoFocus type="url" value={youtubeLink} onChange={(event) => { setYoutubeLink(event.target.value); setYoutubeLinkError(""); }} placeholder="https://www.youtube.com/watch?v=..." /></label>
            {youtubeLinkError && <p className="settings-message" role="alert">{youtubeLinkError}</p>}
            <div className="confirm-actions"><button type="button" className="button quiet" onClick={cancelPendingMedia}>Batal</button><button type="button" className="button primary" onClick={insertYoutubeVideo}>Sisipkan video</button></div>
          </section>
        </div>
      )}
      {showVideoSourcePicker && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelPendingMedia(); }}>
          <section className="confirm-modal video-source-modal" role="dialog" aria-modal="true" aria-labelledby="video-source-title">
            <p className="eyebrow">TAMBAHKAN VIDEO</p>
            <h2 id="video-source-title">Pilih sumber video</h2>
            <p>Gunakan tautan YouTube atau pilih video yang QR Code-nya telah dibuat.</p>
            <div className="video-source-actions">
              <button type="button" onClick={() => { setShowVideoSourcePicker(false); setYoutubeLink(""); setYoutubeLinkError(""); setShowYoutubeLinkModal(true); }}><Video aria-hidden="true" /><strong>Tempel link YouTube</strong><small>Masukkan tautan video YouTube.</small></button>
              <button type="button" onClick={() => { setShowVideoSourcePicker(false); setShowVideoLibrary(true); }}><QrCode aria-hidden="true" /><strong>Ambil dari Koleksi QR Code</strong><small>Pilih video yang telah ditambahkan.</small></button>
            </div>
            <div className="confirm-actions"><button type="button" className="button quiet" onClick={cancelPendingMedia}>Batal</button></div>
          </section>
        </div>
      )}
      {showAudioLibrary && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelPendingMedia(); }}>
          <section className="confirm-modal video-library-modal" role="dialog" aria-modal="true" aria-labelledby="audio-library-title">
            <p className="eyebrow">KOLEKSI QR CODE</p>
            <h2 id="audio-library-title">Pilih audio pembelajaran</h2>
            <p>Pilih audio yang sebelumnya ditambahkan dari halaman QR Code.</p>
            {availableAudios.length ? <div className="audio-library-list">{availableAudios.map((audio) => <article key={audio.id} className="audio-library-row"><span className="audio-library-icon"><Music2 aria-hidden="true" /></span><div><strong>{audio.title}</strong><small>Audio dari Koleksi QR Code</small></div><button type="button" className="button primary" onClick={() => { if (videoTargetBlockId) setVideoFromQrCollection(videoTargetBlockId, audio.public_url); setShowAudioLibrary(false); setVideoTargetBlockId(null); }}>Gunakan QR Code</button></article>)}</div> : <EmptyState title="Koleksi audio kosong">Tambahkan audio terlebih dahulu melalui halaman QR Code.</EmptyState>}
            <div className="confirm-actions"><button type="button" className="button quiet" onClick={cancelPendingMedia}>Tutup</button></div>
          </section>
        </div>
      )}
      {showVideoLibrary && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelPendingMedia(); }}>
          <section className="confirm-modal video-library-modal" role="dialog" aria-modal="true" aria-labelledby="video-library-title">
            <p className="eyebrow">KOLEKSI QR CODE</p>
            <h2 id="video-library-title">Pilih video pembelajaran</h2>
            <p>Pilih video yang sebelumnya ditambahkan dari halaman QR Code.</p>
            {availableVideos.length ? <div className="video-library-grid">{availableVideos.map((video) => <article key={video.id} className="video-library-card"><video preload="metadata" muted src={`${video.public_url}#t=0.1`} /><div><strong>{video.title}</strong><small>Video dari Koleksi QR Code</small></div><button type="button" className="button primary" onClick={() => { if (videoTargetBlockId) setVideoFromQrCollection(videoTargetBlockId, video.public_url); setShowVideoLibrary(false); setVideoTargetBlockId(null); }}>Gunakan QR Code</button></article>)}</div> : <EmptyState title="Koleksi video kosong">Tambahkan video terlebih dahulu melalui halaman QR Code.</EmptyState>}
            <div className="confirm-actions"><button type="button" className="button quiet" onClick={cancelPendingMedia}>Tutup</button></div>
          </section>
        </div>
      )}
    </section>
  );
}
