// Coordenadas centrales de referencia: Plaza Independencia, San Miguel de Tucumán
export const CENTRO_SMT = {
  lat: -26.8305,
  lng: -65.2038,
};

// Polígono aproximado del ejido urbano de San Miguel de Tucumán
// Límites: Río Salí (Este), Camino del Perú / Yerba Buena (Oeste),
// Av. Francisco de Aguirre / Las Talitas (Norte), Av. Independencia / El Manantial (Sur)
export const POLIGONO_EJIDO_SMT = [
  [-26.7835, -65.2485], // Noroeste (Camino del Perú y F. de Aguirre)
  [-26.7810, -65.1820], // Noreste (Río Salí norte)
  [-26.8150, -65.1725], // Este (Puente Lucas Córdoba / Río Salí)
  [-26.8580, -65.1820], // Sureste (Autopista / Río Salí sur)
  [-26.8820, -65.2180], // Sur (Av. Independencia / Jujuy)
  [-26.8740, -65.2580], // Suroeste (Canal Sur / Camino de Sirga)
  [-26.8280, -65.2610], // Oeste (Av. Mate de Luna y Camino del Perú)
];

/**
 * Valida si un par de coordenadas (lat, lng) pertenece al ejido urbano de San Miguel de Tucumán (RN-01 / RF-03).
 */
export function estaDentroDeSMT(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return false;

  let dentro = false;
  for (
    let i = 0, j = POLIGONO_EJIDO_SMT.length - 1;
    i < POLIGONO_EJIDO_SMT.length;
    j = i++
  ) {
    const xi = POLIGONO_EJIDO_SMT[i][0];
    const yi = POLIGONO_EJIDO_SMT[i][1];
    const xj = POLIGONO_EJIDO_SMT[j][0];
    const yj = POLIGONO_EJIDO_SMT[j][1];

    const intersecta =
      yi > lngNum !== yj > lngNum &&
      latNum < ((xj - xi) * (lngNum - yi)) / (yj - yi) + xi;
    if (intersecta) dentro = !dentro;
  }

  return dentro;
}

/**
 * Calcula la distancia en metros entre dos coordenadas GPS mediante la fórmula de Haversine.
 * Utilizado para la deduplicación espacial en un radio de 20 metros (RN-02 / RF-04).
 */
export function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radio de la Tierra en metros
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Geocodificación directa restringida a San Miguel de Tucumán (Nominatim OpenStreetMap)
 */
export async function buscarDireccionEnSMT(direccionTexto) {
  const query = encodeURIComponent(
    `${direccionTexto}, San Miguel de Tucumán, Tucumán, Argentina`
  );
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
  const resp = await fetch(url, {
    headers: { "Accept-Language": "es" },
  });
  const data = await resp.json();
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  }
  return null;
}