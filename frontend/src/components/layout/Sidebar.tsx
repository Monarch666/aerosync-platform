'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Satellite, CalendarClock,
  Map, Compass, ClipboardList, Settings, Radio,
} from 'lucide-react';

const NAV = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Satellites', href: '/satellites', icon: Satellite },
  { label: 'Passes', href: '/passes', icon: CalendarClock },
  { label: 'World Map', href: '/map', icon: Map },
  { label: 'Sky Plot', href: '/skyplot', icon: Compass },
  { label: 'Obs. Log', href: '/log', icon: ClipboardList },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Radio size={16} color="var(--accent)" />
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700 }}>
            AeroSync
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 24 }}>
          Wingspann Global
        </div>
      </div>

      <div className="sidebar-section">Navigation</div>

      {NAV.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className={`sidebar-link${active ? ' active' : ''}`}>
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        );
      })}

      <div style={{ padding: '16px', borderTop: '1px solid var(--border)', marginTop: 32 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div>© 2026 Wingspann Global Pvt Ltd</div>
          <div style={{ color: 'var(--accent)', marginTop: 2 }}>MIT License v1.0.0</div>
        </div>
      </div>
    </aside>
  );
}
