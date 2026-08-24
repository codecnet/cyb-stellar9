import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ClientProvider } from '@/contexts/ClientContext'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'SIEM Dashboard',
  description: 'Professional AI-powered SIEM Dashboard for comprehensive security monitoring and incident management',
  keywords: ['SIEM', 'Security', 'Monitoring', 'AI', 'Dashboard', 'Cybersecurity'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={spaceGrotesk.variable}>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClientProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 2000,
                style: {
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                },
              }}
            />
          </ClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 