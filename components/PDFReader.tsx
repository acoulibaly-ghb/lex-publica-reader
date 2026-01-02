
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Book, Bookmark } from '../types';
import PDFReader from './PDFReader';
import EPUBReader from './EPUBReader';
import { Volume2, Loader2, Play, Settings2, Rabbit, Turtle, Bookmark as BookmarkIcon, List, X, Trash2, AlertCircle, Pause, Square, Maximize2, Minimize2, Sun, Moon, Coffee, Mic2, Headphones, Check, Type, AlignLeft, MoveHorizontal, Key, ExternalLink } from 'lucide-react';
import { generateSpeech, decode, decodeAudioData } from '../services/geminiService';
import { saveBookProgress, getBookProgress } from '../services/syncService';

interface ReaderProps {
  book: Book;
  onUpdateBook: (book: Book) => void;
}

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused';
type ReaderTheme = 'light' | 'sepia' | 'dark';
type FontStyle = 'serif' | 'sans';

const VOICES = [
  { id: 'Kore', name: 'Kore', desc: 'Harmonique & Clair' },
  { id: 'Puck', name: 'Puck', desc: 'Narratif & Posé' },
  { id: 'Charon', name: 'Charon', desc: 'Sonnant & Profond' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Vibrant & Énergique' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Murmure & Doux' },
];

const THEMES: Record<ReaderTheme, { bg: string, text: string, name: string, icon: any, accent: string }> = {
  light: { bg: 'bg-[#fafafa]', text: 'text-slate-900', name: 'Clair', icon: Sun, accent: 'bg-indigo-600' },
  sepia: { bg: 'bg-[#f4ecd8]', text: 'text-[#5b4636]', name: 'Sépia', icon: Coffee, accent: 'bg-[#8d6e63]' },
  dark: { bg: 'bg-slate-900', text: 'text-slate-200', name: 'Nuit', icon: Moon, accent: 'bg-indigo-400' },
};

