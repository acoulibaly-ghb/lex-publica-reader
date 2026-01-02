
import React, { useState, useEffect } from 'react';
import { Book, BookFormat } from './types';
import { getAllBooks, saveBook, deleteBook as removeBookFromDb } from './services/storage';
import { getLastReadBookId } from './services/syncService';
import Library from './components/Library';
import Reader from './components/Reader';
import { Plus, ChevronLeft, UploadCloud, BookOpen, Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [globalTheme, setGlobalTheme] = useState<'light' | 'dark'>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const storedBooks = await getAllBooks();
    setBooks(storedBooks);
    
    if (!isInitialized) {
      const lastId = getLastReadBookId();
      if (lastId) {
        const lastBook = storedBooks.find(b => b.id === lastId);
        if (lastBook) {
          setCurrentBook(lastBook);
        }
      }
      setIsInitialized(true);
    }
  };

  const loadDemoBook = async () => {
    setIsUploading(true);
    // Création d'un "faux" PDF minimal pour la démo
    const demoContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF";
    const encoder = new TextEncoder();
    const data = encoder.encode(demoContent).buffer;

    const demoBook: Book = {
      id: 'demo-book',
      title: "L'Art de la Lecture (Exemple)",
      author: "Lumina",
      format: 'pdf',
      data: data,
      addedAt: Date.now(),
      bookmarks: []
    };

    await saveBook(demoBook);
    await loadBooks();
    setCurrentBook(demoBook);
    setIsUploading(false);
  };

  const processFile = async (file: File) => {
    const format: BookFormat = file.name.endsWith('.pdf') ? 'pdf' : 'epub';
    if (format !== 'pdf' && !file.name.endsWith('.epub')) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const newBook: Book = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        author: "Auteur Inconnu",
        format,
        data: arrayBuffer,
        addedAt: Date.now(),
        bookmarks: []
      };

      await saveBook(newBook);
      await loadBooks();
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDeleteBook = async (id: string) => {
    await removeBookFromDb(id);
    await loadBooks();
  };

  const handleUpdateBook = async (updatedBook: Book) => {
    await saveBook(updatedBook);
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    if (currentBook?.id === updatedBook.id) {
      setCurrentBook(updatedBook);
    }
  };

  return (
    <div 
      className={`min-h-screen flex flex-col relative transition-colors duration-500 ${globalTheme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-[#fafafa] text-slate-900'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] ${globalTheme === 'dark' ? 'invert' : ''}`}></div>

      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-indigo-600/90 backdrop-blur-xl flex flex-col items-center justify-center text-white p-10 pointer-events-none animate-in fade-in duration-500">
          <div className="bg-white/10 p-20 rounded-[4rem] mb-10 border-4 border-dashed border-white/30 animate-pulse flex items-center justify-center">
            <UploadCloud size={120} strokeWidth={1} />
          </div>
          <h2 className="text-5xl font-bold mb-6 serif tracking-tight">Relâchez pour importer</h2>
          <p className="text-white/60 text-xl font-medium tracking-wide">Lumina Reader prépare votre lecture...</p>
        </div>
      )}

      {!currentBook && (
        <header className={`${globalTheme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/70 border-slate-200/60'} backdrop-blur-xl border-b px-10 py-6 flex items-center justify-between sticky top-0 z-50 transition-all shadow-sm`}>
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg transform hover:scale-110 transition-transform duration-500">
              <BookOpen size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className={`text-3xl font-bold tracking-tight serif ${globalTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Lumina Reader</h1>
              <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.3em] mt-0.5">Bibliothèque Intelligente</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setGlobalTheme(t => t === 'light' ? 'dark' : 'light')}
              className={`p-3 rounded-2xl transition-all ${globalTheme === 'dark' ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              title="Changer le thème global"
            >
              {globalTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <label className="group cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all hover:shadow-xl active:scale-95 flex items-center gap-3">
              <Plus size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              <span>{isUploading ? 'Traitement...' : 'Ajouter'}</span>
              <input type="file" accept=".pdf,.epub" className="hidden" onChange={handleFileUpload} disabled={isUploading}/>
            </label>
          </div>
        </header>
      )}

      <main className="flex-1 relative z-10">
        {currentBook ? (
          <div className="h-screen flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-700">
            <div className={`${globalTheme === 'dark' ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200/60'} backdrop-blur-xl border-b px-8 py-4 flex items-center gap-6 z-50 shadow-sm`}>
              <button onClick={() => setCurrentBook(null)} className={`group p-3 rounded-2xl transition-all active:scale-75 ${globalTheme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                <ChevronLeft size={28} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className={`text-lg font-bold truncate serif ${globalTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{currentBook.title}</h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm border ${currentBook.format === 'pdf' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                    {currentBook.format.toUpperCase()}
                  </span>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">Lecture Active</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <Reader book={currentBook} onUpdateBook={handleUpdateBook} />
            </div>
          </div>
        ) : (
          <Library books={books} onOpen={setCurrentBook} onDelete={handleDeleteBook} onDemo={loadDemoBook} theme={globalTheme} />
        )}
      </main>
    </div>
  );
};

export default App;
