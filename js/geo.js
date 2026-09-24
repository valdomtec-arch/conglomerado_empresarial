// js/geo.js

// Fórmula de Haversine para calcular distancia en metros entre dos coordenadas
export function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio medio de la Tierra en metros
  const rad = (deg) => (deg * Math.PI) / 180;

  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Resultado en metros
}

// Evalúa si las coordenadas actuales entran dentro de alguna geocerca registrada
export function verificarPuntoEnGeocercas(userLat, userLng, geocercas = []) {
  for (const sitio of geocercas) {
    const distancia = calcularDistanciaMetros(userLat, userLng, sitio.lat, sitio.lng);
    if (distancia <= sitio.radio_metros) {
      return {
        enRango: true,
        sitioNombre: sitio.nombre,
        tipo: sitio.tipo,
        distanciaMetros: Math.round(distancia)
      };
    }
  }

  return {
    enRango: false,
    sitioNombre: null,
    tipo: null,
    distanciaMetros: null
  };
}