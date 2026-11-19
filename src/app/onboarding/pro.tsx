import { Redirect } from 'expo-router';

import { PRO_PAUSED } from '@/domain/pro';

import ProScreen from '../pro';

/** S-19 from onboarding S-01e "See Pro": the same screen as /pro (S5), reachable before onboarding ends. */
export default function OnboardingPro() {
  // Pro paused: no S-01e page links here; an old link carries on with onboarding instead of landing on Home.
  if (PRO_PAUSED) return <Redirect href="/onboarding/reminder" />;
  return <ProScreen />;
}
