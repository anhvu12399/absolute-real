"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface Stop {
  key: string;
  label: string;
  lat: number;
  lng: number;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  // Cities
  hanoi: { lat: 21.0285, lng: 105.8542 },
  halong: { lat: 20.9101, lng: 107.1839 },
  halongbay: { lat: 20.9101, lng: 107.1839 },
  hue: { lat: 16.4637, lng: 107.5909 },
  hoian: { lat: 15.8801, lng: 108.3380 },
  hcmc: { lat: 10.8231, lng: 106.6297 },
  hochiminhcity: { lat: 10.8231, lng: 106.6297 },
  mekong: { lat: 10.0452, lng: 105.7469 },
  mekongdelta: { lat: 10.0452, lng: 105.7469 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  chiangmai: { lat: 18.7883, lng: 98.9853 },
  phuket: { lat: 7.8804, lng: 98.3923 },
  phnompenh: { lat: 11.5564, lng: 104.9282 },
  siemreap: { lat: 13.3671, lng: 103.8448 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  thimphu: { lat: 27.4728, lng: 89.6393 },
  paro: { lat: 27.4287, lng: 89.4164 },
  ubud: { lat: -8.5069, lng: 115.2625 },

  // Countries & Destinations Hubs
  vietnam: { lat: 16.0544, lng: 108.2022 },
  thailand: { lat: 13.7563, lng: 100.5018 },
  cambodia: { lat: 13.3671, lng: 103.8448 },
  laos: { lat: 19.8845, lng: 102.1348 },
  japan: { lat: 35.6762, lng: 139.6503 },
  bali: { lat: -8.4095, lng: 115.1889 },
  balibeyond: { lat: -8.4095, lng: 115.1889 },
  baliindonesia: { lat: -8.4095, lng: 115.1889 },
  india: { lat: 26.9124, lng: 75.7873 },
  srilanka: { lat: 7.8731, lng: 80.7718 },
  bhutan: { lat: 27.4728, lng: 89.6393 },
  nepal: { lat: 27.7172, lng: 85.3240 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  malaysia: { lat: 3.1390, lng: 101.6869 },
  philippines: { lat: 14.5995, lng: 120.9842 },
  southkorea: { lat: 37.5665, lng: 126.9780 },
  china: { lat: 30.2741, lng: 120.1551 },
  taiwan: { lat: 25.0330, lng: 121.5654 },
  mongolia: { lat: 46.8625, lng: 103.8467 },
  uzbekistan: { lat: 39.6542, lng: 66.9597 },
  maldives: { lat: 3.2028, lng: 73.2207 },
  oman: { lat: 23.5880, lng: 58.3829 },
  omanarabia: { lat: 23.5880, lng: 58.3829 },
  georgia: { lat: 41.7151, lng: 44.8271 },
  georgiacaucasus: { lat: 41.7151, lng: 44.8271 }
};

export default function RealMapComponent({
  stopsList,
  activeCity,
  setActiveCity,
  showLines = true,
}: {
  stopsList: any[];
  activeCity: string | null;
  setActiveCity: (key: string) => void;
  showLines?: boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  /* Leaflet is imported asynchronously, so the map does not exist on the first
     render. A ref alone cannot re-run the camera effect once it appears, which
     is why clicking a country did nothing until the map happened to be ready
     first. This state re-runs it. */
  const [ready, setReady] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L: any;
    import("leaflet").then((leafletModule) => {
      L = leafletModule.default || leafletModule;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Format stops to real lat/lng
      const parsedStops: Stop[] = stopsList.map((item: any, i: number) => {
        if (typeof item === "object" && item.lat && item.lng) {
          return {
            key: item.key || `stop-${i}`,
            label: item.label || item.name || `Stop ${i + 1}`,
            lat: item.lat,
            lng: item.lng
          };
        }
        const label = typeof item === "string" ? item : item.label || item.name || `Stop ${i + 1}`;
        const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
        const coords = CITY_COORDS[key] || {
          lat: 16.0 + (i % 3) * 4.0,
          lng: 105.0 + (i % 5) * 5.0,
        };
        return { key, label, lat: coords.lat, lng: coords.lng };
      });

      if (parsedStops.length === 0) return;

      const map = L.map(mapContainerRef.current, {
        center: [16.0544, 105.8542],
        zoom: 4,
        scrollWheelZoom: false,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Voyager tile layer for real maps
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Draw lines only if showLines is true and more than 1 stop
      if (showLines && parsedStops.length > 1) {
        for (let i = 0; i < parsedStops.length - 1; i++) {
          const p1 = parsedStops[i];
          const p2 = parsedStops[i + 1];

          const dLat = p2.lat - p1.lat;
          const dLng = p2.lng - p1.lng;

          const curvature = 0.22;
          const midLat = (p1.lat + p2.lat) / 2;
          const midLng = (p1.lng + p2.lng) / 2;
          const cLat = midLat - dLng * curvature;
          const cLng = midLng + dLat * curvature;

          const segmentPoints: [number, number][] = [];
          const numSteps = 25;
          for (let step = 0; step <= numSteps; step++) {
            const t = step / numSteps;
            const lat = (1 - t) * (1 - t) * p1.lat + 2 * (1 - t) * t * cLat + t * t * p2.lat;
            const lng = (1 - t) * (1 - t) * p1.lng + 2 * (1 - t) * t * cLng + t * t * p2.lng;
            segmentPoints.push([lat, lng]);
          }

          L.polyline(segmentPoints, {
            color: "#5c6863",
            weight: 2.5,
            opacity: 0.85,
            dashArray: "5, 7",
          }).addTo(map);

          // Direction Arrow
          const tArrow = 0.65;
          const arrowLat = (1 - tArrow) * (1 - tArrow) * p1.lat + 2 * (1 - tArrow) * tArrow * cLat + tArrow * tArrow * p2.lat;
          const arrowLng = (1 - tArrow) * (1 - tArrow) * p1.lng + 2 * (1 - tArrow) * tArrow * cLng + tArrow * tArrow * p2.lng;

          const dt = 0.01;
          const tNext = Math.min(1, tArrow + dt);
          const nextLat = (1 - tNext) * (1 - tNext) * p1.lat + 2 * (1 - tNext) * tNext * cLat + tNext * tNext * p2.lat;
          const nextLng = (1 - tNext) * (1 - tNext) * p1.lng + 2 * (1 - tNext) * tNext * cLng + tNext * tNext * p2.lng;

          const angleDeg = Math.atan2(nextLng - arrowLng, nextLat - arrowLat) * (180 / Math.PI);

          const arrowIcon = L.divIcon({
            className: "map-arrow-icon",
            html: `<div style="transform: rotate(${angleDeg}deg); width:18px; height:18px; display:flex; align-items:center; justify-content:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#1b2b27"><path d="M12 2L2 22l10-4 10 4z"/></svg>
            </div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          L.marker([arrowLat, arrowLng], { icon: arrowIcon, interactive: false }).addTo(map);
        }
      }

      // Add HTML markers for each stop
      const bounds = L.latLngBounds();

      parsedStops.forEach((stop) => {
        bounds.extend([stop.lat, stop.lng]);

        const customIcon = L.divIcon({
          className: "real-map-pin",
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%); z-index: 10;">
              <div style="width: 14px; height: 14px; border-radius: 50%; background: #1E2A3D; border: 2.5px solid #AD8A54; box-shadow: 0 0 8px rgba(30,42,61,0.6); margin-bottom: 4px; transition: transform 0.2s ease;"></div>
              <span style="background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(4px); color: #1E2A3D; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.12); white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,0.15);">
                ${stop.label}
              </span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const marker = L.marker([stop.lat, stop.lng], { icon: customIcon }).addTo(map);
        marker.on("click", () => {
          map.flyTo([stop.lat, stop.lng], 7, { duration: 1.2 });
          if (setActiveCity) setActiveCity(stop.key);
        });

        markersRef.current[stop.key] = marker;
      });

      if (parsedStops.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      setReady((n) => n + 1);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stopsList]);

  // Camera flyTo on active city change
  useEffect(() => {
    if (!activeCity || !mapInstanceRef.current) return;
    const key = activeCity.toLowerCase().replace(/[^a-z0-9]/g, "");
    /* Fall back to the stop's own coordinates: a country the lookup table does
       not know still has a pin on the map, and it should still be reachable. */
    const marker = markersRef.current[key];
    const coords = CITY_COORDS[key] || (marker ? { lat: marker.getLatLng().lat, lng: marker.getLatLng().lng } : null);
    if (!coords) return;

    /* flyTo is driven entirely by requestAnimationFrame. Where frames are not
       delivered - a background tab, or a reader who has asked for less motion -
       the camera would simply never arrive, so jump instead. */
    const stillCamera = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden;
    if (stillCamera) {
      mapInstanceRef.current.setView([coords.lat, coords.lng], 6, { animate: false });
    } else {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 6, { duration: 1.4 });
    }
  }, [activeCity, ready]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      }}
    />
  );
}
