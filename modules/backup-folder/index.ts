import { requireOptionalNativeModule } from 'expo';

export interface FolderFile {
  name: string;
  size: number;
  modifiedAt: number;
}

interface BackupFolderNative {
  makeBookmark(folderUri: string): string;
  resolve(bookmark: string): { uri: string; stale: boolean };
  copyInto(bookmark: string, sourceUri: string, name: string): Promise<void>;
  list(bookmark: string): Promise<FolderFile[]>;
  copyOut(bookmark: string, name: string, targetUri: string): Promise<void>;
  remove(bookmark: string, name: string): Promise<void>;
}

/**
 * iOS only. Android: use expo-file-system `Directory.pickDirectoryAsync()` (the SAF tree permission is persisted)
 * and write through `new Directory(uri).createFile(...)`. null on Android / Jest.
 */
export const BackupFolder = requireOptionalNativeModule<BackupFolderNative>('SundayBackupFolder');
