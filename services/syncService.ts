
import { Bookmark } from '../types';

const PROGRESS_KEY = 'lumina_progress';
const LAST_BOOK_KEY = 'lumina_last_book';

interface ProgressData {
  location: string | number;
  lastRead: number;
}

interface SyncData {
  [bookId: string]: ProgressData;
}

export const saveBookProgress = (bookId: string, location: string | number) => {
  const syncData: SyncData = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  syncData[bookId] = {
    location,
    lastRead: Date.now()
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(syncData));
  localStorage.setItem(LAST_BOOK_KEY, bookId);
};

export const getBookProgress = (bookId: string): string | number | null => {
  const syncData: SyncData = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  return syncData[bookId]?.location || null;
};

export const getLastReadBookId = (): string | null => {
  return localStorage.getItem(LAST_BOOK_KEY);
};

export const clearProgress = (bookId: string) => {
  const syncData: SyncData = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  delete syncData[bookId];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(syncData));
};
