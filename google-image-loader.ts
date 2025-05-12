export default function googleLoader({
  src,
  width,
}: {
  src: string;
  width: number;
}) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photoreference=${src}&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;
}
