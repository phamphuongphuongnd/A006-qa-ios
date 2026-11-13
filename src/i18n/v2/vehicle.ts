/** X2 / Q24 vehicle cost method (product.md §5.3) — shared: Settings S-15, onboarding S-01c, Reports / exports (S5). */
export const vehicle = {
  title: 'Vehicle costs',
  method: {
    mileage: 'Mileage rate',
    actual: 'Actual costs',
    unsure: 'Not sure yet',
  },
  methodHint: {
    mileage: 'Claim a fixed rate per business mile. Fuel, repairs, insurance and road tax are already included.',
    actual: 'Claim what you really spent on the van, split by how much you drive for work.',
    unsure: "We'll count it like the mileage rate for now. You can change this any time.",
  },
  changeTitle: 'Change how you claim vehicle costs?',
  changeBody: 'HMRC expects you to keep the same method for the same vehicle. Check with your accountant.',
  changeBodyUS: 'The IRS expects you to keep the same method for the same vehicle. Check with your tax preparer.',
  change: 'Change',
  coveredGroup: 'Covered by mileage rate',
  coveredNote:
    'Your mileage claim already includes fuel, repairs, insurance and road tax. Parking, tolls and congestion charges are added on top.',
  businessUse: 'Business use {percent}% · {work} of {total} {unit}',
  accountantNote: 'Your accountant applies the business-use share.',
  chooseNudge: 'Choose how you claim vehicle costs',
  runningCost: 'Vehicle running cost',
  runningCostHint: 'Covered by the mileage rate',
  /** S-01c (onboarding) + its "What's the difference?" sheet. */
  onboarding: {
    title: 'How do you claim your vehicle?',
    mileageUK: '55p a mile for the first 10,000 business miles, then 25p. Fuel, repairs and insurance are included.',
    mileageUS: 'IRS standard rate per mile. Gas, repairs and insurance are included.',
    actual: 'Claim what you spend on the van, split by business use.',
    unsure: "We'll use the mileage rate for now. Ask your accountant.",
    difference: "What's the difference?",
    diffMileage: 'Mileage rate — a fixed amount for every business mile. Fuel, repairs, insurance and road tax are included.',
    diffActual: 'Actual costs — what you really spend on the van, times the share of miles that are for work.',
    diffOnTop: 'Parking, tolls and congestion charges are claimed on top with either method.',
    diffKeep: 'You normally keep one method for the same van. Your accountant can say which suits you.',
    estimate: 'Estimate only — not tax advice.',
    gotIt: 'Got it',
  },
} as const;
