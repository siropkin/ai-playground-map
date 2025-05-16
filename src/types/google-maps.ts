export interface GoogleMapsPlaceDetails {
  place_id: string;
  lat: string;
  lng: string;
  formatted_address: string;
  address: {
    street_number?: string;
    route?: string;
    neighborhood?: string;
    sublocality?: string;
    locality?: string;
    administrative_area_level_1?: string;
    administrative_area_level_1_code?: string;
    postal_code?: string;
    country?: string;
    country_code?: string;
    [key: string]: string | undefined;
  };
}
