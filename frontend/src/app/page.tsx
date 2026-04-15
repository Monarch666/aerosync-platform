'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

/**
 * Dashboard — Overview page
 * Shows: next pass countdown, active passes, today's schedule, quick stats
 */

import { useEffect, useState, useCallback } from 'react';
import { Satellite, Clock, TrendingUp, Calendar, Radio, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

interface Pass {
  norad_id: number;
  satellite_name: string;
  aos: string;
  los: string;
  tca: string;
  max_elevation: number;
  duration_seconds: number;
}

function elevationClass(el: number) {
  if (el >= 60) return 'pass-excellent';
  if (el >= 30) return 'pass-good';
  if (el >= 15) return 'pass-fair';
  return 'pass-poor';
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function Countdown({ target }: { target: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = parseISO(target).getTime() - Date.now();
      if (diff <= 0) { setLabel('NOW'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return <div className="countdown">{label}</div>;
}

export default function DashboardPage() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [satCount, setSatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState('');

  const load = useCallback(async () => {
    try {
      const [passRes, satRes] = await Promise.all([
        fetch('/api/passes/upcoming?hours=24&limit=10'),
        fetch('/api/satellites?limit=1'),
      ]);
      const passData = await passRes.json();
      const satData = await satRes.json();
      setPasses(passData.passes || []);
      setSatCount(satData.total || 0);
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Dashboard load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, [load]);

  const nextPass = passes[0];
  const activePasses = passes.filter(p => parseISO(p.aos) <= new Date() && parseISO(p.los) >= new Date());

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mission Overview</h1>
          <p className="page-subtitle">Real-time satellite tracking — {lastSync ? `Last updated ${lastSync}` : 'Loading...'}</p>
        </div>
        <div className="badge badge-success"><div className="live-dot" /> Live Tracking</div>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Satellites in DB', value: satCount.toLocaleString(), icon: Satellite, color: 'var(--accent)' },
          { label: 'Passes Today', value: passes.length, icon: Calendar, color: 'var(--accent-alt)' },
          { label: 'Active Passes', value: activePasses.length, icon: Radio, color: 'var(--success)' },
          { label: 'Best Max El.', value: nextPass ? `${nextPass.max_elevation}°` : '—', icon: TrendingUp, color: 'var(--warning)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="telem-value" style={{ color }}>{value}</div>
                <div className="telem-label">{label}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 10, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                <Icon size={20} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Next Pass Countdown */}
        <div className="card card-glow">
          <div className="card-title"><Clock size={14} /> Next Pass</div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 80 }}>
              <div className="loading-spinner" />
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Predicting passes...</span>
            </div>
          ) : nextPass ? (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {nextPass.satellite_name}
                </span>
                {' '}— NORAD {nextPass.norad_id}
              </div>
              <Countdown target={nextPass.aos} />
              <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <div>AOS <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {format(parseISO(nextPass.aos), 'HH:mm:ss')}
                </strong></div>
                <div>LOS <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {format(parseISO(nextPass.los), 'HH:mm:ss')}
                </strong></div>
                <div>MAX EL <strong className={`${elevationClass(nextPass.max_elevation)}`} style={{ fontFamily: 'var(--font-mono)' }}>
                  {nextPass.max_elevation}°
                </strong></div>
                <div>DUR <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {formatDuration(nextPass.duration_seconds)}
                </strong></div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
              <AlertCircle size={16} /> No passes in next 24 hours with current settings.
            </div>
          )}
        </div>

        {/* Active Passes */}
        <div className="card">
          <div className="card-title"><Radio size={14} /> Currently Visible</div>
          {activePasses.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '20px 0' }}>
              No satellites currently above horizon.
            </div>
          ) : (
            activePasses.map(p => (
              <div key={p.norad_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{p.satellite_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    LOS {format(parseISO(p.los), 'HH:mm:ss')} UTC
                  </div>
                </div>
                <div className={`badge badge-success`}>
                  <div className="live-dot" />{p.max_elevation}° max
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="card">
        <div className="card-title"><Calendar size={14} /> Today's Pass Schedule</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 40 }} />)}
          </div>
        ) : passes.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '16px 0' }}>
            No passes found. Try adjusting your observer location in Settings.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Satellite</th>
                <th>AOS (UTC)</th>
                <th>LOS (UTC)</th>
                <th>Duration</th>
                <th>Max Elevation</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((p, i) => (
                <tr key={`${p.norad_id}-${i}`}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.satellite_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      #{p.norad_id}
                    </div>
                  </td>
                  <td className="mono">{format(parseISO(p.aos), 'HH:mm:ss')}</td>
                  <td className="mono">{format(parseISO(p.los), 'HH:mm:ss')}</td>
                  <td className="mono">{formatDuration(p.duration_seconds)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={elevationClass(p.max_elevation)} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {p.max_elevation}°
                      </div>
                      <div className="elev-bar-bg" style={{ width: 60 }}>
                        <div className="elev-bar-fill" style={{ width: `${Math.min(100, (p.max_elevation / 90) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      p.max_elevation >= 60 ? 'badge-success' :
                      p.max_elevation >= 30 ? 'badge-info' :
                      p.max_elevation >= 15 ? 'badge-warning' : ''
                    }`}>
                      {p.max_elevation >= 60 ? 'Excellent' :
                       p.max_elevation >= 30 ? 'Good' :
                       p.max_elevation >= 15 ? 'Fair' : 'Poor'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
