import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const projectUrl = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const SESSION_ONLY_MARKER = 'flipbook-studio-session-only'

const authStorage = {
  getItem(key: string) {
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key)
  },
  setItem(key: string, value: string) {
    if (window.sessionStorage.getItem(SESSION_ONLY_MARKER) === 'true') {
      window.sessionStorage.setItem(key, value)
      window.localStorage.removeItem(key)
      return
    }
    window.localStorage.setItem(key, value)
    window.sessionStorage.removeItem(key)
  },
  removeItem(key: string) {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

export function setSessionPersistence(remember: boolean) {
  if (remember) window.sessionStorage.removeItem(SESSION_ONLY_MARKER)
  else window.sessionStorage.setItem(SESSION_ONLY_MARKER, 'true')
}

/**
 * Client browser nonproduksi. Tidak ada query, mutasi, atau service-role key
 * pada modul ini. Pemanggil wajib menangani `null` saat konfigurasi belum ada.
 */
export const supabase: SupabaseClient | null = projectUrl && publishableKey
  ? createClient(projectUrl, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, storage: authStorage },
    })
  : null

export const supabaseConfigurationStatus = supabase
  ? 'configured'
  : 'missing-configuration'
