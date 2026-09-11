import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
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
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
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
