// Owned by session S3 (P4). Add keys here only; see src/i18n/en.ts for how namespaces are merged.
/** S3 — receipt OCR, calculator, several photos (P1-12, Q20, Q21). */
export const ocr = {
  fromReceipt: 'From receipt',
  receiptSays: 'Receipt says {amount}',
  use: 'Use',
  useA11y: 'Use the receipt amount, {amount}',
  reading: 'Reading receipt…',
  readFrom: 'Read from receipt: {parts}',
  /** F-02; S2 has the same text as sortV2.autoSortedAs — keep one when merging. */
  savedAutoSorted: 'Saved · {name} (auto-sorted)',
  // Calculator (Q20)
  checkSum: 'Check the sum',
  equals: '= {amount}',
  opPlus: 'Plus',
  opMinus: 'Minus',
  opTimes: 'Times',
  opDivide: 'Divided by',
  // Several photos (Q21) + free allowance (P1-4)
  addMorePhoto: '+ Photo',
  photoCount: '{count} of {max}',
  photosLeft: '{left} of {limit} free photos left this month',
  photosLeftOne: '1 of {limit} free photos left this month',
  photoLocked: 'Photo, free photos used up',
  usedUpTitle: "You've used this month's {limit} free photos",
  usedUpBody: 'Your entry still saves. Photos reset on {date}, or go Pro for unlimited.',
  usedUpBodyDetail: 'Photos you already have stay. Photos reset on {date}, or go Pro for unlimited.',
  tryPro: 'Try Pro free for 7 days',
  goPro: 'Go Pro',
  saveWithoutPhoto: 'Save without photo',
  notNow: 'Not now',
  someSkipped: 'Added {count} — that is all the free photos left this month.',
  maxPhotos: 'Up to {max} photos per entry.',
  // S-05
  makeRecurring: 'Make recurring',
  sortedByRule: "Sorted by rule '{rule}'",
  editRule: 'Edit rule',
  createdByRecurring: "Created by recurring '{name}'",
  editRecurring: 'Edit recurring',
  // Dev probe
  devTitle: 'OCR probe',
} as const;
