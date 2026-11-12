import { Redirect } from 'expo-router';

/** `sundaysort://trip/start` (product.md §4 deep link) → Active trip, starting a trip (B-17). Static, so it wins over `trip/[id]`. */
export default function TripStartLink() {
  return <Redirect href="/trip/active?start=1" />;
}
