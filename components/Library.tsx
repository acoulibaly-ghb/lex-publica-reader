
import React from 'react';
import { Book } from '../types';
import { Trash2, BookOpen, Clock, Activity, FileText, Book as BookIcon, Sparkles, Moon, Maximize2, PlayCircle, RotateCcw } from 'lucide-react';
import { getLastReadBookId, getBookProgress } from '../services/syncService';

interface LibraryProps {
  books: Book[];
  onOpen: (book: Book) => void;
  onDelete: (id: string) => void;
  onDemo: () => void;
  theme?: 'light' | 'dark';
}

const Library: React.FC<LibraryProps> = ({ books, onOpen, onDelete, onDemo, theme = 'light' }) => {
  const lastReadId = getLastReadBookId();
  const isDark = theme === 'dark';

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center animate-in fade-in zoom-in-95 duration-1000">
        <div className="relative mb-10">
          <div className={`absolute inset-0 blur-[100px] rounded-full ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-500/10'}`}></div>
          <div className={`relative p-16 rounded-[3rem] shadow-2xl border flex items-center justify-center transform hover:scale-105 transition-transform duration-500 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <BookOpen size={100} className={isDark ? 'text-indigo-400/20' : 'text-indigo-600/20'} strokeWidth={1} />
            <div className="absolute -top-4 -right-4 bg-indigo-600 text-white p-4 rounded-2xl shadow-xl animate-bounce">
              <Sparkles size={24} />
            </div>
          </div>
        </div>

        <h3 className={`text-4xl font-bold serif mb-4 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Votre sanctuaire est vide</h3>
        <p className="text-slate-400 max-w-md text-lg leading-relaxed mb-8 font-medium">
          Glissez-déposez un <span className="text-red-400 font-bold">PDF</span> ou un <span className="text-indigo-500 font-bold">EPUB</span> ici pour commencer votre voyage littéraire.
        </p>
        
        <button 
          onClick={onDemo}
          className="flex items-center gap-3 px-8 py-4 bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all mb-16 active:scale-95 group"
        >
          <PlayCircle size={20} className="group-hover:rotate-12 transition-transform" />
          <span>Essayer avec un exemple</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {[
            { icon: Sparkles, title: "Lecture par IA", desc: "Lumina vous lit vos ouvrages avec des voix naturelles.", color: "amber" },
            { icon: Moon, title: "Thèmes Immersifs", desc: "Sépia ou Nuit pour un confort visuel absolu.", color: "indigo" },
            { icon: Maximize2, title: "Mode Zen", desc: "Une interface qui s'efface pour laisser place aux mots.", color: "slate" }
          ].map((feat, i) => (
            <div key={i} className={`backdrop-blur-sm p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all group ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/60 border-white'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <feat.icon size={24} className={feat.color === 'amber' ? 'text-amber-500' : feat.color === 'indigo' ? 'text-indigo-500' : 'text-slate-500'} />
              </div>
              <h4 className={`font-bold mb-2 serif ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{feat.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-16 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-16">
        <div>
          <h2 className={`text-5xl font-bold serif tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Ma Bibliothèque</h2>
          <div className="h-1.5 w-16 bg-indigo-600 rounded-full mt-4 shadow-lg shadow-indigo-100"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-10 gap-y-16">
        {books.map((book) => {
          const isLastRead = book.id === lastReadId;
          const isPdf = book.format === 'pdf';
          const progressInfo = getBookProgress(book.id);
          const hasProgress = progressInfo !== null;
          
          return (
            <div key={book.id} className="group relative flex flex-col">
              <div 
                onClick={() => onOpen(book)}
                className={`aspect-[2/3] rounded-[2rem] shadow-xl border overflow-hidden cursor-pointer transition-all duration-700 hover:shadow-2xl hover:-translate-y-4 relative ${
                  isLastRead ? 'ring-8 ring-indigo-500/20' : ''
                } ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}
              >
                {isLastRead && (
                  <div className="absolute top-4 left-4 z-20 bg-indigo-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-2xl flex items-center gap-2 shadow-2xl">
                    <Activity size={12} className="animate-pulse" />
                    <span>En cours</span>
                  </div>
                )}

                {/* Barre de progression visuelle sur la couverture */}
                {hasProgress && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/5 z-20">
                     <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: '40%' }}></div> {/* On simule 40% si pas de total précis dispo */}
                  </div>
                )}
                
                <div className="flex flex-col items-center justify-center h-full p-8 text-center relative z-10">
                  <div className={`flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-2xl mb-8 border transition-all ${
                    isPdf ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                  }`}>
                    {isPdf ? <FileText size={14} /> : <BookIcon size={14} />}
                    <span>{book.format}</span>
                  </div>
                  <p className={`text-xl font-bold line-clamp-3 mb-6 serif leading-[1.4] transition-colors ${isDark ? 'text-slate-100 group-hover:text-indigo-400' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                    {book.title}
                  </p>
                  
                  <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-6 group-hover:translate-y-0 gap-2">
                    <div className="bg-indigo-600 text-white px-8 py-3.5 rounded-full shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      {hasProgress ? <PlayCircle size={16} /> : null}
                      {hasProgress ? 'Reprendre' : 'Lire'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 px-2">
                <h3 className={`text-sm font-bold truncate serif mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{book.title}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <Clock size={12} />
                    <span>{new Date(book.addedAt).toLocaleDateString()}</span>
                  </div>
                  <button onClick={(e) => {e.stopPropagation(); onDelete(book.id);}} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Library;
