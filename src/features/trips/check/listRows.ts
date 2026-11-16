/** One Miles month list mixes trips, Missing trip rows (under the later trip) and odometer marker rows (by time). */
export type MilesItem<Trip, Gap, Odo> =
  | { kind: 'trip'; key: string; trip: Trip }
  | { kind: 'gap'; key: string; gap: Gap }
  | { kind: 'odo'; key: string; odo: Odo };

const monthKey = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

/**
 * `rows`: the month's visible trips, newest first. `complete`: every trip of the month is shown (otherwise readings
 * older than the last shown trip wait for the next step of the list).
 */
export function interleaveMonth<
  Trip extends { id: string; startedAt: number },
  Gap extends { key: string; nextId: string },
  Odo extends { reading: { id: string; readAt: number } },
>(month: string, rows: Trip[], complete: boolean, gaps: Gap[], odos: Odo[]): MilesItem<Trip, Gap, Odo>[] {
  const gapByNext = new Map(gaps.map((g) => [g.nextId, g]));
  const readings = odos.filter((o) => monthKey(o.reading.readAt) === month).sort((a, b) => b.reading.readAt - a.reading.readAt);
  const out: MilesItem<Trip, Gap, Odo>[] = [];
  let r = 0;
  for (const trip of rows) {
    while (r < readings.length && readings[r].reading.readAt > trip.startedAt) {
      out.push({ kind: 'odo', key: `odo-${readings[r].reading.id}`, odo: readings[r] });
      r++;
    }
    out.push({ kind: 'trip', key: trip.id, trip });
    const g = gapByNext.get(trip.id);
    if (g) out.push({ kind: 'gap', key: `gap-${g.key}`, gap: g });
  }
  if (complete) for (; r < readings.length; r++) out.push({ kind: 'odo', key: `odo-${readings[r].reading.id}`, odo: readings[r] });
  return out;
}
