import { folderLabel, shownFolderLabel } from '../folderLabel';

const DRIVE = 'content://com.google.android.apps.docs.storage/tree/acc%3D6%3Bdoc%3Dencoded%3DR6Bwr66gfn4';
const PHONE = 'content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FSunday%20Sort';

// B-44: a Google Drive folder showed "acc=6;doc=encoded=…" as its name in Backup & restore.
describe('backup folder label', () => {
  it('drops the Drive document id and says where the folder is', () => {
    expect(folderLabel(DRIVE, 'acc=6;doc=encoded=R6Bwr66gfn4HwltKg9nTd')).toBe('Google Drive');
    expect(folderLabel(DRIVE, 'acc%3D6%3Bdoc%3Dencoded%3DR6Bwr')).toBe('Google Drive');
  });
  it('keeps real folder names', () => {
    expect(folderLabel(PHONE, 'Sunday Sort')).toBe('This phone / Sunday Sort');
    expect(folderLabel(DRIVE, 'Van backups')).toBe('Google Drive / Van backups');
  });
  it('cleans labels saved before the fix', () => {
    expect(shownFolderLabel({ uri: DRIVE, label: 'acc=6;doc=encoded=R6Bwr66gfn4' })).toBe('Google Drive');
    expect(shownFolderLabel({ uri: DRIVE, label: 'Google Drive / acc=6;doc=encoded=R6Bwr66gfn4' })).toBe('Google Drive');
    expect(shownFolderLabel({ uri: PHONE, label: 'This phone / Sunday Sort' })).toBe('This phone / Sunday Sort');
  });
});
