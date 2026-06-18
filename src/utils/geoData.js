// Database offline delle principali città per calcolare distanze e tempi di viaggio senza API esterne

export const CITIES = {
  // Italia
  "Roma": { lat: 41.9028, lon: 12.4964, country: "Italia" },
  "Milano": { lat: 45.4642, lon: 9.1900, country: "Italia" },
  "Torino": { lat: 45.0703, lon: 7.6869, country: "Italia" },
  "Napoli": { lat: 40.8518, lon: 14.2681, country: "Italia" },
  "Palermo": { lat: 38.1157, lon: 13.3615, country: "Italia" },
  "Genova": { lat: 44.4056, lon: 8.9463, country: "Italia" },
  "Bologna": { lat: 44.4949, lon: 11.3426, country: "Italia" },
  "Firenze": { lat: 43.7696, lon: 11.2558, country: "Italia" },
  "Bari": { lat: 41.1171, lon: 16.8719, country: "Italia" },
  "Catania": { lat: 37.5079, lon: 15.0830, country: "Italia" },
  "Venezia": { lat: 45.4408, lon: 12.3155, country: "Italia" },
  "Verona": { lat: 45.4384, lon: 10.9916, country: "Italia" },
  "Cagliari": { lat: 39.2238, lon: 9.1217, country: "Italia" },
  "Lecce": { lat: 40.3515, lon: 18.1750, country: "Italia" },
  "Perugia": { lat: 43.1107, lon: 12.3908, country: "Italia" },
  "Trento": { lat: 46.0704, lon: 11.1211, country: "Italia" },
  "Trieste": { lat: 45.6495, lon: 13.7768, country: "Italia" },
  "Ancona": { lat: 43.6158, lon: 13.5189, country: "Italia" },
  "Pescara": { lat: 42.4618, lon: 14.2185, country: "Italia" },
  "Reggio Calabria": { lat: 38.1113, lon: 15.6473, country: "Italia" },
  
  // Estero (Europa e Mondo)
  "Londra": { lat: 51.5074, lon: -0.1278, country: "Regno Unito" },
  "Parigi": { lat: 48.8566, lon: 2.3522, country: "Francia" },
  "Berlino": { lat: 52.5200, lon: 13.4050, country: "Germania" },
  "Madrid": { lat: 40.4168, lon: -3.7038, country: "Spagna" },
  "Barcellona": { lat: 41.3851, lon: 2.1734, country: "Spagna" },
  "Bruxelles": { lat: 50.8503, lon: 4.3517, country: "Belgio" },
  "Amsterdam": { lat: 52.3676, lon: 4.9041, country: "Paesi Bassi" },
  "Zurigo": { lat: 47.3769, lon: 8.5417, country: "Svizzera" },
  "Vienna": { lat: 48.2082, lon: 16.3738, country: "Austria" },
  "New York": { lat: 40.7128, lon: -74.0060, country: "USA" }
};

// Calcola la distanza in linea d'aria usando la formula di Haversine (in km)
export function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raggio della Terra in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---- Geocoding: cache coordinate per QUALSIASI città del mondo ----
// Seed dal database locale, poi esteso via OpenStreetMap (Nominatim) e
// persistito in localStorage. Così non c'è più un elenco fisso di città.
const COORD_CACHE = {};
for (const [name, c] of Object.entries(CITIES)) {
  COORD_CACHE[name.trim().toLowerCase()] = { lat: c.lat, lon: c.lon, country: c.country };
}
try {
  const saved = JSON.parse(localStorage.getItem("oa_geo_cache") || "{}");
  Object.assign(COORD_CACHE, saved);
} catch { /* no-op */ }

// Coordinate sincrone se già note (DB locale o cache), altrimenti null
export function getCoords(name) {
  if (!name) return null;
  return COORD_CACHE[name.trim().toLowerCase()] || null;
}

const _inflight = {};
// Risolve una città qualsiasi in coordinate (async) e la mette in cache
export async function geocodeCity(name) {
  if (!name || !name.trim()) return null;
  const key = name.trim().toLowerCase();
  if (COORD_CACHE[key]) return COORD_CACHE[key];
  if (_inflight[key]) return _inflight[key];
  _inflight[key] = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1&addressdetails=1`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (data && data[0]) {
        const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), country: data[0].address?.country || "" };
        COORD_CACHE[key] = coords;
        try {
          const saved = JSON.parse(localStorage.getItem("oa_geo_cache") || "{}");
          saved[key] = coords;
          localStorage.setItem("oa_geo_cache", JSON.stringify(saved));
        } catch { /* no-op */ }
        return coords;
      }
    } catch { /* no-op */ }
    return null;
  })();
  const r = await _inflight[key];
  delete _inflight[key];
  return r;
}

// Stima il tempo di viaggio (in ore) e fornisce una descrizione
export function estimateTravelTime(fromCity, toCity, mode = "auto") {
  if (fromCity && toCity && fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) {
    return { time: 0, distance: 0, desc: "Già sul posto (0 km)" };
  }

  const start = getCoords(fromCity);
  const end = getCoords(toCity);

  if (!start || !end) {
    // Coordinate non ancora risolte: stima generica (verrà aggiornata dopo il geocoding)
    return { time: 3.5, distance: 300, desc: "Viaggio stimato: ~3.5 ore" };
  }

  const distance = getHaversineDistance(start.lat, start.lon, end.lat, end.lon);

  // Moltiplicatore stradale/ferroviario per approssimare il percorso effettivo
  const roadDistance = distance * 1.22;

  let time = 0;
  let desc = "";

  // Viaggi molto lunghi (> 700km in linea d'aria): l'aereo è la scelta ottimale
  const forceFlight = distance > 700;
  const actualMode = forceFlight ? "aereo" : mode;

  switch (actualMode) {
    case "aereo":
      // Tempo di volo stimato a 750 km/h + 2.5 ore di controlli/imbarco/trasferimenti aeroporto
      time = (distance / 750) + 2.5;
      desc = `Volo stimato (~${Math.round(distance)} km)`;
      break;

    case "treno":
      // Se esiste l'alta velocità in Italia (es. Milano-Napoli, Torino-Venezia, Bologna-Firenze)
      // stimiamo 180 km/h media, altrimenti 100 km/h
      const isHighSpeedRoute = 
        (fromCity === "Milano" || fromCity === "Torino" || fromCity === "Bologna" || fromCity === "Firenze" || fromCity === "Roma" || fromCity === "Napoli" || fromCity === "Venezia") &&
        (toCity === "Milano" || toCity === "Torino" || toCity === "Bologna" || toCity === "Firenze" || toCity === "Roma" || toCity === "Napoli" || toCity === "Venezia");
      
      const speed = isHighSpeedRoute ? 170 : 95;
      time = roadDistance / speed;
      desc = isHighSpeedRoute 
        ? `Treno Alta Velocità (~${Math.round(roadDistance)} km)` 
        : `Treno Regionale/Intercity (~${Math.round(roadDistance)} km)`;
      break;

    case "auto":
    default:
      // Velocità media stimata 110 km/h per autostrade
      time = roadDistance / 105;
      desc = `In auto (~${Math.round(roadDistance)} km)`;
      break;
  }

  // Arrotonda il tempo alla prima cifra decimale
  time = Math.round(time * 10) / 10;

  return {
    time,
    distance: Math.round(roadDistance),
    desc
  };
}
