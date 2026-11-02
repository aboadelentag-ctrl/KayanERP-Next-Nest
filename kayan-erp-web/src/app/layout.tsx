import type { Metadata } from 'next';
import './globals.css';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import GlobalNavbar from './components/GlobalNavbar';

export const metadata: Metadata = {
  title: 'كيان ERP - مصانع وحلواني أبو عادل',
  description: 'نظام إدارة الموارد والمصانع ونقاط البيع السحابي',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased transition-colors duration-200">
        <ThemeProvider>
          <SocketProvider>
            <GlobalNavbar />
            <main>{children}</main>
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
