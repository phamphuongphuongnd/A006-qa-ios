# Sunday Sort

A money and mileage log for self-employed van drivers and couriers (UK Self Assessment / US Schedule C): log fast during
the week, sort once on Sunday, hand clean totals to an accountant or MTD software.

## Language

### Money

**Entry**:
One income or expense amount the driver logged, with optional note and receipt photos.
_Avoid_: transaction, record, item

**Unsorted**:
An Entry or Trip that has no category (Entry) or no Work/Personal scope (Trip) yet; it waits in the Sort queue.
_Avoid_: uncategorised, pending, inbox

**Sort queue**:
Everything Unsorted, grouped by week, worked through on the Sort tab.
_Avoid_: inbox, review list

**Scope**:
Whether an Entry or Trip is Work or Personal. Only Work counts in reports and exports.
_Avoid_: business flag, type

**Category**:
The driver's own label for an Entry (e.g. "Fuel"), mapped to exactly one Tax form line.
_Avoid_: tag, class

**Tax form line**:
The box an amount is totalled into: an SA103 box (UK) or Schedule C line (US).
_Avoid_: tax code, account code

**HMRC category**:
One of the 15 expense / 2 income categories MTD quarterly updates use; every UK Tax form line maps to one.
_Avoid_: MTD field, SA box

**Rule**:
A driver-confirmed instruction "always sort entries from this merchant as this Category", applied without queueing.
_Avoid_: auto-tag, filter

**Auto-sorted**:
An Entry a Rule or Recurring template categorised; it skips the Sort queue but stays reviewable.

**Recurring template**:
A saved Entry (amount, category, scope, schedule) from which the app creates an Entry on each due date.
_Avoid_: subscription, standing order

### Miles

**Trip**:
One continuous period of business or personal driving with a distance, recorded by GPS or added manually.
_Avoid_: journey, drive, route

**Shift trip**:
An automatic Trip that spans a working session, absorbing Stops shorter than the merge threshold.
_Avoid_: day trip, session

**Stop**:
A period inside a Trip where the vehicle is not moving (a drop, a red light, queueing); short Stops never end a Trip.

**Personal segment**:
A part of a Trip re-scoped as Personal after the fact (a detour to or from a Stop), or skipped live with Personal stop.
_Avoid_: personal trip, exclusion

**Vehicle cost method**:
The driver's choice of claiming vehicle costs by the mileage rate or by actual costs; it decides which vehicle Entries
count towards totals.
_Avoid_: mileage mode, simplified expenses

### Plans

**Pro**:
The paid annual subscription that unlocks automation, tax-year exports, unlimited photos and suggestions.
_Avoid_: premium, plus, upgrade

**Trial**:
Seven days of Pro the driver starts themselves, run in the app without a payment method.

**Free photo allowance**:
The number of receipt photos a non-Pro driver can attach per calendar month (20).
_Avoid_: quota, credits
