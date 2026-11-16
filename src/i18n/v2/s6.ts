/** S6 (F-23, Q28–Q31): Recently deleted, Parking & tolls on trips, Regular trips, Exported marker. */
export const s6 = {
  // ---- Q30 Recently deleted (S-21) ----
  trashTitle: 'Recently deleted',
  trashIntro: 'Deleted entries and trips stay here for 30 days, then they are removed for good.',
  trashEmpty: 'Nothing deleted in the last 30 days.',
  trashEmptyAll: 'Empty',
  trashEmptyTitle: 'Empty Recently deleted?',
  trashEmptyBody: '{count} items and their photos will be removed for good. This can’t be undone.',
  trashEmptyBodyOne: '1 item and its photos will be removed for good. This can’t be undone.',
  trashDeletedOn: 'Deleted {date}',
  trashDaysLeft: '{count} days left',
  trashDaysLeftOne: '1 day left',
  trashLastDay: 'Last day',
  trashTrip: 'Trip',
  trashEntry: 'Entry',
  restore: 'Restore',
  deleteNow: 'Delete now',
  restored: 'Restored',
  restoreGone: 'Already restored or removed',
  deletedForGood: 'Removed for good',
  trashCount: '{count}',
  /** Snackbar after a delete: where it went. */
  deletedToTrash: 'Deleted · in Recently deleted for 30 days',

  // ---- Q28 Parking & tolls on a trip ----
  parking: 'Parking & tolls',
  parkingUS: 'Parking & tolls',
  parkingHint: 'Saved as an expense with this trip',
  parkingOnTrip: '+ {amount} parking & tolls',
  parkingNote: 'Parking · {trip}',
  fromTrip: 'From trip · {date}',
  deleteBothTitle: 'Also delete the {amount} parking & tolls?',
  deleteBothBody: 'It was saved with this trip as an expense.',
  deleteBoth: 'Delete both',
  keepExpense: 'Keep the expense',

  // ---- Q31 Regular trips ----
  regularTrips: 'Regular trips',
  regularEmpty: 'Save a trip you drive often from its trip details (⋯ → Save as a regular trip).',
  saveRegular: 'Save as a regular trip',
  saveRegularTitle: 'Save as a regular trip',
  regularName: 'Name',
  regularSaved: 'Saved to Regular trips',
  regularDeleted: 'Removed from Regular trips',
  regularUsed: 'Used {count} times',
  regularUsedOne: 'Used once',
  regularNever: 'Not used yet',
  seeAll: 'See all',
  /** "12.4 mi trip" when the trip has no A → B ends. */
  regularDefaultName: '{distance} trip',
  regularChipA11y: 'Add {name}, {distance}',
  regularFilled: 'Filled from {name}',
  rename: 'Rename',
  remove: 'Remove',

  // ---- Q29 Exported ----
  exported: 'Exported',
  exportedOn: 'Exported on {date}',
  exportedWarn: 'Already in your export of {date}. Export again to include this change.',
  changesSince: '{count} changes since your last export on {date}',
  changesSinceOne: '1 change since your last export on {date}',
  noChangesSince: 'Exported on {date} · no changes since',
} as const;
