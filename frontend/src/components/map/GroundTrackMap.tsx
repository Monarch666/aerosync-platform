'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License
//
// Imperative Leaflet map — avoids react-leaflet's Strict Mode "Map container
// is already initialized" bug by calling map.remove() in useEffect cleanup.

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TrackPoint { lat: number; lon: number; }
interface Position {
  lat: number; lon: number; altitude_km: number;
  azimuth: number; elevation: number; range_km: number;
  velocity_km_s: number; above_horizon: boolean;
}

export default function GroundTrackMap({
  noradId,
  satelliteName,
}: {
  noradId: number;
  satelliteName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // ── Create Leaflet map imperatively ────────────────────────────────────
    const map = L.map(el, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      className: 'map-tiles',
    }).addTo(map);

    // Custom icons
    const satIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:28px;
        background:radial-gradient(circle, #38bdf8 30%, rgba(56,189,248,0.2) 70%);
        border:2px solid #38bdf8;border-radius:50%;
        box-shadow:0 0 12px rgba(56,189,248,0.8);
        display:flex;align-items:center;justify-content:center;font-size:12px;">🛰</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const obsIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;background:#34d399;
        border:2px solid white;border-radius:50%;
        box-shadow:0 0 8px rgba(52,211,153,0.8);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    let satMarker: L.Marker | null = null;
    let footprint: L.Circle | null = null;
    let trackLines: L.Polyline[] = [];
    let obsMarker: L.Marker | null = null;
    let posInterval: ReturnType<typeof setInterval> | null = null;

    // ── Load ground track once ─────────────────────────────────────────────
    const loadTrack = async () => {
      try {
        const res = await fetch(
          `/api/track/groundtrack/${noradId}?minutes=100&step_seconds=60`
        );
        if (!res.ok) return;
        const data = await res.json();
        const pts: TrackPoint[] = data.track || [];

        // Split at anti-meridian crossings
        const segments: [number, number][][] = [];
        let seg: [number, number][] = [];
        for (let i = 0; i < pts.length; i++) {
          const pt: [number, number] = [pts[i].lat, pts[i].lon];
          if (i > 0 && Math.abs(pts[i].lon - pts[i - 1].lon) > 180) {
            if (seg.length) segments.push(seg);
            seg = [pt];
          } else {
            seg.push(pt);
          }
        }
        if (seg.length) segments.push(seg);

        trackLines.forEach(l => l.remove());
        trackLines = segments.map(s =>
          L.polyline(s, { color: '#38bdf8', weight: 1.5, opacity: 0.55, dashArray: '4 4' }).addTo(map)
        );
      } catch {}
    };

    // ── Load observer & settings ───────────────────────────────────────────
    const loadObs = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const d = await res.json();
        const { latitude, longitude } = d.observer;
        if (obsMarker) obsMarker.remove();
        obsMarker = L.marker([latitude, longitude], { icon: obsIcon })
          .bindPopup(`<strong>Observer</strong><br/>${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`)
          .addTo(map);
      } catch {}
    };

    // ── Real-time position update ──────────────────────────────────────────
    const updatePosition = async () => {
      try {
        const res = await fetch(`/api/track/${noradId}`);
        if (!res.ok) return;
        const pos: Position = await res.json();

        if (satMarker) {
          satMarker.setLatLng([pos.lat, pos.lon]);
        } else {
          satMarker = L.marker([pos.lat, pos.lon], { icon: satIcon })
            .bindPopup(`
              <div style="font-family:monospace;font-size:12px;line-height:1.8">
                <strong>${satelliteName}</strong><br/>
                Lat: ${pos.lat}° | Lon: ${pos.lon}°<br/>
                Alt: ${pos.altitude_km} km<br/>
                Az: ${pos.azimuth}° | El: ${pos.elevation}°<br/>
                Range: ${pos.range_km} km<br/>
                Speed: ${pos.velocity_km_s} km/s<br/>
                ${pos.above_horizon ? '✅ Above Horizon' : '❌ Below Horizon'}
              </div>`)
            .addTo(map);
          map.setView([pos.lat, pos.lon], 2);
        }

        // Footprint circle
        const footprintR = Math.sqrt(pos.altitude_km * 12742) * 420;
        if (footprint) {
          footprint.setLatLng([pos.lat, pos.lon]);
          (footprint as any).setRadius(footprintR);
        } else {
          footprint = L.circle([pos.lat, pos.lon], {
            radius: footprintR,
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillOpacity: 0.04,
            weight: 0.5,
          }).addTo(map);
        }
      } catch {}
    };

    // Boot sequence
    Promise.all([loadTrack(), loadObs(), updatePosition()]);
    posInterval = setInterval(updatePosition, 5000);

    // ── Cleanup — CRITICAL: map.remove() clears _leaflet_id ───────────────
    return () => {
      if (posInterval) clearInterval(posInterval);
      map.remove(); // removes Leaflet internal state from DOM element
    };
  }, [noradId, satelliteName]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%', minHeight: 400 }}
    />
  );
}
