import { useCallback, useMemo } from 'react';

import { db } from '@/db/client';
import {
  addReceipt,
  categorise,
  categoriseMany,
  deleteEntries,
  getEntry,
  mergeEntries,
  orphanedFiles,
  removeReceipt,
  restoreSnapshot,
  splitEntry,
  updateEntry,
  type SplitPart,
} from '@/db/entriesRepo';
import type { Scope } from '@/domain/types';
import { deleteReceiptFiles } from '@/files/receipts';
import { t } from '@/i18n';
import { useSnackbar, type SnackOptions } from '@/ui';

type Lift = Pick<SnackOptions, 'above' | 'bottomOffset'>;

/**
 * Entry changes that always come with an Undo snackbar (product rule: Undo after delete / merge / split / sort).
 * Receipt files no longer used are deleted only once the snackbar goes away without Undo.
 */
export function useEntryActions({ above, bottomOffset }: Lift = {}) {
  const snack = useSnackbar();
  const lift = useMemo(() => ({ above, bottomOffset }), [above, bottomOffset]);

  const remove = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const { snapshot, orphaned } = deleteEntries(db, ids);
      snack({
        ...lift,
        message: ids.length === 1 ? t('entries.deleted') : t('entries.deletedMany', { count: ids.length }),
        actionLabel: t('common.undo'),
        onAction: () => restoreSnapshot(db, snapshot),
        onDismiss: () => deleteReceiptFiles(orphaned),
      });
    },
    [snack, lift],
  );

  const merge = useCallback(
    (ids: string[]) => {
      const res = mergeEntries(db, ids);
      if (!res.ok) {
        if (res.reason === 'mixed_types') snack({ ...lift, message: t('entries.mergeSameType') });
        return null;
      }
      snack({
        ...lift,
        message: t('entries.merged', { count: ids.length }),
        actionLabel: t('common.undo'),
        onAction: () => restoreSnapshot(db, res.snapshot),
      });
      return res.id;
    },
    [snack, lift],
  );

  const split = useCallback(
    (id: string, parts: SplitPart[]) => {
      const res = splitEntry(db, id, parts);
      if (!res.ok) return false;
      snack({
        ...lift,
        message: t('sort.splitDone', { count: parts.length }),
        actionLabel: t('common.undo'),
        onAction: () => restoreSnapshot(db, res.snapshot),
      });
      return true;
    },
    [snack, lift],
  );

  /** Sort one entry; Undo puts it back to unsorted with its old scope. */
  const sortOne = useCallback(
    (id: string, categoryId: string, categoryName: string, scope?: Scope) => {
      const before = getEntry(db, id);
      if (!before) return;
      categorise(db, id, categoryId, scope);
      snack({
        ...lift,
        message: t('sort.sortedAs', { name: categoryName }),
        actionLabel: t('common.undo'),
        onAction: () => updateEntry(db, id, { categoryId: before.categoryId, scope: before.scope }),
      });
    },
    [snack, lift],
  );

  /** Same category / scope for many entries, one Undo for all. */
  const patchMany = useCallback(
    (ids: string[], patch: { categoryId?: string; scope?: Scope }, message: string) => {
      const before = ids.map((id) => getEntry(db, id)).filter((e) => !!e);
      for (const e of before) updateEntry(db, e.id, patch);
      snack({
        ...lift,
        message,
        actionLabel: t('common.undo'),
        onAction: () => {
          for (const e of before) updateEntry(db, e.id, { categoryId: e.categoryId, scope: e.scope });
        },
      });
    },
    [snack, lift],
  );

  /** Accept-all: each entry gets its own category; one Undo puts them all back to unsorted. */
  const sortMany = useCallback(
    (items: { id: string; categoryId: string }[]) => {
      const before = items.map((it) => getEntry(db, it.id)).filter((e) => !!e);
      categoriseMany(db, items);
      snack({
        ...lift,
        message: t('sort.sortedMany', { count: items.length }),
        actionLabel: t('common.undo'),
        onAction: () => {
          for (const e of before) updateEntry(db, e.id, { categoryId: e.categoryId, scope: e.scope });
        },
      });
    },
    [snack, lift],
  );

  return { remove, merge, split, sortOne, sortMany, patchMany };
}

/** Undo-able receipt removal from an entry (S-05 "Delete photo"). */
export function useReceiptRemoval() {
  const snack = useSnackbar();
  return useCallback(
    (receipt: { id: string; entryId: string; filePath: string }) => {
      const orphan = removeReceipt(db, receipt.id);
      snack({
        above: 'none',
        message: t('common.photoDeleted'),
        actionLabel: t('common.undo'),
        onAction: () => {
          if (getEntry(db, receipt.entryId)) addReceipt(db, receipt.entryId, receipt.filePath);
        },
        onDismiss: () => {
          if (orphan) deleteReceiptFiles(orphanedFiles(db, [orphan]));
        },
      });
    },
    [snack],
  );
}
