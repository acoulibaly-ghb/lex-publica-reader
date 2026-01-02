
export type BookFormat = 'pdf' | 'epub';

export interface Bookmark {
  id: string;
  label: string;
  location: string | number; // page number for PDF, CFI for EPUB
  timestamp: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  data: ArrayBuffer;
  cover?: string;
  addedAt: number;
  lastRead?: number;
  progress?: number;
  bookmarks?: Bookmark[];
}

export interface ReaderState {
  currentBook: Book | null;
  currentPage: number;
  totalPages: number;
}
