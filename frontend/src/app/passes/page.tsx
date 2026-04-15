'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

import { useEffect, useState, useCallback } from 'react';
import { CalendarClock, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Pass {
  norad_id: number;
  satellite_name: string;
  aos: string;
  los: string;
  tca: string;
  max_elevation: number;
  duration_seconds: number;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2,'0')}s`;
}

function qualityLabel(el: number) {
  if (el >= 60) return { label: 'Excellent', cls: 'badge-success' };
  if (el >= 30) return { label: 'Good', cls: 'badge-info' };
  if (el >= 15) return { label: 'Fair', cls: 'badge-warning' };
  return { label: 'Poor', cls: '' };
}

export default function PassesPage() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [minEl, setMinEl] = useState(10);
  const [group, setGroup] = useState('stations');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        hours: String(hours),
        min_elevation: String(minEl),
        group,
        limit: '50',
      });
      const res = await fetch(`/api/passes/upcoming?${params}`);
      const data = await res.json();
      setPasses(data.passes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [hours, minEl, group]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pass Predictions</h1>
          <p className="page-subtitle">Upcoming satellite passes over your observer location</p>
        </div>
        <button className="btn btn-primary" onClick={load}>↻ Refresh</button>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Lookahead</div>
            <select className="input" style={{ width: 140 }} value={hours} onChange={e => setHours(Number(e.target.value))}>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Min Elevation</div>
            <select className="input" style={{ width: 140 }} value={minEl} onChange={e => setMinEl(Number(e.target.value))}>
              <option value={5}>5°</option>
              <option value={10}>10°</option>
              <option value={20}>20°</option>
              <option value={30}>30°</option>
              <option value={45}>45°</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Group</div>
            <select className="input" style={{ width: 160 }} value={group} onChange={e => setGroup(e.target.value)}>
              <option value="stations">Stations (ISS)</option>
              <option value="amateur">Amateur</option>
              <option value="weather">Weather</option>
              <option value="visual">Visual</option>
              <option value="active">All Active</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><CalendarClock size={14} /> {passes.length} Passes Found</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 50 }} />)}
          </div>
        ) : passes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            No passes found. Try reducing the minimum elevation or increasing the lookahead window.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Satellite</th>
                <th>AOS (UTC)</th>
                <th>TCA (UTC)</th>
                <th>LOS (UTC)</th>
                <th>Duration</th>
                <th>Max El.</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((p, i) => {
                const q = qualityLabel(p.max_elevation);
                const isPast = parseISO(p.los) < new Date();
                const isActive = parseISO(p.aos) <= new Date() && parseISO(p.los) >= new Date();
                return (
                  <tr key={`${p.norad_id}-${i}`} style={{ opacity: isPast ? 0.45 : 1 }}>
                    <td>
                      <div style={{ fontWeight: 600, color: isActive ? 'var(--success)' : 'var(--text-primary)' }}>
                        {isActive && <span style={{ marginRight: 6 }}>●</span>}
                        {p.satellite_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        #{p.norad_id}
                      </div>
                    </td>
                    <td className="mono">{format(parseISO(p.aos), 'HH:mm:ss')}</td>
                    <td className="mono">{p.tca ? format(parseISO(p.tca), 'HH:mm:ss') : '—'}</td>
                    <td className="mono">{format(parseISO(p.los), 'HH:mm:ss')}</td>
                    <td className="mono">{formatDuration(p.duration_seconds)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`pass-${p.max_elevation >= 60 ? 'excellent' : p.max_elevation >= 30 ? 'good' : p.max_elevation >= 15 ? 'fair' : 'poor'}`}
                          style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {p.max_elevation}°
                        </span>
                        <div className="elev-bar-bg" style={{ width: 50 }}>
                          <div className="elev-bar-fill" style={{ width: `${Math.min(100, (p.max_elevation / 90) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${q.cls}`}>{q.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
