import { deleteTrip } from '@/db/tripsRepo';
import type { AppDb } from '@/db/types';
import { trashTrip, tripTrashId, untrash } from '@/features/trash/repo';

import { logDiagnostic } from './auto/native';
import { restoreTrip, snapshotTrip } from './auto/repo';
import { detachParking, undoDetach } from './parking';

/**
 * "Delete trip" from S-07c / S-08 edit: the trip goes to Recently deleted (Q30); its Parking & tolls (Q28) goes too
 * when `deleteParking`, otherwise the expense stays and loses the link. Returns the Undo for the snackbar.
 */
export function deleteTripToTrash(db: AppDb, tripId: string, deleteParking: boolean, now = Date.now()): (() => void) | null {
  const snap = snapshotTrip(db, tripId);
  if (!snap) return null;
  const parking = detachParking(db, tripId, deleteParking, now);
  deleteTrip(db, tripId);
  trashTrip(db, snap, now, parking.kept);
  // A13-15: a missing trip can be traced in "Share trip diagnostics".
  logDiagnostic('trip_deleted', { how: 'delete', startedAt: snap.trip.startedAt, startedBy: snap.trip.startedBy });
  return () => {
    restoreTrip(db, snap);
    untrash(db, [tripTrashId(tripId)]);
    undoDetach(db, tripId, parking);
  };
}
