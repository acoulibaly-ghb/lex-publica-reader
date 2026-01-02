
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface EPUBReaderProps {
  data: ArrayBuffer;
  onTextExtract: (text: string) => void;
  onLocationChange?: (location: string, total?: number) => void;
  jumpToCfi?: string;
  theme?: 'light' | 'sepia' | 'dark';
  fontStyle?: 'serif' | 'sans';
  lineHeight?: number;
  letterSpacing?: number;
}

const EPUBReader: React.FC<EPUBReaderProps> = ({ 
  data, 
  onTextExtract, 
  onLocationChange, 
  jumpToCfi, 
  theme = 'light', 
  fontStyle = 'serif',
  lineHeight = 1.6,
  letterSpacing = 0
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getThemeConfig = (t: string, f: string, lh: number, ls: number) => {
    const fontStack = f === 'serif' ? "'Playfair Display', serif !important" : "'Inter', sans-serif !important";
    const colors = {
      dark: { "color": "#e2e8f0 !important", "background": "transparent !important" },
      sepia: { "color": "#5b4636 !important", "background": "transparent !important" },
      light: { "color": "#1e293b !important", "background": "transparent !important" }
    };

    return {
      body: { 
        "font-family": fontStack,
        "line-height": `${lh} !important`,
        "letter-spacing": `${ls}px !important`,
        "padding": "0 10% !important",
        "font-size": "18px !important",
        ...colors[t as keyof typeof colors]
      },
      "p": {
        "margin-bottom": "1.5em !important"
      }
    };
  };

  useEffect(() => {
    if (!viewerRef.current) return;

    const ePub = (window as any).ePub;
    const bookInstance = ePub(data);

    const rendition = bookInstance.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      manager: 'default',
    });

    renditionRef.current = rendition;
    rendition.display().then(() => {
      setIsLoading(false);
    });

    rendition.on('relocated', async (navItem: any) => {
      const cfi = navItem.start.cfi;
      if (onLocationChange) onLocationChange(cfi);
      
      const iframe = viewerRef.current?.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
        const bodyText = iframe.contentDocument.body.innerText;
        onTextExtract(bodyText);
      }
    });

    rendition.themes.register("custom", getThemeConfig(theme, fontStyle, lineHeight, letterSpacing));
    rendition.themes.select("custom");

    return () => {
      if (bookInstance) bookInstance.destroy();
    };
  }, [data]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.register("custom", getThemeConfig(theme, fontStyle, lineHeight, letterSpacing));
      renditionRef.current.themes.select("custom");
    }
  }, [theme, fontStyle, lineHeight, letterSpacing]);

  useEffect(() => {
    if (jumpToCfi && renditionRef.current) {
      renditionRef.current.display(jumpToCfi);
    }
  }, [jumpToCfi]);

  const prev = () => renditionRef.current?.prev();
  const next = () => renditionRef.current?.next();

  return (
    <div className="h-full flex flex-col items-center overflow-hidden animate-in fade-in duration-700">
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="mt-4 text-slate-400 serif italic">Chargement de votre ouvrage...</p>
        </div>
      )}

      <div className={`flex-1 w-full max-w-4xl relative ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-1000`} ref={viewerRef}>
        <button 
          onClick={prev}
          className="absolute left-0 top-0 bottom-0 w-24 z-20 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-all group"
        >
          <div className="bg-slate-800/10 backdrop-blur-sm p-4 rounded-full text-slate-800 group-hover:bg-slate-800/20 transition-all transform group-hover:-translate-x-1">
            <ChevronLeft size={28} />
          </div>
        </button>
        <button 
          onClick={next}
          className="absolute right-0 top-0 bottom-0 w-24 z-20 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-all group"
        >
          <div className="bg-slate-800/10 backdrop-blur-sm p-4 rounded-full text-slate-800 group-hover:bg-slate-800/20 transition-all transform group-hover:translate-x-1">
            <ChevronRight size={28} />
          </div>
        </button>
      </div>
      
      {!isLoading && (
        <div className="flex items-center gap-10 py-6 w-full justify-center mb-28">
           <button onClick={prev} className={`flex items-center gap-3 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all group ${fontStyle === 'sans' ? '' : 'serif'}`}>
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Précédent
           </button>
           <div className="w-1 h-1 rounded-full bg-slate-200"></div>
           <button onClick={next} className={`flex items-center gap-3 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all group ${fontStyle === 'sans' ? '' : 'serif'}`}>
              Suivant <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      )}
    </div>
  );
};

export default EPUBReader;
