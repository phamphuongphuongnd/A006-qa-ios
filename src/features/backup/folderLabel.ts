import { Platform } from 'react-native';

/** Google Drive hands back its document id as the folder name ("acc=6;doc=encoded=…") — not something to show (B-44). */
const opaqueName = (n: string) => /(^|;)(acc|doc)=/.test(n);

/** "Google Drive / Sunday Sort", "This phone / Backups", "iCloud Drive / Sunday Sort" — or just "Google Drive". */
export function folderLabel(uri: string, name: string | null): string {
  let n = '';
  try {
    n = name ? decodeURIComponent(name) : '';
  } catch {
    n = name ?? '';
  }
  if (opaqueName(n)) n = '';
  let where = '';
  if (uri.includes('com.google.android.apps.docs')) where = 'Google Drive';
  else if (uri.includes('com.android.externalstorage')) where = 'This phone';
  else if (uri.includes('com~apple~CloudDocs') || uri.includes('Mobile%20Documents') || uri.includes('Mobile Documents'))
    where = 'iCloud Drive';
  else if (Platform.OS === 'ios') where = 'On My iPhone';
  return where && n ? `${where} / ${n}` : n || where || 'Backup folder';
}

/** Label to show for a saved folder; folders saved before B-44 may carry Drive's document id. */
export function shownFolderLabel(folder: { uri: string; label: string }): string {
  return opaqueName(folder.label) ? folderLabel(folder.uri, null) : folder.label;
}
