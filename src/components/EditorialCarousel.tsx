import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ============================================================================
// Types
// ============================================================================
export interface EditorialArticle {
  headline: string;
  summary: string;
  category?: string;
  image_url?: string;
  source?: string;
}

interface EditorialCarouselProps {
  data: string;
}

// ============================================================================
// Internal Sub-Component: Safe Image Handler
// Prevents DOM-mutation anti-patterns on image failure
// ============================================================================
const EditorialImage = React.memo(({ src, alt }: { src: string; alt: string }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
        return <div className="absolute inset-0 bg-white/[0.02] flex items-center justify-center border-b border-white/[0.02]" />;
    }

    return (
        <img 
            src={src} 
            alt={alt}
            className="w-full h-full object-cover transform group-hover:scale-[1.03] transition-all duration-1000 ease-[0.16,1,0.3,1] opacity-80 grayscale-[0.2] contrast-125 group-hover:grayscale-0 group-hover:opacity-100"
            onError={() => setHasError(true)}
            loading="lazy"
            decoding="async"
        />
    );
});
EditorialImage.displayName = 'EditorialImage';

// ============================================================================
// Primary Component
// ============================================================================
export function EditorialCarousel({ data }: EditorialCarouselProps) {
  // Defensive Parsing: Memoized to prevent re-evaluation on parent renders
  const parsedArticles = useMemo<EditorialArticle[]>(() => {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('[AURA:UI:FAULT] Failed to parse Editorial Carousel data');
      return [];
    }
  }, [data]);

  if (parsedArticles.length === 0) return null;

  return (
    <div className="w-full my-12 font-sans overflow-hidden">
        {/* Institutional Header */}
        <div className="mb-6 flex items-center justify-between border-b border-white/[0.04] pb-3 px-1">
            <h3 className="text-[11px] font-medium text-neutral-500 tracking-widest uppercase select-none">
                Trending Storylines
            </h3>
            <span className="text-[10px] font-mono text-neutral-600 tracking-widest uppercase select-none tabular-nums">
                {parsedArticles.length} Updates
            </span>
        </div>
        
        {/* Native CSS Snap Carousel (Hidden Scrollbars) */}
        <div className="relative -mx-6 px-6 sm:mx-0 sm:px-0">
            <div 
                className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-8 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="region"
                aria-label="Editorial Stories"
            >
                <AnimatePresence>
                    {parsedArticles.map((article, idx) => (
                        <motion.article 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ 
                                duration: 0.7, 
                                delay: idx * 0.08, 
                                ease: [0.16, 1, 0.3, 1] // Apple-grade native spring easing
                            }}
                            key={idx}
                            className="relative flex flex-col min-w-[85%] sm:min-w-[340px] max-w-[340px] snap-center sm:snap-start overflow-hidden rounded-[16px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-md transition-all duration-300 hover:bg-white/[0.03] group cursor-pointer"
                        >
                            {/* Cinematic Image Frame */}
                            {article.image_url && (
                                 <div className="h-44 w-full overflow-hidden relative bg-[#0a0a0a] border-b border-white/[0.02]">
                                     <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 via-transparent to-transparent z-10 pointer-events-none" />
                                     <EditorialImage src={article.image_url} alt={article.headline} />
                                     
                                     {article.category && (
                                         <div className="absolute top-4 left-4 z-20">
                                             <span className="px-2.5 py-1 bg-[#0a0a0a]/60 backdrop-blur-md rounded-[4px] border border-white/10 text-[9px] font-medium text-neutral-300 uppercase tracking-widest select-none shadow-sm">
                                                 {article.category}
                                             </span>
                                         </div>
                                     )}
                                 </div>
                            )}
                            
                            {/* Content Body */}
                            <div className={`p-6 flex flex-col flex-1 relative z-20 ${article.image_url ? '' : 'pt-8'}`}>
                                {!article.image_url && article.category && (
                                    <div className="mb-4">
                                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest select-none">
                                            {article.category}
                                        </span>
                                    </div>
                                )}
                                
                                <h4 className="text-[16px] font-medium text-neutral-100 leading-[1.35] tracking-tight mb-3 group-hover:text-white transition-colors duration-300 line-clamp-2">
                                    {article.headline}
                                </h4>

                                <p className="text-[14px] text-neutral-400 leading-relaxed mb-6 font-normal line-clamp-3">
                                    {article.summary}
                                </p>

                                {/* Footer Data */}
                                {article.source && (
                                    <div className="mt-auto flex items-center justify-between pt-5 border-t border-white/[0.04]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                                            <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase select-none">
                                                {article.source}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.article>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    </div>
  );
}
