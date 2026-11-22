import type { ReactNode } from 'react'

export function LoadingState({ label = 'Memuat data mock…' }: { label?: string }) { return <section className="state-card" role="status"><strong>{label}</strong><p>Antarmuka menunggu repository mock lokal, bukan jaringan atau layanan produksi.</p></section> }
export function ErrorState({ title, children }: { title: string; children: ReactNode }) { return <section className="state-card error" role="alert"><h1>{title}</h1><p>{children}</p></section> }
export function EmptyState({ title, children }: { title: string; children: ReactNode }) { return <section className="state-card"><h2>{title}</h2><p>{children}</p></section> }
