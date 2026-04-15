// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

import type { Metadata } from 'next';
import '../styles/globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'AeroSync Ground Station | Wingspann Global',
  description: 'Professional satellite tracking and ground station platform by Wingspann Global Pvt Ltd.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="stars-bg" />
        <div className="app-shell">
          <Header />
          <Sidebar />
          <main className="app-main fade-in">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
