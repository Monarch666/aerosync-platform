'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

export default function LogPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Observation Log</h1>
          <p className="page-subtitle">History of satellite passes over your observer location</p>
        </div>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: 64 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Observation logging will be recorded here as passes occur.<br />
          No observations logged yet — start tracking satellites to build your log.
        </div>
      </div>
    </div>
  );
}
