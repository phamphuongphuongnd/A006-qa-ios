import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backupPlan, createBackupFile, inspectBackupFile, restoreFromBackupFile } from '@/features/backup/backupFile';
import { folderPort, folderReachable, pickBackupFolder, runNightlyNow, saveFolder, shownFolderLabel } from '@/features/backup/folder';
import { countsLabel, itemSub, listDate, shortDate, whenLabel } from '@/features/backup/labels';
import { backupFailures, listFolderBackups, type BackupListItem, type RunResult } from '@/features/backup/nightly';
import { BACKUP_FAILS_FOR_ALERT } from '@/features/backup/homeAlerts';
import { type BackupError, type BackupManifest } from '@/features/backup/pack';
import { clearBackupNeedsTap } from '@/features/settings/notifications';
import { withLockSuspended } from '@/features/settings/lockState';
import { stopOrphanRecording } from '@/features/trips/controller';
import { useNow } from '@/features/entries/useNow';
import { formatCount, formatDate, NavHeader } from '@/features/settings/ui';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Card, Dialog, Group, Progress, SettingRow, StatusDot, Toggle, Txt, useSnackbar } from '@/ui';
import { Bell, ChevronRight, Cloud, FileText, Folder, RotateCcw, Upload } from '@/ui/icons';
import { deviceTag } from '@/features/backup/deviceTag';

const ERRORS: Record<BackupError, () => string> = {
  not_backup: () => t('backup.notBackup'),
  damaged: () => t('backup.damaged'),
  newer: () => t('backup.newer'),
};

const countLabel = (n: number, one: 'backup.entriesOne' | 'backup.photosOne', many: 'backup.entriesN' | 'backup.photosN') =>
  n === 1 ? t(one) : t(many, { count: formatCount(n) });

type Packing = { entries: number; photos: number; done: number; total: number; fileName: string };
type Preview = { manifest: BackupManifest; fileName: string; uri: string };
type Confirm = { uri: string | null; name: string; createdAt: number; counts: { entries: number; photos: number } | null };

