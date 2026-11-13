/**
 * Pro, trial and limits (product.md §6, F-18 / S-19, P1-4, P1-11). Shared status strings live here; S5 adds the
 * purchase-screen strings in this file. `{price}` comes from the store (localised), never hard-coded in code.
 */
export const pro = {
  name: 'Sunday Sort Pro',
  badge: 'PRO',
  status: {
    free: 'Free · See Pro',
    trial: 'Trial · {days} days left',
    trialOne: 'Trial · 1 day left',
    pro: 'Pro · renews {date}',
    proNoRenew: 'Pro · ends {date}',
    expired: 'Pro ended on {date}',
  },
  context: {
    auto_trips: 'Automatic trips are a Pro feature',
    rules: 'Auto-sort rules are a Pro feature',
    recurring: 'Recurring entries are a Pro feature',
    ocr: 'Reading receipts is a Pro feature',
    suggestions: 'Suggested categories are a Pro feature',
    tax_files: 'Tax-year files are a Pro feature',
    photos: "You've used this month's 20 free photos",
  },
  tryFree: 'Try Pro free for 7 days',
  tryFreeNote: 'No card needed. Nothing is charged.',
  trialStarted: 'Pro trial started · 7 days',
  trialUsed: "You've already used your free trial.",
  ended: 'Automatic trips, rules and Pro files are paused. Everything you recorded is still here.',
  promise: 'No ads · Your data is never locked or deleted · Cancel anytime',
  /** S-01e Free & Pro (X6: limits said plainly at install). */
  onboarding: {
    title: 'Free forever.\nPro when you want it.',
    free: 'Free',
    pro: 'Pro',
    perYear: '{price}/yr',
    freeItems: 'Quick logging|Sunday sorting|Start/stop trips|20 receipt photos a month|Nightly backup|Reports in the app|Raw CSV export',
    proItems: 'Automatic trips|Auto-sort rules & suggestions|Receipt reading|Recurring entries|Unlimited photos|Tax-year PDF, MTD and FreeAgent files',
    promise: 'No ads. No account. Your data is never locked or deleted if you stop paying.',
    continueFree: 'Continue free',
    seePro: 'See Pro',
  },
  photos: {
    left: '{left} of {limit} free photos left this month',
    none: "No free photos left this month · Your entry is still saved",
  },
  notify: {
    renewTitle: 'Pro renews on {date} for {price}',
    renewBodyAndroid: 'Manage or cancel in Google Play.',
    renewBodyIOS: 'Manage or cancel in the App Store.',
    trialEndingTitle: 'Your Pro trial ends tomorrow',
    trialEndingBody: 'Automatic trips and rules will pause. Your data stays.',
  },
} as const;
