import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const projectUrl = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Client browser nonproduksi. Tidak ada query, mutasi, atau service-role key
 * pada modul ini. Pemanggil wajib menangani `null` saat konfigurasi belum ada.
 */
export const supabase: SupabaseClient | null = projectUrl && publishableKey
  ? createClient(projectUrl, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export const supabaseConfigurationStatus = supabase
  ? 'configured'
  : 'missing-configuration'