const Reader: React.FC<ReaderProps> = ({ book, onUpdateBook }) => {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [currentPageText, setCurrentPageText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | number>("");
  const [jumpToLocation, setJumpToLocation] = useState<string | number | null>(null);
  const [ttsError, setTtsError] = useState<{message: string, isKeyIssue: boolean} | null>(null);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('light');
  const [fontStyle, setFontStyle] = useState<FontStyle>('serif');
  const [lineHeight, setLineHeight] = useState(1.6);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [isZenMode, setIsZenMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showBookmarkToast, setShowBookmarkToast] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const savedLocation = getBookProgress(book.id);
    if (savedLocation !== null) {
      setTimeout(() => setJumpToLocation(savedLocation), 100);
    }
    
    return () => {
      handleStopPlayback();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [book.id]);

  const handleTextChange = useCallback((text: string) => {
    setCurrentPageText(text);
  }, []);

  const handleLocationChange = useCallback((location: string | number, total?: number) => {
    setCurrentLocation(location);
    saveBookProgress(book.id, location);
    
    if (typeof location === 'number' && total) {
      setProgress((location / total) * 100);
    }
  }, [book.id]);

  const handleStopPlayback = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    setPlaybackStatus('idle');
  };

  const handleOpenKeySelector = async () => {
    try {
      if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        setTtsError(null);
        // On considère que la sélection a réussi et on tente de relancer si besoin
      }
    } catch (e) {
      console.error("Erreur sélecteur de clé", e);
    }
  };

  const handleTogglePause = async () => {
    if (!audioCtxRef.current) return;

    if (playbackStatus === 'playing') {
      await audioCtxRef.current.suspend();
      setPlaybackStatus('paused');
    } else if (playbackStatus === 'paused') {
      await audioCtxRef.current.resume();
      setPlaybackStatus('playing');
    }
  };

  const handleSpeak = async () => {
    if (!currentPageText || playbackStatus !== 'idle') return;
    setTtsError(null);
    
    try {
      setPlaybackStatus('loading');
      const cleanedText = currentPageText.trim().substring(0, 1500); 
      const base64Audio = await generateSpeech(cleanedText, selectedVoice, speechRate);
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = speechRate;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setPlaybackStatus(current => {
          if (current !== 'loading') {
            return 'idle';
          }
          return current;
        });
      };

      sourceRef.current = source;
      source.start();
      setPlaybackStatus('playing');

    } catch (err: any) {
      console.error("Erreur de lecture :", err);
      let friendlyMessage = "Échec de l'initialisation vocale.";
      let isKeyIssue = false;

      switch (err.message) {
        case "NETWORK_DISCONNECTED": friendlyMessage = "Connexion internet requise pour l'IA."; break;
        case "NETWORK_ERROR": friendlyMessage = "Erreur de communication avec le serveur vocal."; break;
        case "API_KEY_MISSING": 
          friendlyMessage = "Configuration de la clé API manquante."; 
          isKeyIssue = true;
          break;
        case "API_KEY_INVALID": 
          friendlyMessage = "Autorisation de la clé API refusée."; 
          isKeyIssue = true;
          break;
        case "QUOTA_EXCEEDED": friendlyMessage = "Capacité journalière de lecture atteinte."; break;
        default: friendlyMessage = "Une erreur inconnue est survenue avec Lumina AI.";
      }
      
      setTtsError({ message: friendlyMessage, isKeyIssue });
      if (!isKeyIssue) {
        setTimeout(() => setTtsError(null), 5000);
      }
      setPlaybackStatus('idle');
    }
  };

  const toggleBookmark = () => {
    const existingBookmarks = book.bookmarks || [];
    const isBookmarked = existingBookmarks.find(b => b.location === currentLocation);

    if (isBookmarked) {
      const updatedBookmarks = existingBookmarks.filter(b => b.location !== currentLocation);
      onUpdateBook({ ...book, bookmarks: updatedBookmarks });
    } else {
      const newBookmark: Bookmark = {
        id: crypto.randomUUID(),
        label: `Signet - ${typeof currentLocation === 'number' ? 'Page ' + currentLocation : 'Position'}`,
        location: currentLocation,
        timestamp: Date.now(),
      };
      onUpdateBook({ ...book, bookmarks: [...existingBookmarks, newBookmark] });
      
      setShowBookmarkToast(true);
      setTimeout(() => setShowBookmarkToast(false), 2000);
    }
  };

  const removeBookmark = (id: string) => {
    const updatedBookmarks = (book.bookmarks || []).filter(b => b.id !== id);
    onUpdateBook({ ...book, bookmarks: updatedBookmarks });
  };

  const isCurrentBookmarked = (book.bookmarks || []).some(b => b.location === currentLocation);

  return (
    <div className={`h-full flex overflow-hidden relative transition-colors duration-700 ${THEMES[readerTheme].bg}`}>
      
      {showBookmarkToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check size={18} />
          <span className="text-xs font-black uppercase tracking-widest">Signet enregistré</span>
        </div>
      )}

      {showBookmarks && (
        <div className="w-80 bg-white border-r border-slate-200 h-full flex flex-col shadow-2xl z-50 animate-in slide-in-from-left duration-500">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className={`font-bold text-slate-800 flex items-center gap-3 ${fontStyle === 'serif' ? 'serif' : ''}`}>
                <BookmarkIcon size={20} className="text-indigo-600" />
                Vos Signets
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Mémoire de lecture</p>
            </div>
            <button onClick={() => setShowBookmarks(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all active:scale-90">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(book.bookmarks || []).length === 0 ? (
              <div className="text-center py-20 px-8">
                <BookmarkIcon size={48} strokeWidth={1} className="mx-auto text-slate-200 mb-4" />
                <p className="text-sm text-slate-400 font-medium">Capturez vos moments favoris pour y revenir plus tard.</p>
              </div>
            ) : (
              (book.bookmarks || []).map((bm) => (
                <div 
                  key={bm.id} 
                  className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => {
                    setJumpToLocation(bm.location);
                    setShowBookmarks(false);
                  }}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-bold text-slate-800 truncate ${fontStyle === 'serif' ? 'serif' : ''}`}>{bm.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                      {new Date(bm.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeBookmark(bm.id); }} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/5 z-40 overflow-hidden">
          <div className={`h-full transition-all duration-700 ease-out ${THEMES[readerTheme].accent}`} style={{ width: `${progress}%` }} />
        </div>

        {!isZenMode && (
          <div className="absolute top-6 right-6 z-40 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-700">
            <button onClick={() => setIsZenMode(true)} className="p-3 bg-white/80 backdrop-blur-md border border-slate-200 shadow-xl rounded-full text-slate-600 hover:text-indigo-600 transition-all active:scale-90" title="Mode Zen">
              <Maximize2 size={20} />
            </button>
            <button onClick={() => setShowBookmarks(!showBookmarks)} className={`p-3 bg-white/80 backdrop-blur-md border border-slate-200 shadow-xl rounded-full transition-all active:scale-95 ${showBookmarks ? 'text-indigo-600 ring-2 ring-indigo-100' : 'text-slate-600'}`} title="Liste des Signets">
              <List size={20} />
            </button>
          </div>
        )}

        {isZenMode && (
          <button onClick={() => setIsZenMode(false)} className="absolute top-6 right-6 z-50 p-3 bg-slate-900/10 hover:bg-slate-900/30 text-slate-100 rounded-full backdrop-blur-sm transition-all animate-in fade-in active:scale-90" title="Sortir">
            <Minimize2 size={22} />
          </button>
        )}

        <div className={`flex-1 overflow-auto ${THEMES[readerTheme].bg} transition-colors duration-1000`}>
          {book.format === 'pdf' ? (
            <PDFReader data={book.data} onTextExtract={handleTextChange} onLocationChange={handleLocationChange} jumpToPage={typeof jumpToLocation === 'number' ? jumpToLocation : undefined} theme={readerTheme} />
          ) : (
            <EPUBReader 
              data={book.data} 
              onTextExtract={handleTextChange} 
              onLocationChange={handleLocationChange} 
              jumpToCfi={typeof jumpToLocation === 'string' ? jumpToLocation : undefined} 
              theme={readerTheme} 
              fontStyle={fontStyle}
              lineHeight={lineHeight}
              letterSpacing={letterSpacing}
            />
          )}
        </div>

        {!isZenMode && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4 w-full max-w-[95%] sm:max-w-md animate-in slide-in-from-bottom-8 duration-1000">
            {ttsError && (
              <div className="bg-red-50/90 backdrop-blur-md border border-red-100 text-red-800 px-6 py-4 rounded-3xl shadow-2xl flex flex-col gap-4 w-full animate-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="flex-shrink-0 text-red-500" />
                  <span className="text-xs font-bold leading-tight">{ttsError.message}</span>
                </div>
                {ttsError.isKeyIssue && (
                  <button 
                    onClick={handleOpenKeySelector}
                    className="w-full bg-indigo-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Key size={14} />
                    <span>Connecter Lumina AI</span>
                  </button>
                )}
              </div>
            )}

            {showVoiceMenu && (
              <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-2xl rounded-[2.5rem] p-4 mb-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-4 px-4 pt-2">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Choisir l'interprète</h4>
                   <button onClick={() => setShowVoiceMenu(false)} className="text-slate-300 hover:text-slate-600"><X size={16}/></button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {VOICES.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => { setSelectedVoice(voice.id); setShowVoiceMenu(false); }}
                      className={`flex items-center justify-between p-4 rounded-3xl transition-all ${
                        selectedVoice === voice.id 
                          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' 
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={`p-2 rounded-xl ${selectedVoice === voice.id ? 'bg-white/20' : 'bg-slate-100 text-indigo-500'}`}>
                           <Headphones size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{voice.name}</p>
                          <p className={`text-[10px] ${selectedVoice === voice.id ? 'text-white/60' : 'text-slate-400'}`}>{voice.desc}</p>
                        </div>
                      </div>
                      {selectedVoice === voice.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showSettings && (
              <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-2xl rounded-[2.5rem] p-8 mb-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-300 max-h-[70vh] overflow-y-auto">
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ambiance visuelle</p>
                      <button 
                        onClick={handleOpenKeySelector}
                        className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1.5 uppercase"
                      >
                        <Key size={10} /> Clé API
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.keys(THEMES) as ReaderTheme[]).map((t) => {
                        const Icon = THEMES[t].icon;
                        return (
                          <button key={t} onClick={() => setReaderTheme(t)} className={`flex flex-col items-center gap-2 p-4 rounded-3xl text-[11px] font-bold transition-all border-2 ${readerTheme === t ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-lg' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-white hover:border-slate-200'}`}>
                            <Icon size={18} />
                            <span>{THEMES[t].name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Typographie & Confort</p>
                      <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                        <button 
                          onClick={() => setFontStyle('serif')}
                          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${fontStyle === 'serif' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          <Type size={14} className="serif" /> Classique
                        </button>
                        <button 
                          onClick={() => setFontStyle('sans')}
                          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${fontStyle === 'sans' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          <Type size={14} /> Moderne
                        </button>
                      </div>

                      <div className="space-y-6 px-1">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
                              <AlignLeft size={14} /> Interlignage
                            </label>
                            <span className="text-[10px] font-bold text-indigo-600">{lineHeight.toFixed(1)}</span>
                          </div>
                          <input 
                            type="range" min="1.0" max="2.5" step="0.1" 
                            value={lineHeight} 
                            onChange={(e) => setLineHeight(parseFloat(e.target.value))} 
                            className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
                              <MoveHorizontal size={14} /> Espacement
                            </label>
                            <span className="text-[10px] font-bold text-indigo-600">{letterSpacing.toFixed(1)}px</span>
                          </div>
                          <input 
                            type="range" min="-1" max="5" step="0.5" 
                            value={letterSpacing} 
                            onChange={(e) => setLetterSpacing(parseFloat(e.target.value))} 
                            className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cadence de lecture</p>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{speechRate.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-4 px-1">
                      <Turtle size={16} className="text-slate-300" />
                      <input type="range" min="0.5" max="2.0" step="0.1" value={speechRate} onChange={(e) => setSpeechRate(parseFloat(e.target.value))} className="flex-1 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                      <Rabbit size={16} className="text-slate-300" />
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/billing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] font-bold text-slate-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-widest"
                    >
                      Documentation de facturation <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-full px-5 py-3 flex items-center gap-3 w-fit ring-1 ring-black/5">
              <button 
                onClick={() => { setShowSettings(!showSettings); setShowVoiceMenu(false); }}
                className={`p-2.5 rounded-full transition-all ${showSettings ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                title="Réglages de lecture"
              >
                <Settings2 size={22} />
              </button>
              
              <button 
                onClick={() => { setShowVoiceMenu(!showVoiceMenu); setShowSettings(false); }}
                className={`p-2.5 rounded-full transition-all ${showVoiceMenu ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                title="Changer de voix"
              >
                <Mic2 size={22} />
              </button>

              <button 
                onClick={toggleBookmark}
                className={`p-2.5 rounded-full transition-all ${isCurrentBookmarked ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                title="Placer un Signet ici"
              >
                <BookmarkIcon size={22} fill={isCurrentBookmarked ? "currentColor" : "none"} />
              </button>

              <div className="h-8 w-px bg-slate-200/50 mx-1" />

              {playbackStatus === 'idle' ? (
                <button onClick={handleSpeak} disabled={!currentPageText} className="flex items-center gap-3 px-8 py-3 rounded-full font-black transition-all bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-xl shadow-indigo-200 disabled:opacity-30 uppercase text-xs tracking-widest">
                  <Play size={20} fill="currentColor" />
                  <span>Démarrer</span>
                </button>
              ) : playbackStatus === 'loading' ? (
                <div className="flex items-center gap-3 px-8 py-3 rounded-full font-bold bg-indigo-50 text-indigo-400">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-xs uppercase tracking-widest">Calcul...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-indigo-50/70 rounded-full p-1.5 pr-5">
                  <button onClick={handleTogglePause} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg active:scale-90">
                    {playbackStatus === 'paused' ? <Play size={22} fill="currentColor" /> : <Pause size={22} fill="currentColor" />}
                  </button>
                  <button onClick={handleStopPlayback} className="p-3 text-slate-400 hover:text-red-500 transition-colors">
                    <Square size={20} fill="currentColor" />
                  </button>
                  <div className="ml-3 flex items-center gap-3">
                    <Volume2 size={18} className={`text-indigo-500 ${playbackStatus === 'playing' ? 'animate-pulse' : ''}`} />
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em]">
                      {selectedVoice}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reader;
