import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from '@/services/router';
import * as Sharing from 'expo-sharing';
import { Check, CloudUpload, FileText, RotateCcw, TriangleAlert } from '@/ui/icons';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backupPlan, createBackupFile, restoreFromBackup } from '@/features/backup/backupFile';
import { inspectBackup, unpackBackup, type BackupError, type BackupManifest } from '@/features/backup/pack';
import { withLockSuspended } from '@/features/settings/lockState';
import { stopOrphanRecording } from '@/features/trips/controller';
import { formatCount, formatDate, formatDateTime, NavHeader } from '@/features/settings/ui';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Card, Dialog, Group, Progress, SettingRow, Toggle, Txt, useSnackbar } from '@/ui';

const ERRORS: Record<BackupError, () => string> = {
  not_backup: () => t('backup.notBackup'),
  damaged: () => t('backup.damaged'),
  newer: () => t('backup.newer'),
};

const countLabel = (n: number, one: 'backup.entriesOne' | 'backup.photosOne', many: 'backup.entriesN' | 'backup.photosN') =>
  n === 1 ? t(one) : t(many, { count: formatCount(n) });

type Packing = { entries: number; photos: number; done: number; total: number; fileName: string };
type Preview = { manifest: BackupManifest; fileName: string; uri: string };

/** S-12 Backup & restore. */
export default function BackupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snack = useSnackbar();
  const { settings, update } = useSettings();
  const [packing, setPacking] = useState<Packing | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // B-02: the share sheet can't tell us whether the file was saved or the sheet was dismissed, so we ask.
  const [savedAsk, setSavedAsk] = useState<number | null>(null);
  const cancelled = useRef(false);

  const error = (message: string) => snack({ message, tone: 'error', above: 'none' });

  const backUp = async () => {
    const plan = backupPlan();
    cancelled.current = false;
    const now = Date.now();
    setPacking({ entries: plan.tables.entries.length, photos: plan.photoNames.length, done: 0, total: plan.photoNames.length, fileName: '' });
    try {
      const res = await createBackupFile(plan, {
        now,
        isCancelled: () => cancelled.current,
        onProgress: (done, total) => setPacking((p) => (p ? { ...p, done, total } : p)),
      });
      if (!res) return;
      setPacking((p) => (p ? { ...p, done: p.total, fileName: res.file.name } : p));
      if (!(await Sharing.isAvailableAsync())) {
        error(t('export.shareUnavailable'));
        return;
      }
      await withLockSuspended(() =>
        Sharing.shareAsync(res.file.uri, { mimeType: 'application/octet-stream', UTI: 'public.data', dialogTitle: t('backup.backUp') }),
      );
      setSavedAsk(now);
    } catch {
      // Out of space (NoSpaceError) and write errors get the same storage message.
      error(t('backup.failed'));
    } finally {
      setPacking(null);
    }
  };

  const pick = async () => {
    const res = await withLockSuspended(() => DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false }));
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    try {
      const bytes = await new File(asset.uri).bytes();
      const r = inspectBackup(bytes);
      if (!r.ok) {
        error(ERRORS[r.error]());
        return;
      }
      setPreview({ manifest: r.manifest, fileName: asset.name, uri: asset.uri });
    } catch {
      error(t('backup.damaged'));
    }
  };

  const replace = async () => {
    if (!preview) return;
    setConfirm(false);
    setRestoring(true);
    try {
      // Let the "Restoring…" state paint before the synchronous unzip + DB swap.
      await new Promise((r) => setTimeout(r, 50));
      const bytes = await new File(preview.uri).bytes();
      const r = unpackBackup(bytes);
      if (!r.ok) {
        error(ERRORS[r.error]());
        return;
      }
      restoreFromBackup(r.manifest, r.photos);
      // A trip that was recording is gone now: stop GPS + its notifications (B-18).
      await stopOrphanRecording().catch(() => {});
      update({}); // reload settings from the restored table
      setPreview(null);
      snack({ message: t('backup.restored'), above: 'none' });
      router.back();
    } catch {
      error(t('backup.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  };

  if (preview) {
    const c = preview.manifest.counts;
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <NavHeader title={t('backup.restoreTitle')} onBack={() => setPreview(null)} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, gap: 16, paddingBottom: insets.bottom + 24 }}>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={24} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt v="h3">{t('backup.backupFrom', { date: formatDate(preview.manifest.createdAt) })}</Txt>
                <Txt v="caption" c="textSecondary" numberOfLines={1}>
                  {preview.fileName}
                </Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Stat value={c.entries} label={t('backup.entries')} />
              <Stat value={c.trips} label={t('backup.trips')} />
              <Stat value={c.photos} label={t('backup.photos')} />
            </View>
          </Card>
          <Button label={restoring ? t('backup.restoring') : t('backup.replaceButton')} variant="danger" full loading={restoring} onPress={() => setConfirm(true)} />
        </ScrollView>
        <Dialog
          visible={confirm}
          title={t('backup.replaceTitle')}
          body={t('backup.replaceBody')}
          onClose={() => setConfirm(false)}
          actions={[
            { label: t('backup.cancel'), onPress: () => setConfirm(false) },
            { label: t('backup.replace'), variant: 'danger', onPress: replace },
          ]}
        />
      </View>
    );
  }

  const last = settings.lastBackupAt;
  const pct = packing && packing.total > 0 ? packing.done / packing.total : packing ? 1 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('screens.backup')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: last ? colors.incomeSoft : colors.expenseSoft,
            }}>
            {last ? <Check size={26} color={colors.incomeText} strokeWidth={2.6} /> : <TriangleAlert size={24} color={colors.expenseText} />}
          </View>
          <View style={{ flex: 1 }}>
            {last ? (
              <>
                <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
                  {t('backup.lastBackup')}
                </Txt>
                <Txt v="h3">{formatDateTime(last)}</Txt>
              </>
            ) : (
              <Txt v="h3" c="expenseText">
                {t('backup.never')}
              </Txt>
            )}
          </View>
        </Card>

        <Txt c="textSecondary">{t('backup.explain')}</Txt>

        {packing ? (
          <View style={{ gap: 10, borderRadius: 16, padding: 16, backgroundColor: colors.sunSoft }} accessibilityLiveRegion="polite">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Txt v="small" style={{ flex: 1, fontFamily: fonts.bold }}>
                {t('backup.packing', {
                  entries: countLabel(packing.entries, 'backup.entriesOne', 'backup.entriesN'),
                  photos: countLabel(packing.photos, 'backup.photosOne', 'backup.photosN'),
                })}
              </Txt>
              <Txt v="small" style={{ fontFamily: fonts.bold }}>
                {Math.round(pct * 100)}%
              </Txt>
            </View>
            <Progress value={pct} />
            {packing.fileName ? (
              <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.medium }}>
                {packing.fileName}
              </Txt>
            ) : null}
          </View>
        ) : null}

        <Button label={t('backup.backUp')} icon={CloudUpload} full disabled={!!packing} onPress={backUp} />
        {packing && packing.done < packing.total ? (
          <Button label={t('export.cancel')} variant="text" full onPress={() => (cancelled.current = true)} />
        ) : null}
        <Button label={t('backup.restore')} icon={RotateCcw} variant="outline" full disabled={!!packing} onPress={pick} />

        <Group style={{ marginTop: 4 }}>
          <SettingRow
            title={t('backup.remind')}
            right={<Toggle value={settings.backupReminder} onChange={(v) => update({ backupReminder: v })} label={t('backup.remind')} />}
          />
        </Group>
      </ScrollView>
      <Dialog
        visible={savedAsk !== null}
        title={t('backup.savedTitle')}
        body={t('backup.savedBody')}
        onClose={() => setSavedAsk(null)}
        actions={[
          { label: t('backup.notSaved'), onPress: () => setSavedAsk(null) },
          {
            label: t('backup.yesSaved'),
            onPress: () => {
              if (savedAsk !== null) update({ lastBackupAt: savedAsk, backupBannerSnoozedUntil: null });
              setSavedAsk(null);
            },
          },
        ]}
      />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt v="amount" size={20}>
        {formatCount(value)}
      </Txt>
      <Txt v="caption" c="textSecondary">
        {label}
      </Txt>
    </View>
  );
}
