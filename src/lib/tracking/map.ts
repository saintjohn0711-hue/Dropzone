export type MapCoords = { lat: number; lon: number };

export function getMapMode(): {
  mode: "mapbox" | "static" | "placeholder";
  token: string | null;
  message: string;
} {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || null;
  if (token) {
    return {
      mode: "mapbox",
      token,
      message: "Mapbox static map enabled",
    };
  }
  return {
    mode: "static",
    token: null,
    message: "OpenStreetMap static map (no Mapbox key)",
  };
}

/** Best-effort geocode via Nominatim (ToS: identify app; soft-fail OK). */
export async function geocodeAddress(
  address: string,
): Promise<MapCoords | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "DropZoneDelivery/1.0 (jobsite tracking; contact@dropzone.app)",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data?.[0]) return null;
    return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
  } catch {
    return null;
  }
}

export function staticMapUrl(coords: MapCoords, size = "780x360"): string {
  const map = getMapMode();
  if (map.mode === "mapbox" && map.token) {
    const { lon, lat } = coords;
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+e85d04(${lon},${lat})/${lon},${lat},14,0/${size}@2x?access_token=${map.token}`;
  }
  const { lon, lat } = coords;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=14&size=${size.replace("x", "x")}&maptype=mapnik&markers=${lat},${lon},red-pushpin`;
}
