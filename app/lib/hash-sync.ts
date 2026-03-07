import fs from 'fs';
import path from 'path';

const HASH_FILE = path.join(process.cwd(), 'audit', 'system_hashes.json');

export function syncHash(fileName: string, hash: string, userId: string) {
    const auditDir = path.join(process.cwd(), 'audit');
    if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true });
    }

    let hashes: Record<string, any> = {};
    if (fs.existsSync(HASH_FILE)) {
        try {
            hashes = JSON.parse(fs.readFileSync(HASH_FILE, 'utf-8'));
        } catch (e) {
            console.error("Error reading hash file:", e);
        }
    }

    hashes[fileName] = {
        hash,
        timestamp: new Date().toISOString(),
        certifiedBy: userId
    };

    fs.writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2));
}

export function getSystemHashes() {
    if (fs.existsSync(HASH_FILE)) {
        return JSON.parse(fs.readFileSync(HASH_FILE, 'utf-8'));
    }
    return {};
}
