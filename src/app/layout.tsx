import '@/styles/theme.css'

export const metadata = {
  title: 'ERP Template',
  description: 'White-label ERP shell template',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
