import { db } from '@/db/client';
import { deleteReceiptFiles } from '@/files/receipts';

import { purgeExpired } from './repo';

/** Recently deleted items older than 30 days go for good, with the photos nothing else uses (nightly task + app start). */
export function purgeExpiredTrash(now = Date.now()) {
  deleteReceiptFiles(purgeExpired(db, now));
}
