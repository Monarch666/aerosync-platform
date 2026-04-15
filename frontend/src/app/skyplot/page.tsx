'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

import { useEffect, useRef, useState } from 'react';
import { Compass } from 'lucide-react';

interface Pass {
  norad_id: number;
  satellite_name: string;
  aos: string; los: string; tca: string;
  max_elevation: number; duration_seconds: number;
}

/**
 * Sky Polar Plot — drawn entirely on HTML Canvas.
 * Shows the arc of a satellite pass from AOS to LOS.
 * 0° elevation = outer ring, 90° = centre.
 * North = top, clockwise azimuth.
 * Original Canvas rendering code — not derived from any GPL source.
 */
function SkyPlotCanvas({ passes }: { passes: Pass[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) / 2 - 24;

    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bg.addColorStop(0, '#0d1830');
    bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // Elevation rings at 0°, 30°, 60°, 90°
    [0, 30, 60, 90].forEach(el => {
      const r = R * (1 - el / 90);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = el === 0 ? 'rgba(99,179,237,0.35)' : 'rgba(99,179,237,0.12)';
      ctx.lineWidth = el === 0 ? 1.5 : 1;
      ctx.stroke();

      if (el > 0) {
        ctx.fillStyle = 'rgba(148,163,184,0.5)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${el}°`, cx + r + 3, cy + 4);
      }
    });

    // Azimuth cardinal lines
    const cardinals = ['N', 'E', 'S', 'W'];
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90 - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
      ctx.strokeStyle = 'rgba(99,179,237,0.15)';
      ctx.lineWidth = 1; ctx.stroke();

      const lx = cx + (R + 14) * Math.cos(angle);
      const ly = cy + (R + 14) * Math.sin(angle);
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cardinals[i], lx, ly);
    }

    // Pass arcs — sample points along arc from az-start to az-end
    const COLORS = ['#38bdf8','#818cf8','#34d399','#fbbf24','#f87171','#c084fc'];

    passes.forEach((p, idx) => {
      const color = COLORS[idx % COLORS.length];
      // Approximate pass arc: straight line from N to max el to S (simplified visual)
      // In a real implementation you'd propagate the TLE along the pass window.
      // Here we draw a curved arc using the known start/end az and max elevation.
      const maxEl = p.max_elevation;
      const r_max = R * (1 - maxEl / 90);

      // Draw star at zenith-approach point
      const aosDeg = Math.random() * 270; // visual placeholder arc
      const losDeg = aosDeg + 120 + Math.random() * 60;
      const tcaDeg = (aosDeg + losDeg) / 2;

      ctx.beginPath();
      const nPts = 30;
      for (let k = 0; k <= nPts; k++) {
        const frac = k / nPts;
        const az = aosDeg + (losDeg - aosDeg) * frac;
        // elevation bell curve
        const el_frac = Math.sin(frac * Math.PI);
        const elDeg = el_frac * maxEl;
        const r = R * (1 - elDeg / 90);
        const angle = (az - 90) * (Math.PI / 180);
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // AOS dot
      const aosAngle = (aosDeg - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.arc(cx + R * Math.cos(aosAngle), cy + R * Math.sin(aosAngle), 5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();

      // Label
      const tcaAngle = (tcaDeg - 90) * (Math.PI / 180);
      ctx.fillStyle = color;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.satellite_name.slice(0, 8), cx + r_max * Math.cos(tcaAngle), cy + r_max * Math.sin(tcaAngle) - 8);
    });

    // Centre dot (zenith)
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56,189,248,0.6)'; ctx.fill();

  }, [passes]);

  return <canvas ref={canvasRef} width={500} height={500} style={{ display: 'block', margin: '0 auto' }} />;
}

export default function SkyPlotPage() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/passes/upcoming?hours=12&limit=8&group=stations');
        const data = await res.json();
        setPasses(data.passes || []);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sky Plot</h1>
          <p className="page-subtitle">Polar view of upcoming satellite passes above your horizon</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-glow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="card-title"><Compass size={14} /> Polar Pass View</div>
          {loading ? (
            <div style={{ width: 500, height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="loading-spinner" />
            </div>
          ) : <SkyPlotCanvas passes={passes} />}
        </div>

        <div className="card">
          <div className="card-title">Pass Legend</div>
          {passes.map((p, i) => {
            // Key uses index + AOS to guarantee uniqueness when a sat has multiple passes
            const colors = ['#38bdf8','#818cf8','#34d399','#fbbf24','#f87171','#c084fc'];
            const color = colors[i % colors.length];
            return (
              <div key={`${p.norad_id}-${i}-${p.aos}`} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{p.satellite_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Max {p.max_elevation}° — {Math.floor(p.duration_seconds / 60)}m {p.duration_seconds % 60}s
                  </div>
                </div>
                <span className={`badge ${p.max_elevation >= 60 ? 'badge-success' : p.max_elevation >= 30 ? 'badge-info' : 'badge-warning'}`}>
                  {p.max_elevation >= 60 ? 'Excellent' : p.max_elevation >= 30 ? 'Good' : 'Fair'}
                </span>
              </div>
            );
          })}
          {!loading && passes.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>
              No upcoming passes found with current settings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
