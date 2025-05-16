export interface GoogleMapsPlaceDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: string;
      lng: string;
    };
  };
  types: string[];
}
