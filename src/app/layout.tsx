import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MIC AIML Portal - Student Task Tracking & Department Management',
  description: 'DVR & Dr. HS MIC College of Technology - Department of Artificial Intelligence & Machine Learning (AIML)',
  icons: {
    icon: [
      { url: '/logo-mic.png', href: '/logo-mic.png' },
    ],
    shortcut: ['/logo-mic.png'],
    apple: [
      { url: '/logo-mic.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        <link rel="icon" href="/logo-mic.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-mic.png" />
      </head>
      <body className="min-h-screen text-slate-900 antialiased selection:bg-blue-600 selection:text-white font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
