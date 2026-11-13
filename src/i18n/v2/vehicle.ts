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
} as const;
