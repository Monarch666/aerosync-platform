'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

export default function Header() {
  const [time, setTime] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health');
        setConnected(res.ok);
      } catch {
        setConnected(false);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="app-header">
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        Satellite Ground Station
      </div>

      <div className="status-bar">
        <div className="status-item">
          <Clock size={13} />
          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{time}</strong>
        </div>

        <div className="status-item">
          {connected
            ? <><div className="live-dot" /><span style={{ color: 'var(--success)', fontWeight: 600 }}>Backend Online</span></>
            : <><WifiOff size={13} color="var(--danger)" /><span style={{ color: 'var(--danger)' }}>Backend Offline</span></>
          }
        </div>

        <div style={{
          padding: '4px 12px',
          borderRadius: 99,
          background: 'var(--accent-dim)',
          border: '1px solid var(--border-glow)',
          fontSize: 12,
          color: 'var(--accent)',
          fontWeight: 600,
        }}>
          Wingspann Global
        </div>
      </div>
    </header>
  );
}
