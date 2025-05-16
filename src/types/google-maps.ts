export interface GoogleMapsPlaceDetails {
  id: string;
  formattedAddress: string;
  name?: string;
  types?: string[];
  rating?: number;
  businessStatus?: string;
  userRatingCount?: number;
  displayName?: {
    text: string;
    languageCode: string;
  };
  reviews?: Array<{
    name: string;
    relativePublishTimeDescription: string;
    rating: number;
    text?: object;
    originalText?: object;
    authorAttribution?: object;
    publishTime: string;
    flagContentUri: string;
    googleMapsUri: string;
  }>;
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
    authorAttributions?: string[];
    flagContentUri: string;
    googleMapsUri: string;
  }>;
  generativeSummary?: string;
  reviewSummary?: string;
}
