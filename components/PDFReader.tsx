
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface PDFReaderProps {
  data: ArrayBuffer;
  onTextExtract: (text: string) => void;
  onLocationChange?: (location: number, total: number) => void;
  jumpToPage?: number;
  theme?: 'light' | 'sepia' | 'dark';
}

const PDFReader: React.FC<PDFReaderProps> = ({ data, onTextExtract, onLocationChange, jumpToPage, theme = 'light' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Configuration indispensable du worker
    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({ data });
    loadingTask.promise.then((pdfDoc: any) => {
      setPdf(pdfDoc);
      setNumPages(pdfDoc.numPages);
      renderPage(pdfDoc, pageNum);
      setIsLoading(false);
    }).catch((err: any) => {
      console.error("Erreur chargement PDF:", err);
      setIsLoading(false);
    });
  }, [data]);

  useEffect(() => {
    if (jumpToPage && jumpToPage !== pageNum && pdf) {
      setPageNum(jumpToPage);
      renderPage(pdf, jumpToPage);
    }
  }, [jumpToPage, pdf]);

  const renderPage = async (pdfDoc: any, num: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    
    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;

      // Extraction du texte pour la lecture vocale
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      onTextExtract(text);

      // Notification de l'emplacement pour la progression
      if (onLocationChange) onLocationChange(num, pdfDoc.numPages);
    } catch (err) {
      console.error("Erreur rendu page:", err);
    }
  };

  const changePage = (offset: number) => {
    const newPage = pageNum + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNum(newPage);
      renderPage(pdf, newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updateZoom = (delta: number) => {
    const newScale = Math.max(0.5, Math.min(3, scale + delta));
    setScale(newScale);
    if (pdf) renderPage(pdf, pageNum);
  };

  return (
    <div className="flex flex-col items-center p-8 min-h-full transition-all duration-500 animate-in fade-in">
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium serif">Préparation du document...</p>
        </div>
      )}
      
      {!isLoading && (
        <>
          <div className="sticky top-6 z-30 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full px-6 py-2.5 shadow-xl flex items-center gap-6 mb-10 ring-1 ring-black/5">
            <div className="flex items-center gap-2">
              <button onClick={() => updateZoom(-0.25)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ZoomOut size={16}/></button>
              <span className="text-[10px] font-bold text-slate-400 w-8 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => updateZoom(0.25)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ZoomIn size={16}/></button>
            </div>
            
            <div className="w-px h-6 bg-slate-200"></div>

            <div className="flex items-center gap-5">
              <button 
                onClick={() => changePage(-1)} 
                disabled={pageNum <= 1}
                className="p-1.5 hover:bg-slate-100 disabled:opacity-30 rounded-full transition-all active:scale-90 text-slate-700"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold tabular-nums text-slate-800 serif">
                <span className="text-indigo-600">{pageNum}</span> <span className="text-slate-300 mx-1">/</span> {numPages}
              </span>
              <button 
                onClick={() => changePage(1)} 
                disabled={pageNum >= numPages}
                className="p-1.5 hover:bg-slate-100 disabled:opacity-30 rounded-full transition-all active:scale-90 text-slate-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className={`relative shadow-2xl ring-1 ring-black/10 rounded-sm overflow-hidden mb-32 transition-all duration-700 transform ${
            theme === 'dark' ? 'invert opacity-90 brightness-[0.85]' : 
            theme === 'sepia' ? 'sepia-[0.3] brightness-[0.98] contrast-[1.05]' : 
            'bg-white'
          }`}>
            <canvas ref={canvasRef} className="max-w-full h-auto" />
          </div>
        </>
      )}
    </div>
  );
};

export default PDFReader;
