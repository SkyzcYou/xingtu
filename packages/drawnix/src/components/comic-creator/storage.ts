import {
  addRecordWithCap,
  deleteRecordById,
  loadRecordsByKey,
  saveRecordsByKey,
  updateRecordById,
} from '../shared/workflow';
import type { ComicRecord } from './types';
import { stripLargeImageDataFromComicPage } from './utils';

const STORAGE_KEY = 'comic-creator:records';
const MAX_RECORDS = 50;

function sanitizeRecord(record: ComicRecord): ComicRecord {
  return {
    ...record,
    starred: !!record.starred,
    pages: Array.isArray(record.pages)
      ? record.pages.map(stripLargeImageDataFromComicPage)
      : [],
  };
}

export async function loadRecords(): Promise<ComicRecord[]> {
  return loadRecordsByKey<ComicRecord>(STORAGE_KEY, {
    normalizeRecord: sanitizeRecord,
  });
}

export async function saveRecords(records: ComicRecord[]): Promise<void> {
  await saveRecordsByKey(STORAGE_KEY, records, {
    normalizeRecord: sanitizeRecord,
  });
}

export async function addRecord(record: ComicRecord): Promise<ComicRecord[]> {
  return addRecordWithCap(STORAGE_KEY, record, MAX_RECORDS, {
    normalizeRecord: sanitizeRecord,
  });
}

export async function updateRecord(
  id: string,
  patch: Partial<ComicRecord>
): Promise<ComicRecord[]> {
  return updateRecordById(STORAGE_KEY, id, sanitizeRecordPatch(patch), {
    normalizeRecord: sanitizeRecord,
  });
}

export async function deleteRecord(id: string): Promise<ComicRecord[]> {
  return deleteRecordById(STORAGE_KEY, id, {
    normalizeRecord: sanitizeRecord,
  });
}

function sanitizeRecordPatch(
  patch: Partial<ComicRecord>
): Partial<ComicRecord> {
  if (!patch.pages) {
    return patch;
  }

  return {
    ...patch,
    pages: patch.pages.map(stripLargeImageDataFromComicPage),
  };
}