/** S-12 Backup & restore (v2: nightly backup into a picked folder, restore from its last 7 files). */
export default function BackupScreen() {
  'use no memo';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snack = useSnackbar();
  const params = useLocalSearchParams<{ run?: string }>();
  const { settings, update } = useSettings();
  const [packing, setPacking] = useState<Packing | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [savedAsk, setSavedAsk] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [list, setList] = useState<BackupListItem[] | 'loading' | 'error' | null>(null);
  const [reach, setReach] = useState<{ uri: string; ok: boolean } | null>(null);
  const cancelled = useRef(false);

  const saved = settings.backupFolder;
  const folder = useMemo(() => (saved ? { ...saved, label: shownFolderLabel(saved) } : null), [saved]);
  const nightly = settings.backupNightly && !!folder;
  const now = useNow(60_000);
  const fails = backupFailures(settings, now);
  const failing = nightly && fails >= BACKUP_FAILS_FOR_ALERT;
  const lastError = settings.backupRun?.lastError ?? null;

  const error = (message: string) => snack({ message, tone: 'error', above: 'none' });

  // Is the folder still there? (only shown when backups fail, but cheap enough to check on open)
  useEffect(() => {
    let live = true;
    if (folder) folderReachable(folder).then((ok) => live && setReach({ uri: folder.uri, ok }));
    return () => {
      live = false;
    };
  }, [folder]);
  const reachable = folder && reach?.uri === folder.uri ? reach.ok : null;

  const reportRun = (r: RunResult | null) => {
    if (!r || !folder) return;
    if (r.status === 'written') snack({ message: t('backupAuto.doneWritten', { folder: folder.label }), above: 'none' });
    else if (r.status === 'unchanged') snack({ message: t('backupAuto.doneUnchanged'), above: 'none' });
    else error(r.error === 'folder' ? t('backupAuto.failedBodyFolder') : r.error === 'space' ? t('backupAuto.failedBodySpace') : t('backup.failed'));
    if (r.status !== 'failed') setReach({ uri: folder.uri, ok: true });
  };

  const runNow = async (force = true) => {
    if (running) return;
    setRunning(true);
    try {
      reportRun(await (runNightlyNow({ force }) ?? Promise.resolve(null)));
      clearBackupNeedsTap();
    } finally {
      setRunning(false);
    }
  };

  // "Tap to finish last night's backup" opens /backup?run=1.
  const ranParam = useRef(false);
  useEffect(() => {
    if (params.run === '1' && !ranParam.current && nightly) {
      ranParam.current = true;
      runNow(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.run, nightly]);

  const chooseFolder = async () => {
    const picked = await pickBackupFolder();
    if (!picked) return;
    saveFolder(picked);
    update({}); // reload settings
    snack({ message: t('backupAuto.folderSaved', { folder: picked.label }), above: 'none' });
    // First backup right away: proves the folder works and starts the 7.
    setRunning(true);
    try {
      reportRun(await (runNightlyNow({ force: true }) ?? Promise.resolve(null)));
    } finally {
      setRunning(false);
    }
  };

  const setNightly = (on: boolean) => {
    if (on && !folder) {
      chooseFolder();
      return;
    }
    // Back on after a while: old misses don't count, and one backup now shows the folder still works.
    update({ backupNightly: on, ...(on ? { backupFailCount: 0, lastAutoBackupAt: null } : {}) });
    if (on) setTimeout(() => runNow(true), 0);
  };

  const backUp = async () => {
    const plan = backupPlan();
    cancelled.current = false;
    const at = Date.now();
    setPacking({ entries: plan.tables.entries.length, photos: plan.photoNames.length, done: 0, total: plan.photoNames.length, fileName: '' });
    try {
      const res = await createBackupFile(plan, {
        now: at,
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
      setSavedAsk(at);
    } catch {
      error(t('backup.failed'));
    } finally {
      setPacking(null);
    }
  };

  const pickFile = async () => {
    const res = await withLockSuspended(() => DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false }));
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    try {
      const r = await inspectBackupFile(asset.uri);
      if (!r.ok) {
        error(ERRORS[r.error]());
        return;
      }
      setPreview({ manifest: r.manifest, fileName: asset.name, uri: asset.uri });
    } catch {
      error(t('backup.damaged'));
    }
  };

  const openRestore = async () => {
    if (!folder) {
      pickFile();
      return;
    }
    setList('loading');
    try {
      const port = folderPort(folder);
      setList(port ? await listFolderBackups(port) : []);
    } catch {
      setList('error');
    }
  };

  /** Replaces everything from a local / content URI (file picker or the backup folder). */
  const restoreUri = async (uri: string | null, name: string) => {
    setConfirm(null);
    setRestoring(true);
    try {
      await new Promise((r) => setTimeout(r, 50)); // let "Restoring…" paint
      const local = uri ?? (await folderPort(folder)!.fetch(name));
      // B-87: streamed from the file — photos never all in memory at once.
      const r = await restoreFromBackupFile(local);
      if (!r.ok) {
        error(ERRORS[r.error]());
        return;
      }
      await stopOrphanRecording().catch(() => {});
      update({});
      setPreview(null);
      setList(null);
      snack({ message: t('backup.restored'), above: 'none' });
      router.back();
    } catch {
      error(t('backup.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  };

  const confirmDialog = (
    <Dialog
      visible={confirm !== null}
      title={t('backupAuto.confirmTitle')}
      body={
        confirm
          ? confirm.counts
            ? t('backupAuto.confirmBody', { date: shortDate(confirm.createdAt), counts: countsLabel(confirm.counts) })
            : t('backupAuto.confirmBodyNoCounts', { date: shortDate(confirm.createdAt) })
          : ''
      }
      onClose={() => setConfirm(null)}
      actions={[
        { label: t('backupAuto.restoreButton'), variant: 'primary', onPress: () => confirm && restoreUri(confirm.uri, confirm.name) },
        { label: t('backup.cancel'), variant: 'outline', onPress: () => setConfirm(null) },
      ]}
    />
  );

  // ---------- Restore from a picked file (bản 1 flow) ----------
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
          <Button
            label={restoring ? t('backup.restoring') : t('backup.replaceButton')}
            variant="danger"
            full
            loading={restoring}
            onPress={() => setConfirm({ uri: preview.uri, name: preview.fileName, createdAt: preview.manifest.createdAt, counts: c })}
          />
        </ScrollView>
        {confirmDialog}
      </View>
    );
  }

  // ---------- Restore from the backup folder (last 7) ----------
  if (list !== null && folder) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <NavHeader title={t('backupAuto.restore')} onBack={() => setList(null)} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, gap: 12, paddingBottom: insets.bottom + 24 }}>
          {list === 'loading' ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator color={colors.textSecondary} />
              <Txt c="textSecondary">{t('backupAuto.loadingList')}</Txt>
            </View>
          ) : list === 'error' ? (
            <Card variant="warn" style={{ gap: 4 }}>
              <StatusDot kind="warn" label={t('backupAuto.failedBodyFolder')} />
            </Card>
          ) : (
            <>
              <Txt c="textSecondary">
                {t('backupAuto.restoreFolderHeader', { folder: folder.label, count: list.filter((i) => i.nightly).length || list.length })}
              </Txt>
              {list.length === 0 ? (
                <Txt c="textSecondary">{t('backupAuto.restoreEmpty')}</Txt>
              ) : (
                <Group>
                  {list.map((i) => (
                    <Pressable
                      key={i.name}
                      accessibilityRole="button"
                      accessibilityLabel={`${listDate(i.createdAt)}, ${itemSub(i, deviceTag())}`}
                      disabled={restoring}
                      onPress={() => setConfirm({ uri: i.uri, name: i.name, createdAt: i.createdAt, counts: i.counts })}
                      style={({ pressed }) => [
                        { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 8, paddingHorizontal: 16 },
                        pressed && { backgroundColor: colors.surfaceAlt },
                      ]}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                        <Cloud size={20} color={colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Txt style={{ fontFamily: fonts.bold }}>{listDate(i.createdAt)}</Txt>
                        <Txt v="small" c="textSecondary">
                          {itemSub(i, deviceTag())}
                        </Txt>
                      </View>
                      <ChevronRight size={18} color={colors.textTertiary} />
                    </Pressable>
                  ))}
                </Group>
              )}
            </>
          )}
          {restoring ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <ActivityIndicator color={colors.textSecondary} />
              <Txt c="textSecondary">{t('backup.restoring')}</Txt>
            </View>
          ) : null}
          <Button label={t('backupAuto.restoreFromFile')} icon={FileText} variant="outline" full disabled={restoring} onPress={pickFile} />
        </ScrollView>
        {confirmDialog}
      </View>
    );
  }

  // ---------- Main ----------
  const last = settings.lastBackupAt;
  const pct = packing && packing.total > 0 ? packing.done / packing.total : packing ? 1 : 0;
  const folderNotReachable = !!folder && (reachable === false || (failing && lastError === 'folder'));
  const failBody =
    lastError === 'folder' || folderNotReachable
      ? t('backupAuto.failedBodyFolder')
      : lastError === 'space'
        ? t('backupAuto.failedBodySpace')
        : t('backupAuto.failedBodyOther');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('screens.backup')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, gap: 16, paddingBottom: insets.bottom + 24 }}>
        {/* Status card */}
        {failing ? (
          <StatusCard tone="warn" title={t('backupAuto.failedTitle', { count: Math.max(fails, BACKUP_FAILS_FOR_ALERT) })} body={failBody} />
        ) : nightly ? (
          <StatusCard
            tone="ok"
            title={t('backupAuto.statusOn')}
            body={
              settings.lastAutoBackupAt && last
                ? t('backupAuto.statusLast', { when: whenLabel(last, now), folder: folder!.label })
                : t('backupAuto.statusNoneYet', { folder: folder!.label })
            }
          />
        ) : last ? (
          <StatusCard tone="off" title={t('backupAuto.statusOff')} body={t('backupAuto.statusOffLast', { when: whenLabel(last, now) })} />
        ) : (
          <StatusCard tone="warn" title={t('backupAuto.neverTitle')} body={t('backupAuto.neverBody')} />
        )}

        {failing ? (
          lastError === 'folder' || folderNotReachable ? (
            <Button label={t('backupAuto.chooseAgain')} icon={Folder} variant="sun" full onPress={chooseFolder} disabled={running} />
          ) : (
            <Button label={t('backupAuto.backUpNow')} icon={Cloud} variant="sun" full onPress={() => runNow(true)} loading={running} />
          )
        ) : null}

        {running ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.textSecondary} />
            <Txt v="small" c="textSecondary">
              {t('backupAuto.running', { folder: folder?.label ?? '' })}
            </Txt>
          </View>
        ) : null}

        {/* Nightly backup: hero until a folder is picked */}
        {!folder ? (
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
            <View style={{ width: 72, height: 56, borderRadius: 10, backgroundColor: colors.sunSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={28} color={colors.text} />
            </View>
            <Txt v="h2" style={{ textAlign: 'center' }}>
              {t('backupAuto.heroTitle')}
            </Txt>
            <Txt c="textSecondary" style={{ textAlign: 'center' }}>
              {t('backupAuto.heroBody')}
            </Txt>
            <Button label={t('backupAuto.chooseFolder')} icon={Folder} full onPress={chooseFolder} style={{ marginTop: 6 }} />
          </Card>
        ) : (
          <Group>
            <SettingRow
              icon={Cloud}
              title={t('backupAuto.nightly')}
              subtitle={failing ? t('backupAuto.tryingTonight') : t('backupAuto.keeps7')}
              right={<Toggle value={settings.backupNightly} onChange={setNightly} label={t('backupAuto.nightly')} />}
            />
            <SettingRow
              icon={Folder}
              title={t('backupAuto.folder')}
              subtitle={folderNotReachable ? t('backupAuto.notReachable', { folder: folder.label }) : folder.label}
              value={folderNotReachable ? undefined : t('backupAuto.change')}
              right={<ChevronRight size={18} color={colors.textTertiary} />}
              onPress={chooseFolder}
            />
          </Group>
        )}

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
            {packing.done < packing.total ? (
              <Button label={t('export.cancel')} variant="text" full onPress={() => (cancelled.current = true)} />
            ) : null}
          </View>
        ) : null}

        <Group>
          <SettingRow
            icon={Upload}
            title={t('backupAuto.backUpNow')}
            subtitle={t('backupAuto.backUpNowSub')}
            right={<ChevronRight size={18} color={colors.textTertiary} />}
            onPress={packing ? undefined : backUp}
          />
          <SettingRow
            icon={RotateCcw}
            title={t('backupAuto.restore')}
            right={restoring ? <ActivityIndicator color={colors.textSecondary} /> : <ChevronRight size={18} color={colors.textTertiary} />}
            onPress={packing || restoring ? undefined : openRestore}
          />
          {!nightly ? (
            <SettingRow
              icon={Bell}
              title={t('backupAuto.remind30')}
              right={<Toggle value={settings.backupReminder} onChange={(v) => update({ backupReminder: v })} label={t('backupAuto.remind30')} />}
            />
          ) : null}
        </Group>
      </ScrollView>
      {confirmDialog}
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

function StatusCard({ tone, title, body }: { tone: 'ok' | 'warn' | 'off'; title: string; body: string }) {
  const { colors } = useTheme();
  const dot = tone === 'ok' ? colors.ok : tone === 'warn' ? colors.warn : colors.off;
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${body}`}
      style={{
        flexDirection: 'row',
        gap: 12,
        borderRadius: 16,
        padding: 16,
        backgroundColor: tone === 'warn' ? colors.warnSoft : colors.surface,
      }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: dot + '33', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt v="h3">{title}</Txt>
        <Txt c="textSecondary">{body}</Txt>
      </View>
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
