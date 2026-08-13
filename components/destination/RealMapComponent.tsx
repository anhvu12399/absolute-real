"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface Stop {
  key: string;
  label: string;
  lat: number;
  lng: number;
}

export const CITY_COORDS: Record<string, { lat: number; lng: number; name?: string }> = {
  // South Korea
  seoul: { lat: 37.5665, lng: 126.9780, name: "Seoul" },
  dmz: { lat: 37.9560, lng: 126.6770, name: "The DMZ" },
  gyeongju: { lat: 35.8562, lng: 129.2247, name: "Gyeongju" },
  busan: { lat: 35.1796, lng: 129.0756, name: "Busan" },
  jeju: { lat: 33.4996, lng: 126.5312, name: "Jeju Island" },
  incheon: { lat: 37.4563, lng: 126.7052, name: "Incheon" },
  southkorea: { lat: 37.5665, lng: 126.9780, name: "South Korea" },
  korea: { lat: 37.5665, lng: 126.9780, name: "South Korea" },

  // Vietnam
  hanoi: { lat: 21.0285, lng: 105.8542, name: "Hanoi" },
  halong: { lat: 20.9101, lng: 107.1839, name: "Halong Bay" },
  halongbay: { lat: 20.9101, lng: 107.1839, name: "Halong Bay" },
  lanhabay: { lat: 20.7300, lng: 107.0500, name: "Lan Ha Bay" },
  sapa: { lat: 22.3364, lng: 103.8438, name: "Sapa" },
  ninhbinh: { lat: 20.2506, lng: 105.9745, name: "Ninh Binh" },
  hue: { lat: 16.4637, lng: 107.5909, name: "Hue" },
  danang: { lat: 16.0544, lng: 108.2022, name: "Da Nang" },
  hoian: { lat: 15.8801, lng: 108.3380, name: "Hoi An" },
  quynhon: { lat: 13.7830, lng: 109.2197, name: "Quy Nhon" },
  nhatrang: { lat: 12.2388, lng: 109.1967, name: "Nha Trang" },
  dalat: { lat: 11.9404, lng: 108.4583, name: "Da Lat" },
  hcmc: { lat: 10.8231, lng: 106.6297, name: "Ho Chi Minh City" },
  saigon: { lat: 10.8231, lng: 106.6297, name: "Ho Chi Minh City" },
  hochiminhcity: { lat: 10.8231, lng: 106.6297, name: "Ho Chi Minh City" },
  mekong: { lat: 10.0452, lng: 105.7469, name: "Mekong Delta" },
  mekongdelta: { lat: 10.0452, lng: 105.7469, name: "Mekong Delta" },
  cantho: { lat: 10.0452, lng: 105.7469, name: "Can Tho" },
  phuquoc: { lat: 10.2899, lng: 103.9840, name: "Phu Quoc" },
  vietnam: { lat: 16.0544, lng: 108.2022, name: "Vietnam" },

  // Japan
  tokyo: { lat: 35.6762, lng: 139.6503, name: "Tokyo" },
  kyoto: { lat: 35.0116, lng: 135.7681, name: "Kyoto" },
  osaka: { lat: 34.6937, lng: 135.5023, name: "Osaka" },
  hakone: { lat: 35.2323, lng: 139.1069, name: "Hakone" },
  nara: { lat: 34.6851, lng: 135.8048, name: "Nara" },
  hiroshima: { lat: 34.3853, lng: 132.4553, name: "Hiroshima" },
  kanazawa: { lat: 36.5613, lng: 136.6562, name: "Kanazawa" },
  takayama: { lat: 36.1461, lng: 137.2522, name: "Takayama" },
  fukuoka: { lat: 33.5904, lng: 130.4017, name: "Fukuoka" },
  sapporo: { lat: 43.0618, lng: 141.3545, name: "Sapporo" },
  hokkaido: { lat: 43.2203, lng: 142.8635, name: "Hokkaido" },
  okinawa: { lat: 26.2124, lng: 127.6809, name: "Okinawa" },
  japan: { lat: 35.6762, lng: 139.6503, name: "Japan" },

  // Thailand
  bangkok: { lat: 13.7563, lng: 100.5018, name: "Bangkok" },
  chiangmai: { lat: 18.7883, lng: 98.9853, name: "Chiang Mai" },
  chiangrai: { lat: 19.9105, lng: 99.8406, name: "Chiang Rai" },
  phuket: { lat: 7.8804, lng: 98.3923, name: "Phuket" },
  kohsamui: { lat: 9.5120, lng: 100.0136, name: "Koh Samui" },
  krabi: { lat: 8.0863, lng: 98.9063, name: "Krabi" },
  ayutthaya: { lat: 14.3532, lng: 100.5684, name: "Ayutthaya" },
  thailand: { lat: 13.7563, lng: 100.5018, name: "Thailand" },

  // Cambodia
  siemreap: { lat: 13.3671, lng: 103.8448, name: "Siem Reap" },
  angkor: { lat: 13.4125, lng: 103.8670, name: "Angkor Wat" },
  angkorwat: { lat: 13.4125, lng: 103.8670, name: "Angkor Wat" },
  phnompenh: { lat: 11.5564, lng: 104.9282, name: "Phnom Penh" },
  battambang: { lat: 13.0957, lng: 103.2022, name: "Battambang" },
  cambodia: { lat: 13.3671, lng: 103.8448, name: "Cambodia" },

  // Laos
  luangprabang: { lat: 19.8845, lng: 102.1348, name: "Luang Prabang" },
  vientiane: { lat: 17.9757, lng: 102.6331, name: "Vientiane" },
  vangvieng: { lat: 18.9224, lng: 102.4485, name: "Vang Vieng" },
  pakse: { lat: 15.1213, lng: 105.7989, name: "Pakse" },
  laos: { lat: 19.8845, lng: 102.1348, name: "Laos" },

  // Bhutan
  thimphu: { lat: 27.4728, lng: 89.6393, name: "Thimphu" },
  paro: { lat: 27.4287, lng: 89.4164, name: "Paro" },
  punakha: { lat: 27.5768, lng: 89.8660, name: "Punakha" },
  bhutan: { lat: 27.4728, lng: 89.6393, name: "Bhutan" },

  // Indonesia / Bali
  bali: { lat: -8.4095, lng: 115.1889, name: "Bali" },
  ubud: { lat: -8.5069, lng: 115.2625, name: "Ubud" },
  seminyak: { lat: -8.6913, lng: 115.1682, name: "Seminyak" },
  uluwatu: { lat: -8.8149, lng: 115.0884, name: "Uluwatu" },
  komodo: { lat: -8.5833, lng: 119.4833, name: "Komodo National Park" },
  labuanbajo: { lat: -8.4964, lng: 119.8877, name: "Labuan Bajo" },
  yogyakarta: { lat: -7.7956, lng: 110.3695, name: "Yogyakarta" },
  indonesia: { lat: -8.4095, lng: 115.1889, name: "Indonesia" },

  // China
  beijing: { lat: 39.9042, lng: 116.4074, name: "Beijing" },
  shanghai: { lat: 31.2304, lng: 121.4737, name: "Shanghai" },
  xian: { lat: 34.3416, lng: 108.9398, name: "Xi'an" },
  guilin: { lat: 25.2736, lng: 110.2902, name: "Guilin" },
  yangshuo: { lat: 24.7797, lng: 110.4947, name: "Yangshuo" },
  chengdu: { lat: 30.5728, lng: 104.0668, name: "Chengdu" },
  hongkong: { lat: 22.3193, lng: 114.1694, name: "Hong Kong" },
  china: { lat: 30.2741, lng: 120.1551, name: "China" },

  // India & South Asia
  delhi: { lat: 28.6139, lng: 77.2090, name: "Delhi" },
  jaipur: { lat: 26.9124, lng: 75.7873, name: "Jaipur" },
  agra: { lat: 27.1767, lng: 78.0081, name: "Agra" },
  varanasi: { lat: 25.3176, lng: 82.9739, name: "Varanasi" },
  mumbai: { lat: 19.0760, lng: 72.8777, name: "Mumbai" },
  kerala: { lat: 10.8505, lng: 76.2711, name: "Kerala" },
  india: { lat: 26.9124, lng: 75.7873, name: "India" },
  kathmandu: { lat: 27.7172, lng: 85.3240, name: "Kathmandu" },
  pokhara: { lat: 28.2096, lng: 83.9856, name: "Pokhara" },
  nepal: { lat: 27.7172, lng: 85.3240, name: "Nepal" },
  colombo: { lat: 6.9271, lng: 79.8612, name: "Colombo" },
  kandy: { lat: 7.2906, lng: 80.6337, name: "Kandy" },
  galle: { lat: 6.0535, lng: 80.2210, name: "Galle" },
  srilanka: { lat: 7.8731, lng: 80.7718, name: "Sri Lanka" },
  singapore: { lat: 1.3521, lng: 103.8198, name: "Singapore" },
  malaysia: { lat: 3.1390, lng: 101.6869, name: "Malaysia" },
  philippines: { lat: 14.5995, lng: 120.9842, name: "Philippines" },
  taiwan: { lat: 25.0330, lng: 121.5654, name: "Taiwan" },
  maldives: { lat: 3.2028, lng: 73.2207, name: "Maldives" },
  mongolia: { lat: 46.8625, lng: 103.8467, name: "Mongolia" },
  uzbekistan: { lat: 39.6542, lng: 66.9597, name: "Uzbekistan" },
  oman: { lat: 23.5880, lng: 58.3829, name: "Oman" },
  georgia: { lat: 41.7151, lng: 44.8271, name: "Georgia" },
};

