// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { ncUpload, ncDownload, ncDelete, ncMkdir, ncList, ncStat, ncPing, ncEnsureDir } from '@/lib/nextcloud';
import { pingMailBackend } from '@/lib/secureMail';

async function requireAdmin(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  return null;
}

/**
 * GET /api/nextcloud?action=ping        → status da integração
 * GET /api/nextcloud?action=list&path=X → listar diretório
 * GET /api/nextcloud?action=download&path=X → baixar arquivo
 */
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') ?? 'ping';

  /* ── ping ── */
  if (action === 'ping') {
    const [nc, mail] = await Promise.all([ncPing(), pingMailBackend()]);
    return NextResponse.json({ nextcloud: nc, mail });
  }

  /* ── list ── */
  if (action === 'list') {
    const remotePath = searchParams.get('path') ?? 'NCFN-NextCloud';
    const items = await ncList(remotePath);
    return NextResponse.json({ path: remotePath, items });
  }

  /* ── download ── */
  if (action === 'download') {
    const remotePath = searchParams.get('path');
    if (!remotePath) return NextResponse.json({ error: 'path obrigatório' }, { status: 400 });
    const buf = await ncDownload(remotePath);
    if (!buf) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    const filename = remotePath.split('/').pop() ?? 'file';
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}

/**
 * POST /api/nextcloud
 * Body: { action, path, content?, base64? }
 * Actions: upload, mkdir, delete, ensure-dirs, sync-notes-push, sync-notes-pull
 */
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await req.json();
  const { action, path: remotePath } = body;

  /* ── upload ── */
  if (action === 'upload') {
    const { content, base64, mime } = body;
    if (!remotePath) return NextResponse.json({ error: 'path obrigatório' }, { status: 400 });
    const buf = base64 ? Buffer.from(base64, 'base64') : Buffer.from(content ?? '');
    const dir = remotePath.split('/').slice(0, -1).join('/');
    if (dir) await ncEnsureDir(dir);
    const ok = await ncUpload(remotePath, buf, mime);
    return NextResponse.json({ ok, path: remotePath });
  }

  /* ── mkdir ── */
  if (action === 'mkdir') {
    if (!remotePath) return NextResponse.json({ error: 'path obrigatório' }, { status: 400 });
    const ok = await ncEnsureDir(remotePath);
    return NextResponse.json({ ok });
  }

  /* ── delete ── */
  if (action === 'delete') {
    if (!remotePath) return NextResponse.json({ error: 'path obrigatório' }, { status: 400 });
    const ok = await ncDelete(remotePath);
    return NextResponse.json({ ok });
  }

  /* ── sync-notes-push: links-uteis → Nextcloud ── */
  if (action === 'sync-notes-push') {
    const { default: fs } = await import('fs');
    const { default: path } = await import('path');
    const notesPath = path.join('/arquivos', 'links-uteis.json');
    if (!fs.existsSync(notesPath)) return NextResponse.json({ ok: false, error: 'Arquivo de notas não encontrado' });

    const data = JSON.parse(fs.readFileSync(notesPath, 'utf-8'));
    const notes: any[] = data.notes ?? [];
    await ncEnsureDir('NCFN-NextCloud/Notas');

    let pushed = 0;
    for (const note of notes) {
      const frontmatter = `---\ntitle: ${note.title}\nid: ${note.id}\nfolderId: ${note.folderId ?? ''}\ncreatedAt: ${note.createdAt}\nupdatedAt: ${note.updatedAt}\n---\n\n`;
      const mdContent = frontmatter + (note.content ?? '');
      const filename = `${note.id}.md`;
      const ok = await ncUpload(`NCFN-NextCloud/Notas/${filename}`, mdContent, 'text/markdown');
      if (ok) pushed++;
    }

    return NextResponse.json({ ok: true, pushed, total: notes.length });
  }

  /* ── sync-notes-pull: Nextcloud → links-uteis ── */
  if (action === 'sync-notes-pull') {
    const { default: fs } = await import('fs');
    const { default: path } = await import('path');
    const notesPath = path.join('/arquivos', 'links-uteis.json');

    const ncFiles = await ncList('NCFN-NextCloud/Notas');
    const mdFiles = ncFiles.filter(f => f.name.endsWith('.md'));

    const existing = fs.existsSync(notesPath)
      ? JSON.parse(fs.readFileSync(notesPath, 'utf-8'))
      : { notes: [], folders: [] };

    const existingMap: Record<string, any> = {};
    for (const n of (existing.notes ?? [])) existingMap[n.id] = n;

    let pulled = 0;
    for (const file of mdFiles) {
      const buf = await ncDownload(`NCFN-NextCloud/Notas/${file.name}`);
      if (!buf) continue;
      const text = buf.toString('utf-8');

      // Parse frontmatter
      const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
      if (!fmMatch) continue;
      const fm: Record<string, string> = {};
      for (const line of fmMatch[1].split('\n')) {
        const [k, ...v] = line.split(': ');
        if (k) fm[k.trim()] = v.join(': ').trim();
      }
      const content = fmMatch[2];
      const id = fm.id;
      if (!id) continue;

      const ncModified = new Date(file.modified);
      const localNote = existingMap[id];
      const localModified = localNote ? new Date(localNote.updatedAt) : new Date(0);

      if (!localNote || ncModified > localModified) {
        existingMap[id] = {
          id,
          title: fm.title ?? '',
          content,
          folderId: fm.folderId || null,
          createdAt: fm.createdAt ?? new Date().toISOString(),
          updatedAt: file.modified,
          highlights: localNote?.highlights ?? [],
          pinned: localNote?.pinned ?? false,
          color: localNote?.color ?? null,
        };
        pulled++;
      }
    }

    existing.notes = Object.values(existingMap);
    fs.writeFileSync(notesPath, JSON.stringify(existing, null, 2));
    return NextResponse.json({ ok: true, pulled, total: mdFiles.length });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
