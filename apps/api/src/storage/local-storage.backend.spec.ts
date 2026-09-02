import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalStorageBackend } from './local-storage.backend';
import { userStoragePrefix } from './storage.utils';

describe('userStoragePrefix', () => {
  it('accepts a plain user id', () => {
    expect(userStoragePrefix('cluser123')).toBe('cluser123');
  });

  it('rejects path traversal', () => {
    expect(() => userStoragePrefix('../other')).toThrow('Invalid user storage prefix');
    expect(() => userStoragePrefix('a/b')).toThrow('Invalid user storage prefix');
  });
});

describe('LocalStorageBackend.deletePrefix', () => {
  let root: string;
  let storage: LocalStorageBackend;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'easymatch-storage-'));
    storage = new LocalStorageBackend(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('removes originals, derived photos, nid, and message files for a user', () => {
    const userId = 'user_abc';
    const photosDir = join(root, userId, 'photos');
    const nidDir = join(root, userId, 'nid');
    const messagesDir = join(root, userId, 'messages');
    mkdirSync(photosDir, { recursive: true });
    mkdirSync(nidDir, { recursive: true });
    mkdirSync(messagesDir, { recursive: true });
    writeFileSync(join(photosDir, 'shot.jpg'), 'orig');
    writeFileSync(join(photosDir, 'shot.thumb.jpg'), 'thumb');
    writeFileSync(join(photosDir, 'shot.display.jpg'), 'display');
    writeFileSync(join(nidDir, 'front.pdf'), 'nid');
    writeFileSync(join(messagesDir, 'chat.webp'), 'msg');

    const otherUser = join(root, 'other_user', 'photos');
    mkdirSync(otherUser, { recursive: true });
    writeFileSync(join(otherUser, 'keep.jpg'), 'keep');

    storage.deletePrefix(userId);

    expect(existsSync(join(root, userId))).toBe(false);
    expect(existsSync(join(otherUser, 'keep.jpg'))).toBe(true);
  });
});