export function resolveCityCoords(label: string): { lat: number; lng: number; label: string; key: string } | null {
  const clean = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (CITY_COORDS[clean]) {
    return { lat: CITY_COORDS[clean].lat, lng: CITY_COORDS[clean].lng, label: CITY_COORDS[clean].name || label, key: clean };
  }
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (k.length >= 3 && (clean.includes(k) || k.includes(clean))) {
      return { lat: v.lat, lng: v.lng, label: v.name || label, key: k };
    }
  }
  return null;
}

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

    let isMounted = true;
    let L: any;

    import("leaflet").then((leafletModule) => {
      if (!isMounted || !mapContainerRef.current) return;
      L = leafletModule.default || leafletModule;

      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Clear leaflet ID on DOM node if left over
        if ((mapContainerRef.current as any)._leaflet_id) {
          delete (mapContainerRef.current as any)._leaflet_id;
        }

        // Format stops to real lat/lng
        const parsedStops: Stop[] = (stopsList || []).map((item: any, i: number) => {
          if (typeof item === "object" && item.lat && item.lng) {
            return {
              key: item.key || `stop-${i}`,
              label: item.label || item.name || `Stop ${i + 1}`,
              lat: Number(item.lat),
              lng: Number(item.lng)
            };
          }
          const label = typeof item === "string" ? item : item?.label || item?.name || `Stop ${i + 1}`;
          const resolved = resolveCityCoords(label);
          if (resolved) {
            return { key: resolved.key, label: resolved.label, lat: resolved.lat, lng: resolved.lng };
          }
          const key = String(label).toLowerCase().replace(/[^a-z0-9]/g, "");
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

        if (parsedStops.length > 0 && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
        }

        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 300);

        setReady((n) => n + 1);
      } catch (err) {
        console.warn("[RealMapComponent] Failed to initialize map:", err);
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
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
