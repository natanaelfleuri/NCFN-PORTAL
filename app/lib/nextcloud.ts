// @ts-nocheck
/**
 * Nextcloud WebDAV client — Portal NCFN
 * Endpoint: ${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/
 */

function ncBase() {
  const url  = process.env.NEXTCLOUD_URL?.replace(/\/$/, '');
  const user = process.env.NEXTCLOUD_USER;
  return `${url}/remote.php/dav/files/${user}`;
}

function ncAuth() {
  const user = process.env.NEXTCLOUD_USER;
  const pass = process.env.NEXTCLOUD_APP_PASSWORD;
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

function ncHeaders(extra: Record<string, string> = {}) {
  return { Authorization: ncAuth(), ...extra };
}

/** Upload a file via WebDAV PUT */
export async function ncUpload(
  remotePath: string,
  content: Buffer | string | Uint8Array,
  mime = 'application/octet-stream',
): Promise<boolean> {
  try {
    const res = await fetch(`${ncBase()}/${remotePath}`, {
      method: 'PUT',
      headers: ncHeaders({ 'Content-Type': mime }),
      body: content as any,
    });
    return res.ok || res.status === 201 || res.status === 204;
  } catch (e) {
    console.error('[NC] Upload failed:', e);
    return false;
  }
}

/** Download a file via WebDAV GET */
export async function ncDownload(remotePath: string): Promise<Buffer | null> {
  try {
    const res = await fetch(`${ncBase()}/${remotePath}`, {
      headers: ncHeaders(),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error('[NC] Download failed:', e);
    return null;
  }
}

/** Delete a file or directory via WebDAV DELETE */
export async function ncDelete(remotePath: string): Promise<boolean> {
  try {
    const res = await fetch(`${ncBase()}/${remotePath}`, {
      method: 'DELETE',
      headers: ncHeaders(),
    });
    return res.ok || res.status === 204;
  } catch (e) {
    console.error('[NC] Delete failed:', e);
    return false;
  }
}

/** Create directory via WebDAV MKCOL */
export async function ncMkdir(remotePath: string): Promise<boolean> {
  try {
    const res = await fetch(`${ncBase()}/${remotePath}`, {
      method: 'MKCOL',
      headers: ncHeaders(),
    });
    return res.ok || res.status === 405; // 405 = already exists
  } catch (e) {
    console.error('[NC] Mkdir failed:', e);
    return false;
  }
}

/** List directory contents via WebDAV PROPFIND */
export interface NcFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: 'file' | 'dir';
}

export async function ncList(remotePath: string): Promise<NcFile[]> {
  try {
    const body = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:getlastmodified/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`;
    const res = await fetch(`${ncBase()}/${remotePath}`, {
      method: 'PROPFIND',
      headers: ncHeaders({ 'Content-Type': 'application/xml', Depth: '1' }),
      body,
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items: NcFile[] = [];

    // Parse each <d:response> block
    const responseBlocks = xml.match(/<d:response[^>]*>([\s\S]*?)<\/d:response>/g) ?? [];
    for (const block of responseBlocks) {
      const href    = block.match(/<d:href[^>]*>([^<]+)<\/d:href>/)?.[1] ?? '';
      const name    = block.match(/<d:displayname[^>]*>([^<]*)<\/d:displayname>/)?.[1] ?? '';
      const size    = parseInt(block.match(/<d:getcontentlength[^>]*>([^<]*)<\/d:getcontentlength>/)?.[1] ?? '0');
      const mod     = block.match(/<d:getlastmodified[^>]*>([^<]+)<\/d:getlastmodified>/)?.[1] ?? '';
      const isDir   = block.includes('<d:collection');

      if (!name || href.endsWith(`/${remotePath}`) || href.endsWith(`/${remotePath}/`)) continue;
      items.push({ name, path: href, size, modified: mod, type: isDir ? 'dir' : 'file' });
    }
    return items;
  } catch (e) {
    console.error('[NC] List failed:', e);
    return [];
  }
}

/** Get file metadata (size, modified date) */
export async function ncStat(remotePath: string): Promise<{ size: number; modified: string } | null> {
  try {
    const body = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:getlastmodified/></d:prop></d:propfind>`;
    const res = await fetch(`${ncBase()}/${remotePath}`, {
      method: 'PROPFIND',
      headers: ncHeaders({ 'Content-Type': 'application/xml', Depth: '0' }),
      body,
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const size = parseInt(xml.match(/<d:getcontentlength[^>]*>([^<]*)<\/d:getcontentlength>/)?.[1] ?? '0');
    const modified = xml.match(/<d:getlastmodified[^>]*>([^<]+)<\/d:getlastmodified>/)?.[1] ?? '';
    return { size, modified };
  } catch {
    return null;
  }
}

/** Ensure a directory path exists, creating all segments */
export async function ncEnsureDir(remotePath: string): Promise<void> {
  const parts = remotePath.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    await ncMkdir(current);
  }
}

/** Check if Nextcloud is reachable */
export async function ncPing(): Promise<{ ok: boolean; user?: string; version?: string }> {
  try {
    const url  = process.env.NEXTCLOUD_URL?.replace(/\/$/, '');
    const user = process.env.NEXTCLOUD_USER;
    const pass = process.env.NEXTCLOUD_APP_PASSWORD;
    if (!url || !user || !pass) return { ok: false };

    const res = await fetch(`${url}/ocs/v2.php/cloud/user?format=json`, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'),
        'OCS-APIRequest': 'true',
      },
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return {
      ok: true,
      user: data?.ocs?.data?.displayname ?? user,
      version: data?.ocs?.meta?.version,
    };
  } catch {
    return { ok: false };
  }
}

/** Build the public web URL for a file */
export function ncWebUrl(remotePath: string) {
  const url  = process.env.NEXTCLOUD_URL?.replace(/\/$/, '');
  const user = process.env.NEXTCLOUD_USER;
  return `${url}/index.php/apps/files/?dir=/${encodeURIComponent(remotePath.replace(/\/[^/]+$/, ''))}&scrollto=${encodeURIComponent(remotePath.split('/').pop() ?? '')}`;
}

/** Upload and auto-create parent directories */
export async function ncUploadWithDirs(
  remotePath: string,
  content: Buffer | string | Uint8Array,
  mime?: string,
): Promise<boolean> {
  const dir = remotePath.split('/').slice(0, -1).join('/');
  if (dir) await ncEnsureDir(dir);
  return ncUpload(remotePath, content, mime);
}
