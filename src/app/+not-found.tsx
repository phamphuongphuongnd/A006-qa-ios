import { Redirect } from 'expo-router';

/**
 * QA-100 (phiên D, SPE-11): a link to a path the app doesn't have showed expo-router's "Unmatched Route" page with a
 * Sitemap button. Any unknown link goes Home instead (App lock and onboarding still guard what Home shows).
 */
export default function NotFound() {
  return <Redirect href="/" />;
}
