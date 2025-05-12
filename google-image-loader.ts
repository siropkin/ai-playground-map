export default function googleImageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
}) {
  try {
    const parsedSrc = JSON.parse(src);
    const { location, size, heading, fov, pitch } = parsedSrc;
    return `https://maps.googleapis.com/maps/api/streetview?location=${location}&size=${size}&heading=${heading}&fov=${fov}&pitch=${pitch}&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;
  } catch {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photoreference=${src}&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;
  }
}
