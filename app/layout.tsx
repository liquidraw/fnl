
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'HOF Network — Friday Night Legends', description: 'Tecmo-style HS football' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
