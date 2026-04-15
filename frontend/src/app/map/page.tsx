'use client';
// Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Map } from 'lucide-react';

// Leaflet must be loaded client-side only
const GroundTrackMap = dynamic(() => import('@/components/map/GroundTrackMap'), { ssr: false });

const POPULAR_SATS = [
  { norad_id: 25544, name: 'ISS (ZARYA)' },
  { norad_id: 43226, name: 'NOAA 20' },
  { norad_id: 33591, name: 'NOAA 19' },
  { norad_id: 28654, name: 'NOAA 18' },
];

export default function MapPage() {
  const [selectedNorad, setSelectedNorad] = useState(25544);
  const [selectedName, setSelectedName] = useState('ISS (ZARYA)');
  const [mapKey, setMapKey] = useState(`map-25544-${Date.now()}`);

  const selectSat = (norad: number, name: string) => {
    setSelectedNorad(norad);
    setSelectedName(name);
    // Force fresh Leaflet mount — prevents "Map container already initialized" error
    setMapKey(`map-${norad}-${Date.now()}`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">World Map</h1>
          <p className="page-subtitle">Real-time satellite ground track and current position</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {POPULAR_SATS.map(s => (
            <button
              key={s.norad_id}
              className={`btn ${selectedNorad === s.norad_id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => selectSat(s.norad_id, s.name)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', height: 580 }}>
        <GroundTrackMap key={mapKey} noradId={selectedNorad} satelliteName={selectedName} />
      </div>
    </div>
  );
}
