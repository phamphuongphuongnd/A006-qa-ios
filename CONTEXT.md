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
GPS wander while the phone stays put (indoors, parked) is part of a Stop, never distance; so is the driver walking away
from the vehicle (a delivery, home) — the Stop starts when the vehicle stopped, not when the walk ends.

**Trip end**:
A Trip — automatic or started by the driver — ends on its own when a Stop outlasts the merge threshold, whether or not
the Van Bluetooth device is still connected. The end time is when the vehicle stopped, and the driver is told.
_Avoid_: timeout, auto-stop

**Continue trip**:
Reopening a Trip that ended on its own (shortly afterwards) so the same Trip keeps recording, for a long wait the
driver didn't mean as the end.
_Avoid_: resume (that is coming back from Personal stop)

**Van Bluetooth device**:
The vehicle's own Bluetooth device the driver picks; connecting to it starts an automatic Trip.
_Avoid_: car kit, paired device

**Drive check**:
A few minutes of low-power GPS after the phone starts moving with no Trip running; getting far away faster than a walk,
while the motion sensor doesn't say walking, starts an automatic Trip from when it started moving (or from where the
vehicle set off, after a walk to it). Catches drives in slow traffic that the motion sensor never calls driving; goes on
for a while longer if it is still moving when its time is up. Walking or cycling never starts one; a bus or taxi can.
After a check finds nothing, no new check for the same movement — a stop and a new start check again.

**Personal segment**:
A part of a Trip re-scoped as Personal after the fact (a detour to or from a Stop), or skipped live with Personal stop.
_Avoid_: personal trip, exclusion

**Missing trip**:
A gap of 1 mi or more between where one GPS Trip ended and where the next one started; the app offers to add it as an
estimated Trip.
_Avoid_: ghost trip (that means a Trip the driver never made), gap fill

**Odometer check**:
A periodic odometer reading compared with the miles logged since the previous reading, to catch miles the app missed or
added.
_Avoid_: odometer trip (an odometer trip is a manual Trip entered from start/end readings)

**Vehicle cost method**:
The driver's choice of claiming vehicle costs by the mileage rate or by actual costs; it decides which vehicle Entries
count towards totals.
_Avoid_: mileage mode, simplified expenses

### Plans

**All free**:
The first store release: every driver has every feature and nothing is sold; Pro is switched off, not removed.
_Avoid_: free tier, lite

**Pro**:
The paid annual subscription that unlocks automation, tax-year exports, unlimited photos and suggestions. Paused
while the app is **All free**.
_Avoid_: premium, plus, upgrade

**Trial**:
Seven days of Pro the driver starts themselves, run in the app without a payment method.

**Free photo allowance**:
The number of receipt photos a non-Pro driver can attach per calendar month (20).
_Avoid_: quota, credits
