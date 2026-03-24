import type { Metadata } from 'next'
import { LayoutClient } from '@/components/LayoutClient'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rizzume - AI Job Prep Agent',
  description: 'Resume updater, learning roadmap, roast, and interview simulator powered by AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  )
}
