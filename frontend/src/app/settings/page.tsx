'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

import { useEffect, useState } from 'react';
import { Settings2, MapPin, RefreshCw } from 'lucide-react';

interface SettingsData {
  observer: { latitude: number; longitude: number; altitude_m: number };
  tle: { refresh_interval_minutes: number; min_elevation_degrees: number; sources: string[] };
  app: { name: string; version: string };
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [alt, setAlt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        const d = await res.json();
        setData(d);
        setLat(String(d.observer.latitude));
        setLon(String(d.observer.longitude));
        setAlt(String(d.observer.altitude_m));
      } catch {}
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/observer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: parseFloat(lat), longitude: parseFloat(lon), altitude_m: parseFloat(alt) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {} finally { setSaving(false); }
  };

  const syncNow = async () => {
    setSyncLoading(true);
    setSyncMsg('');
    try {
      // Trigger TLE sync via a fresh call to the satellites list (which triggers DB update)
      const res = await fetch('/api/satellites?limit=1');
      setSyncMsg('TLE sync triggered — satellites refreshing in background.');
    } catch {
      setSyncMsg('Sync request failed — check backend connection.');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure observer location and system preferences</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Observer Location */}
        <div className="card">
          <div className="card-title"><MapPin size={14} /> Observer Location</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Your ground station location is used for all pass predictions and Az/El calculations.
            Enter decimal degrees (e.g. 28.6139 for New Delhi).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Latitude (°)', value: lat, set: setLat, placeholder: '28.6139', hint: 'Positive = North, Negative = South' },
              { label: 'Longitude (°)', value: lon, set: setLon, placeholder: '77.2090', hint: 'Positive = East, Negative = West' },
              { label: 'Altitude (m)', value: alt, set: setAlt, placeholder: '216', hint: 'Metres above sea level' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input className="input" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.hint}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save Location'}
            </button>
            {saved && <span style={{ color: 'var(--success)', fontSize: 13 }}>✓ Saved successfully</span>}
          </div>
        </div>

        {/* TLE & System */}
        <div className="card">
          <div className="card-title"><Settings2 size={14} /> System & TLE</div>

          {data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Application</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' }}>{data.app.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>v{data.app.version}</div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>TLE Configuration</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
                  <div>Auto-refresh: <strong style={{ color: 'var(--text-primary)' }}>{data.tle.refresh_interval_minutes} minutes</strong></div>
                  <div>Min elevation: <strong style={{ color: 'var(--text-primary)' }}>{data.tle.min_elevation_degrees}°</strong></div>
                  <div>Active sources: <strong style={{ color: 'var(--text-primary)' }}>{data.tle.sources.join(', ')}</strong></div>
                </div>
              </div>
            </div>
          )}

          <button className="btn btn-ghost" onClick={syncNow} disabled={syncLoading}>
            <RefreshCw size={14} className={syncLoading ? 'orbit-icon' : ''} />
            {syncLoading ? 'Syncing TLEs...' : 'Force TLE Sync Now'}
          </button>
          {syncMsg && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>{syncMsg}</div>}

          <div style={{ marginTop: 24, padding: 14, background: 'var(--success-dim)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 'var(--r-md)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>MIT Licensed Software</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              AeroSync Satellite Ground Station<br />
              © 2026 Wingspann Global Pvt Ltd<br />
              Licensed under the MIT License.<br />
              TLE data from Celestrak (public domain).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
