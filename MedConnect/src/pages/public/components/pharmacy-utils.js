/** "Campinas, SP" — ou um texto claro quando a farmácia ainda não informou a cidade */
export function formatLocation(p) {
  const loc = [p?.city, p?.state].filter(Boolean).join(', ');
  return loc || 'Cidade não informada';
}

/** Lista pública devolvida por GET /pharmacies/public → { data, meta } */
export function pharmacyList(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
}
