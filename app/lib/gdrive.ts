import { google } from 'googleapis';
import { Readable } from 'stream';

function getAuth() {
  const privateKey = (process.env.GDRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email: process.env.GDRIVE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

export async function uploadToDrive(
  fileName: string,
  buffer: Buffer,
  mimeType = 'application/octet-stream'
): Promise<{ fileId: string; webViewLink: string }> {
  const folderId = process.env.GDRIVE_FOLDER_ID;
  if (!folderId) throw new Error('GDRIVE_FOLDER_ID não configurado');

  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id,webViewLink',
  });

  if (!res.data.id) throw new Error('Google Drive não retornou file ID');
  return {
    fileId: res.data.id,
    webViewLink:
      res.data.webViewLink ||
      `https://drive.google.com/file/d/${res.data.id}/view`,
  };
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  await drive.files.delete({ fileId });
}
