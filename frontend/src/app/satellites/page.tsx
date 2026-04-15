'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

import { useEffect, useState, useCallback } from 'react';
import { Satellite, Star, Search, Filter } from 'lucide-react';

interface SatelliteEntry {
  norad_id: number;
  name: string;
  group: string;
  is_favourite: boolean;
  tle_updated_at: string | null;
}

const GROUP_COLORS: Record<string, string> = {
  stations: 'var(--success)',
  amateur:  'var(--accent)',
  weather:  'var(--warning)',
  visual:   'var(--accent-alt)',
  active:   'var(--text-secondary)',
};

export default function SatellitesPage() {
  const [satellites, setSatellites] = useState<SatelliteEntry[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (search) params.set('search', search);
      if (selectedGroup) params.set('group', selectedGroup);
      if (favouritesOnly) params.set('favourites', 'true');

      const [satRes, groupRes] = await Promise.all([
        fetch(`/api/satellites?${params}`),
        groups.length === 0 ? fetch('/api/satellites/groups/list') : Promise.resolve(null),
      ]);
      const satData = await satRes.json();
      setSatellites(satData.satellites || []);
      setTotal(satData.total || 0);

      if (groupRes) {
        const groupData = await groupRes.json();
        setGroups(groupData.groups || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroup, favouritesOnly, offset]);

  useEffect(() => { setOffset(0); }, [search, selectedGroup, favouritesOnly]);
  useEffect(() => { load(); }, [load]);

  const toggleFavourite = async (norad_id: number) => {
    await fetch(`/api/satellites/${norad_id}/favourite`, { method: 'PATCH' });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Satellite Catalog</h1>
          <p className="page-subtitle">{total.toLocaleString()} satellites loaded from Celestrak</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Search by name or NORAD ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input"
            style={{ width: 180 }}
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
          >
            <option value="">All Groups</option>
            {groups.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
          </select>

          <button
            className={`btn ${favouritesOnly ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFavouritesOnly(!favouritesOnly)}
          >
            <Star size={14} /> Favourites
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
          </div>
        ) : satellites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <Satellite size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div>No satellites found. Try adjusting your search.</div>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>★</th>
                  <th>NORAD ID</th>
                  <th>Name</th>
                  <th>Group</th>
                  <th>TLE Updated</th>
                </tr>
              </thead>
              <tbody>
                {satellites.map(sat => (
                  <tr key={sat.norad_id}>
                    <td style={{ width: 32 }}>
                      <button
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                          color: sat.is_favourite ? 'var(--warning)' : 'var(--text-muted)',
                          fontSize: 16,
                        }}
                        onClick={() => toggleFavourite(sat.norad_id)}
                        title={sat.is_favourite ? 'Remove favourite' : 'Add favourite'}
                      >
                        {sat.is_favourite ? '★' : '☆'}
                      </button>
                    </td>
                    <td className="mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{sat.norad_id}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{sat.name}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        color: GROUP_COLORS[sat.group] || 'var(--text-muted)',
                        background: `color-mix(in srgb, ${GROUP_COLORS[sat.group] || 'var(--text-muted)'} 12%, transparent)`,
                      }}>
                        {sat.group || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {sat.tle_updated_at ? new Date(sat.tle_updated_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← Prev</button>
                <button className="btn btn-ghost" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
