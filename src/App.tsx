import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import { Search, Send, ShieldCheck, Calendar as CalendarIcon, CloudFog, AlertCircle, Link as LinkIcon, ArrowLeft, Loader2 } from 'lucide-react';
import Markdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';

// Core Services & Types
import { AuraArtifact, AuraChatMessage, AuraHistoryMessage } from './types/aura';
import { initAuth, googleSignIn, logout } from './firebase';

// Component Ecosystem
import { SportsCalendar } from './components/SportsCalendar';
import { WinProbabilityChart } from './components/WinProbabilityChart';
import { PlayerPropProgress } from './components/PlayerPropProgress';
import { GameScheduleMock } from './components/GameScheduleMock';
import { MarkdownChart } from './components/MarkdownChart';
import { BettingAnglesCarousel } from './components/BettingAnglesCarousel';
import { EditorialCarousel } from './components/EditorialCarousel';
import { AnalyticalMasterclass } from './components/AnalyticalMasterclass';
import { YoutubeMediaCard } from './components/YoutubeMediaCard';
import { SEO } from './components/SEO';
import { WorkspaceOrchestrationBlueprint } from './components/WorkspaceOrchestrationBlueprint';
import { EmailMimeViewer } from './components/EmailMimeViewer';

// ============================================================================
// Core Interfaces
// ============================================================================
export interface FeedCard {
    id: string;
    slug?: string;
    type: string;
    priority: string;
    category?: string;
    headline: string;
    summary: string;
    image_url?: string;
    source?: string;
    publishedAt: number | string;
    metadata?: Record<string, any>;
    editorial_copy?: string;
    ai_analysis?: string;
    betting_angle?: string;
    factual_claims?: { claim: string; source_entity: string }[];
}

// ============================================================================
// Utilities
// ============================================================================
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Institutional Image Loader (Hardware Accelerated with Skeleton Pulse)
const SafeImage = React.memo(({ src, alt, containerClassName, imageClassName }: { src: string; alt: string; containerClassName?: string; imageClassName?: string }) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    if (status === 'error' || !src) {
        return <div className={`bg-white/[0.02] flex items-center justify-center ${containerClassName || ''}`} aria-hidden="true" />;
    }

    return (
        <div className={`relative overflow-hidden bg-[#0c0c0e] border border-white/[0.03] ${containerClassName || ''}`}>
            {status === 'loading' && (
                <div className="absolute inset-0 bg-[#0e0e11] overflow-hidden pointer-events-none z-10" aria-hidden="true">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
                </div>
            )}
            <img 
                src={src} 
                alt={alt}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transform-gpu will-change-[transform,opacity] transition-all duration-1000 ease-[0.16,1,0.3,1] ${status === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-105'} ${imageClassName || ''}`}
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
                loading="lazy"
                decoding="async"
            />
        </div>
    );
});
SafeImage.displayName = 'SafeImage';

function useFeedData() {
    const [feed, setFeed] = useState<FeedCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const fetchFeed = async () => {
            try {
                const response = await fetch('/api/feed', { signal: controller.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                // Protects against SPA returning index.html for 404 API routes
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new TypeError("Received non-JSON response from API.");
                }
                
                const data = await response.json();
                setFeed(data.cards || []);
            } catch (e: any) {
                if (e.name !== 'AbortError') {
                    console.error("[AURA:UI:NETWORK] Context sync failure:", e.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
        return () => controller.abort();
    }, []);

    return { feed, loading };
}

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
}

// ============================================================================
// Static Markdown Configuration
// ============================================================================
const CHAT_REMARK_PLUGINS = [remarkGfm];

const CHAT_MARKDOWN_COMPONENTS: Components = {
    p: ({node, ...props}) => <p className="mb-5 last:mb-0 text-white/80 leading-[1.65] font-normal tracking-[-0.01em]" {...props} />,
    h1: ({node, ...props}) => <h1 className="text-[20px] font-medium tracking-tight text-white/95 mt-8 mb-5" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-[17px] font-medium tracking-tight text-white/90 mt-6 mb-4" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-[12px] font-medium tracking-widest uppercase text-neutral-500 mt-6 mb-3 select-none" {...props} />,
    ul: ({node, ...props}) => <ul className="list-none space-y-3 mt-3 mb-6 text-neutral-400" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mt-3 mb-6 space-y-3 text-neutral-400 tabular-nums lining-nums marker:text-neutral-600" {...props} />,
    li: ({node, ...props}) => <li className="relative pl-5 before:absolute before:left-0 before:top-[0.6em] before:w-2 before:h-px before:bg-neutral-600" {...props} />,
    strong: ({node, ...props}) => <strong className="font-medium text-white/95" {...props} />,
    a: ({node, ...props}) => (
        <a 
            className="text-[#34C759] hover:text-[#32d74b] underline underline-offset-4 decoration-[#34C759]/30 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34C759]/30 rounded-[2px]" 
            target="_blank" 
            rel="noopener noreferrer" 
            {...props} 
        />
    ),
    table: ({node, ...props}) => <div className="w-full overflow-x-auto my-8 rounded-[16px] border border-white/[0.04] bg-white/[0.01]"><table className="w-full text-left border-collapse text-[13px] tabular-nums lining-nums" {...props} /></div>,
    thead: ({node, ...props}) => <thead className="bg-[#0a0a0a]/40 border-b border-white/[0.04]" {...props} />,
    th: ({node, ...props}) => <th className="px-5 py-3.5 font-medium text-neutral-500 uppercase tracking-widest text-[10px] whitespace-nowrap select-none" {...props} />,
    td: ({node, ...props}) => <td className="px-5 py-3.5 border-b border-white/[0.02] text-white/80" {...props} />,
    code: ({node, className, children, ...props}: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const lang = match?.[1];
        const content = String(children).replace(/\n$/, '');

        if (lang === 'chart') return <MarkdownChart data={content} />;
        if (lang === 'bettingangles') return <BettingAnglesCarousel data={content} />;
        if (lang === 'editorial') return <EditorialCarousel data={content} />;
        
        return <code className={`text-[#34C759] bg-[#34C759]/10 px-1.5 py-0.5 rounded-[4px] text-[13px] font-mono border border-[#34C759]/10 shadow-sm ${className || ''}`} {...props}>{children}</code>;
    },
    pre: ({node, children, ...props}: any) => {
        const hasCustomComponent = node?.children?.some((child: any) => 
            child.tagName === 'code' && 
            child.properties?.className?.some((cls: string) => 
                cls.includes('language-chart') || cls.includes('language-bettingangles') || cls.includes('language-editorial')
            )
        );
        if (hasCustomComponent) return <div className="my-8 w-full">{children}</div>;
        return <pre className="bg-[#0a0a0a]/80 backdrop-blur-3xl p-6 rounded-[24px] overflow-x-auto border border-white/[0.04] my-6 text-[13px] leading-[1.65] shadow-sm font-mono text-neutral-300 tabular-nums lining-nums" {...props}>{children}</pre>;
    }
};

// ============================================================================
// Layout Components
// ============================================================================
interface NavigationProps {
  user: any;
  loadingAuth: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const Navigation = React.memo(({ user, loadingAuth, onSignIn, onSignOut }: NavigationProps) => (
    <header className="px-6 py-4 flex items-center justify-between bg-[#000000]/65 backdrop-blur-[24px] saturate-[160%] top-0 z-50 sticky border-b border-white/[0.06] select-none">
        <Link 
            to="/" 
            className="flex flex-col items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-xl px-2 py-1 transition-all duration-300 active:scale-[0.95]"
            aria-label="Aura Home"
        >
            <span className="text-[19px] font-bold tracking-[-0.05em] text-white leading-none">AURA</span>
            <span className="text-[8px] font-mono tracking-[0.25em] text-[#34C759] uppercase mt-1 leading-none font-semibold">Enterprise Platform</span>
        </Link>
        
        <div className="flex items-center gap-4">
            {loadingAuth ? (
                <div className="h-8.5 w-24 rounded-full bg-white/[0.02] border border-white/[0.04] animate-pulse flex items-center justify-center text-[10px] text-neutral-500 font-mono tracking-widest uppercase">
                    Syncing
                </div>
            ) : user ? (
                <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] pl-3 pr-4 py-1.5 rounded-full hover:bg-white/[0.04] transition-all duration-300 backdrop-blur-md">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || "User"} referrerPolicy="no-referrer" className="h-[22px] w-[22px] rounded-full object-cover border border-white/10" />
                    ) : (
                        <div className="h-[22px] w-[22px] rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase select-none">
                            {user.email?.charAt(0) || 'A'}
                        </div>
                    )}
                    <div className="flex flex-col text-left">
                        <span className="text-[11px] font-medium text-white/95 leading-tight truncate max-w-[100px]" title={user.email}>
                            {user.displayName || user.email?.split('@')[0]}
                        </span>
                        <button onClick={onSignOut} className="text-[8px] font-mono text-neutral-400 hover:text-[#FF3B30] text-left leading-none transition-colors mt-0.5 uppercase tracking-widest outline-none cursor-pointer">
                            Disconnect
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={onSignIn}
                    className="h-8.5 px-4.5 rounded-full bg-white text-black font-semibold text-[11px] tracking-widest uppercase shadow-[0_2px_12px_rgba(255,255,255,0.08)] hover:bg-neutral-200 active:scale-[0.95] duration-300 ease-[0.16,1,0.3,1] transition-all cursor-pointer flex items-center gap-1.5"
                >
                    <svg className="w-3.5 h-3.5 fill-black" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    Connect
                </button>
            )}
        </div>
    </header>
));
Navigation.displayName = 'Navigation';

// ============================================================================
// Feed Ecosystem
// ============================================================================
const FeedItem = React.memo(({ item }: { item: FeedCard }) => {
    const destinationUrl = `/story/${item.slug || item.id}`;

    // Defensive parsing for dates
    const publishedDate = useMemo(() => {
        if (!item.publishedAt) return '';
        const d = new Date(item.publishedAt);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }, [item.publishedAt]);

    if (item.type === 'PREDICTION_MARKET') {
        const headlineStr = typeof item.headline === 'string' ? item.headline : '';
        const uniqueOptions = Array.from(new Set(headlineStr.split(',').map((w: string) => w.trim()).filter((w: string) => w.length > 0 && w.toLowerCase() !== 'yes' && w.toLowerCase() !== 'no')));
        
        return (
            <Link 
               to={destinationUrl}
               aria-label={`Prediction Market: ${item.headline}`}
               className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-[32px] outline-none mb-8"
            >
                <motion.div
                   whileHover={{ y: -4, scale: 1.008 }}
                   whileTap={{ scale: 0.975 }}
                   transition={{ type: "spring", stiffness: 350, damping: 25 }}
                   className="w-full relative group bg-white/[0.015] backdrop-blur-3xl border border-white/[0.04] rounded-[32px] overflow-hidden hover:bg-white/[0.035] hover:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.25)] p-7 sm:p-8 transition-colors duration-300 pointer-events-auto cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-[#34C759] uppercase tracking-widest select-none">Prediction Market</span>
                            {item.priority === 'breaking' && (
                                <div className="flex items-center gap-1.5 ml-2 bg-[#FF3B30]/10 px-2 py-0.5 rounded-[4px] border border-[#FF3B30]/20 select-none">
                                    <span className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full animate-pulse" />
                                    <span className="text-[9px] font-bold text-[#FF3B30] uppercase tracking-widest">Trending</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <h4 className="text-[20px] sm:text-[24px] font-medium text-white/95 leading-[1.3] mb-6 tracking-tight group-hover:text-white transition-colors duration-500">
                        {item.headline}
                    </h4>
                    
                    {uniqueOptions.length > 1 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                            {uniqueOptions.slice(0, 4).map((word: string, i: number) => (
                                <span key={i} className="text-[13px] font-medium text-neutral-400 bg-white/[0.03] px-3.5 py-1.5 rounded-[8px] border border-white/[0.05] select-none">
                                    {word}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-6 mt-2 border-t border-white/[0.04]">
                        <div className="flex flex-col">
                            <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-widest mb-1.5 select-none">Implied Yes</div>
                            <div className="text-[32px] font-medium text-white/95 tracking-tighter tabular-nums lining-nums leading-none">
                                {item.metadata?.yes_price || 0}<span className="text-[18px] text-neutral-600 ml-0.5 font-normal">%</span>
                            </div>
                        </div>
                        <span className="bg-white/10 group-hover:bg-white/20 text-white border border-white/10 text-[13px] font-medium px-6 py-2.5 rounded-full transition-all duration-300 ease-[0.16,1,0.3,1] select-none shadow-[0_2px_12px_rgba(255,255,255,0.05)]">
                             View Order Book
                        </span>
                    </div>
                </motion.div>
            </Link>
        );
    }

    return (
        <Link 
           to={destinationUrl}
           aria-label={`Story: ${item.headline}`}
           className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-[32px] outline-none mb-8"
        >
            <motion.div
               whileHover={{ y: -4, scale: 1.008 }}
               whileTap={{ scale: 0.975 }}
               transition={{ type: "spring", stiffness: 350, damping: 25 }}
               className="w-full relative group bg-white/[0.015] backdrop-blur-3xl border border-white/[0.04] rounded-[32px] overflow-hidden hover:bg-white/[0.035] hover:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.25)] transition-colors duration-300 cursor-pointer"
            >
                {item.image_url && (
                    <div className="w-full aspect-[21/9] sm:aspect-[16/9] relative bg-[#0a0a0a] border-b border-white/[0.02]">
                        <SafeImage 
                            src={item.image_url} 
                            alt={item.headline}
                            containerClassName="absolute inset-0 z-0"
                            imageClassName="opacity-80 group-hover:opacity-100 grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent opacity-90 z-10 pointer-events-none" />
                    </div>
                )}

                <div className={`flex flex-col p-7 sm:p-8 ${item.image_url ? '-mt-16 relative z-20' : ''}`}>
                   <div className="flex items-center gap-3 mb-5 select-none font-sans">
                       <span className={`text-[10px] font-medium uppercase tracking-widest ${item.image_url ? 'text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-[6px] border border-white/10 shadow-sm' : 'text-neutral-500'}`}>
                           {item.category || 'Intelligence'}
                       </span>
                       {item.priority === 'high_live' && (
                           <span className="text-[10px] font-bold text-[#FF3B30] uppercase tracking-widest flex items-center gap-1.5 bg-[#FF3B30]/10 px-2.5 py-1 rounded-[6px] border border-[#FF3B30]/20">
                               <span className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full animate-pulse" /> Live
                           </span>
                       )}
                   </div>
                   
                   <h4 className="text-[22px] sm:text-[26px] font-medium text-white/95 leading-[1.25] mb-3.5 tracking-tight group-hover:text-white transition-colors duration-300">
                       {item.headline}
                   </h4>
                   <p className="text-[15px] text-neutral-400 leading-[1.6] line-clamp-3 mb-6 font-normal">
                       {item.summary}
                   </p>

                   {/* Institutional Kalshi Injection */}
                   {item.metadata?.kalshi_market_injected && (
                       <div className="mt-2 mb-4 p-5 rounded-[20px] bg-white/[0.02] border border-white/[0.04] transition-colors relative overflow-hidden group-hover:bg-white/[0.035] font-sans">
                            <div className="flex items-center gap-2 mb-4 relative z-10 select-none">
                                <span className="text-[#34C759] text-[10px] font-medium uppercase tracking-widest inline-flex items-center gap-1.5 bg-[#34C759]/10 px-2 py-0.5 rounded-[4px] border border-[#34C759]/20">
                                    <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse shadow-sm" />
                                    Live Market
                                </span>
                                <span className="text-white/10 mx-1">•</span>
                                <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-widest">Prediction</span>
                            </div>
                            
                            <h4 className="text-[14px] font-medium text-white/90 leading-snug mb-5 tracking-tight pr-4 relative z-10 line-clamp-2">
                                {item.metadata.kalshi_title || 'Related Market Prediction'}
                            </h4>

                            <div className="flex items-center justify-between gap-3 relative z-10 select-none">
                                <div className="flex-1 bg-black/40 group-hover:bg-black/60 transition-colors duration-300 rounded-[12px] p-4 border border-white/[0.04] flex flex-col gap-1 cursor-pointer">
                                    <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest transition-colors">Yes</div>
                                    <div className="text-[18px] font-medium text-[#34C759] tabular-nums lining-nums leading-none mt-1.5">{item.metadata.kalshi_yes_price}%</div>
                                    {item.metadata.kalshi_american_odds && (
                                        <div className="text-[11px] font-mono text-[#34C759]/60 mt-1.5 tabular-nums lining-nums truncate">{item.metadata.kalshi_american_odds}</div>
                                    )}
                                </div>
                                <div className="flex-1 bg-black/40 group-hover:bg-black/60 transition-colors duration-300 rounded-[12px] p-4 border border-white/[0.04] flex flex-col gap-1 cursor-pointer">
                                    <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest transition-colors">No</div>
                                    <div className="text-[18px] font-medium text-white/80 tabular-nums lining-nums leading-none mt-1.5">{100 - (item.metadata.kalshi_yes_price || 0)}%</div>
                                </div>
                            </div>
                       </div>
                   )}

                   <div className="mt-4 flex items-center justify-between pt-5 border-t border-white/[0.04] font-sans">
                       <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 uppercase tracking-widest select-none tabular-nums">
                           <span>{item.source || 'Aura Protocol'}</span>
                           {publishedDate && (
                               <>
                                   <span className="text-neutral-700">•</span>
                                   <time dateTime={new Date(item.publishedAt).toISOString()}>{publishedDate}</time>
                               </>
                           )}
                       </div>
                   </div>
                </div>
            </motion.div>
        </Link>
    );
});
FeedItem.displayName = 'FeedItem';

function FeedSkeleton() {
    return (
        <div className="w-full relative bg-white/[0.01] border border-white/[0.02] rounded-[32px] overflow-hidden mb-8">
            <div className="w-full aspect-[21/9] sm:aspect-[16/9] bg-white/[0.02] animate-pulse border-b border-white/[0.02]" />
            <div className="p-7 sm:p-8 -mt-16 relative z-10">
                <div className="h-5 w-24 bg-white/[0.03] rounded-md mb-6 animate-pulse" />
                <div className="h-7 w-3/4 bg-white/[0.03] rounded-lg mb-4 animate-pulse" />
                <div className="h-5 w-full bg-white/[0.02] rounded-md mb-3 animate-pulse" />
                <div className="h-5 w-5/6 bg-white/[0.02] rounded-md animate-pulse" />
            </div>
        </div>
    );
}

function HomeFeed() {
  const { feed, loading } = useFeedData();

  if (loading) {
     return (
       <div className="w-full max-w-2xl px-4 flex flex-col mt-4" aria-busy="true" aria-label="Loading feed">
        <FeedSkeleton />
        <FeedSkeleton />
       </div>
     );
  }

  if (feed.length === 0) {
      return (
         <div className="text-neutral-500 text-[13px] font-medium tracking-wide mt-12 text-center bg-white/[0.015] border border-white/[0.04] p-10 rounded-[32px] border-dashed select-none">
             Intelligence feed synchronizing...
         </div>
      );
  }

  return (
      <div className="w-full max-w-2xl flex flex-col mx-auto mt-4 px-2">
         {feed.map((item) => (
             <FeedItem key={item.id} item={item} />
         ))}
      </div>
  );
}

// ============================================================================
// Core Chat Interface
// ============================================================================
interface ChatInterfaceProps {
  user: any;
  token: string | null;
  onSignIn: () => void;
  loadingAuth: boolean;
}

function ChatInterface({ user, token, onSignIn, loadingAuth }: ChatInterfaceProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AuraChatMessage[]>([]);
  const [activeSubdomain, setActiveSubdomain] = useState<'sports' | 'workspace'>('sports');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      // Small timeout ensures DOM layout is computed before scrolling
      const timer = setTimeout(() => {
          endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
  }, [messages, loading]);

  const handleQuery = async (e?: React.FormEvent, presetPrompt?: string) => {
    if (e) e.preventDefault();
    const activePrompt = presetPrompt || prompt;
    if (!activePrompt.trim() || loading) return;
    
    const history: AuraHistoryMessage[] = messages.reduce<AuraHistoryMessage[]>((acc, m) => {
       if (m.role === 'user' && m.content) acc.push({ role: 'user', content: m.content });
       else if (m.role === 'model' && m.artifacts) {
           const sysMsg = m.artifacts.find(a => a.type === 'SYSTEM_MESSAGE')?.context_summary;
           if (sysMsg) acc.push({ role: 'model', content: sysMsg });
       }
       return acc;
    }, []);

    setMessages(prev => [...prev, { id: generateId('usr'), role: 'user', content: activePrompt }]);
    setLoading(true);
    setPrompt('');

    if (activePrompt.toLowerCase().trim() === 'schedule' || activePrompt.toLowerCase().trim() === 'mock') {
         setTimeout(() => {
            setMessages(prev => [
                ...prev,
                { id: generateId('mod'), role: 'model', artifacts: [{ id: generateId('sch'), type: 'GAME_SCHEDULE_ARTIFACT', resolution_state: 'CONVERSATIONAL' }] }
            ]);
            setLoading(false);
         }, 1000);
         return;
    }
    
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({ message: activePrompt, history })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (data.artifacts) {
            setMessages(prev => [...prev, { id: generateId('mod'), role: 'model', artifacts: data.artifacts }]);
        } else {
             throw new Error("No artifacts returned");
        }
    } catch(e) {
        setMessages(prev => [...prev, {
            id: generateId('err'), role: 'model',
            artifacts: [{ id: generateId('err_art'), type: 'SYSTEM_MESSAGE', resolution_state: 'GROUNDING_FAULT', context_summary: "Engine parsing sequence interrupted. Please try again." }]
        }]);
    } finally {
        setLoading(false);
    }
  }

  const renderArtifact = useCallback((artifact: AuraArtifact) => {
      switch (artifact.resolution_state) {
          case 'GROUNDING_FAULT':
              return (
                 <div key={artifact.id} className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-[20px] p-6 mb-5 text-center backdrop-blur-md">
                     <AlertCircle className="h-6 w-6 text-[#FF3B30] mx-auto mb-3" strokeWidth={1.5} />
                     <div className="text-[10px] font-bold tracking-widest uppercase text-[#FF3B30] select-none">Execution Fault</div>
                     <div className="text-[13px] text-[#FF3B30]/80 mt-2 leading-relaxed font-mono">{artifact.context_summary}</div>
                 </div>
              );
          case 'NO_GAMES_SCHEDULED':
          case 'OFF_SEASON':
               return (
                 <div key={artifact.id} className="bg-white/[0.01] border border-white/[0.04] border-dashed rounded-[24px] p-10 mb-5 text-center backdrop-blur-sm">
                     {artifact.resolution_state === 'NO_GAMES_SCHEDULED' ? <CalendarIcon className="h-6 w-6 text-neutral-600 mx-auto mb-3" strokeWidth={1.5} /> : <CloudFog className="h-6 w-6 text-neutral-600 mx-auto mb-3" strokeWidth={1.5} />}
                     <div className="text-[10px] font-medium text-neutral-500 tracking-widest uppercase select-none">{artifact.resolution_state === 'OFF_SEASON' ? 'Off-Season' : 'No Events Found'}</div>
                     <div className="text-[13px] text-neutral-400 mt-2 font-mono">{artifact.context_summary}</div>
                 </div>
              );
      }

      if (artifact.type === 'GAME_SCHEDULE_ARTIFACT') return <GameScheduleMock key={artifact.id} />;
      if (artifact.type === 'EMAIL_MIME_ARTIFACT' as any) return <EmailMimeViewer key={artifact.id} data={artifact.data} />;
      if (artifact.type === 'WIN_PROBABILITY_ARTIFACT') return <WinProbabilityChart key={artifact.id} data={artifact.data} />;
      if (artifact.type === 'PLAYER_PROP_ARTIFACT') return <PlayerPropProgress key={artifact.id} data={artifact.data} />;
      if (artifact.type === 'BETTING_ANALYSIS' as any) return <AnalyticalMasterclass key={artifact.id} data={artifact.data} />;
      if (artifact.type === 'YOUTUBE_MEDIA' as any) return <YoutubeMediaCard key={artifact.id} data={artifact.data} />;

      if ((artifact.type === 'SPORTS_ARTIFACT' || artifact.type === 'WAGERING_ARTIFACT') && artifact.resolution_state === 'LIVE_DATA') {
          const d = artifact.data;
          const gamesArr = Array.isArray(d) ? d : (d?.events || [d]);
          return <SportsCalendar key={artifact.id} games={gamesArr} leagueContext={d?.league_context} />;
      }

      if (artifact.type === 'TRUST_GATE_RECEIPT' && artifact.resolution_state === 'DEPLOYED') {
           return (
              <div key={artifact.id} className="bg-white/[0.02] border border-white/[0.04] rounded-[16px] p-6 mb-5 font-mono text-[11px] text-neutral-400 tabular-nums select-none">
                  <div className="flex justify-between items-center mb-5 text-neutral-300 border-b border-white/[0.04] pb-3">
                      <span className="flex items-center gap-2 uppercase tracking-widest font-sans font-medium"><ShieldCheck className="h-4 w-4" /> System Receipt</span>
                      {artifact.data?.verified && <span className="bg-white/10 px-2 py-0.5 rounded-sm text-white">VERIFIED</span>}
                  </div>
                  <div className="space-y-4 mt-2">
                      <div className="flex justify-between items-center"><span>Status</span><span className="text-white">{artifact.data?.status || 'Active'}</span></div>
                      <div className="flex justify-between items-center"><span>Arch</span><span>Cloud Run</span></div>
                      <div className="flex justify-between items-center"><span>Endpoint</span><span className="truncate max-w-[150px]">{artifact.data?.url || 'Internal'}</span></div>
                  </div>
              </div>
          );
      }

      if ((artifact.type === 'SYSTEM_MESSAGE' || artifact.type === 'WORK_ARTIFACT') && (artifact.resolution_state === 'CONVERSATIONAL' || artifact.resolution_state === 'LIVE_DATA')) {
          return (
              <div key={artifact.id} className="bg-transparent mb-6 flex flex-col w-full text-left font-sans" aria-live="polite">
                  <div className="text-[16px] text-white/90 leading-[1.65] font-sans antialiased font-normal max-w-none">
                      <Markdown remarkPlugins={CHAT_REMARK_PLUGINS} components={CHAT_MARKDOWN_COMPONENTS}>
                         {artifact.context_summary || ''}
                      </Markdown>
                  </div>
                  {artifact.data?.groundingLinks && artifact.data.groundingLinks.length > 0 && (
                     <div className="flex flex-col gap-3 mt-6 pt-5 border-t border-white/[0.04]">
                         <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest pl-1 select-none">Sources Verified</div>
                         <div className="flex flex-wrap gap-2.5">
                             {artifact.data.groundingLinks.map((link: { uri: string; title: string; }, idx: number) => (
                                 <a 
                                    key={idx} 
                                    href={link.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.02] hover:bg-white/[0.04] text-neutral-400 hover:text-neutral-200 border border-white/[0.04] hover:border-white/[0.08] rounded-full text-[11px] font-mono tracking-wide transition-all duration-300 ease-[0.16,1,0.3,1] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 active:scale-[0.98]"
                                >
                                     <LinkIcon className="h-3 w-3 opacity-50" />
                                     <span className="truncate max-w-[200px]">{link.title || 'Source'}</span>
                                 </a>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
          );
      }

      return (
           <div key={artifact.id} className="bg-white/[0.02] p-5 rounded-[20px] mb-5 border border-white/[0.04] text-[14px] text-neutral-300 font-normal leading-relaxed">
               {artifact.context_summary}
           </div>
      );
  }, []);

  return (
    <>
      <SEO title="Aura | Sports Intelligence Engine" canonicalPath="/" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full flex flex-col pt-6 pb-[180px] sm:pb-[200px] relative z-10 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full mt-0 w-full animate-in fade-in duration-1000 ease-[0.16,1,0.3,1]">
                  
                  {/* Subdomain Explorer Toggle */}
                  <div className="flex bg-[#151517]/60 backdrop-blur-3xl border border-white/[0.04] p-1.5 rounded-[20px] max-w-md w-full mb-8 select-none shadow-xl relative z-10">
                      <button 
                         type="button"
                         onClick={() => setActiveSubdomain('sports')}
                         className={`flex-1 py-2.5 px-4 rounded-[14px] text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ease-[0.16,1,0.3,1] cursor-pointer ${activeSubdomain === 'sports' ? 'bg-[#34C759] text-black shadow-[0_2px_12px_rgba(52,199,89,0.3)] font-extrabold' : 'text-neutral-400 hover:text-white hover:bg-white/[0.01]'}`}
                      >
                         Sports Market Hub
                      </button>
                      <button 
                         type="button"
                         onClick={() => setActiveSubdomain('workspace')}
                         className={`flex-1 py-2.5 px-4 rounded-[14px] text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ease-[0.16,1,0.3,1] cursor-pointer ${activeSubdomain === 'workspace' ? 'bg-[#34C759] text-black shadow-[0_2px_12px_rgba(52,199,89,0.3)] font-extrabold' : 'text-neutral-400 hover:text-white hover:bg-white/[0.01]'}`}
                      >
                         Workspace Blueprint
                      </button>
                  </div>

                  {activeSubdomain === 'sports' ? (
                      <>
                          <div className="w-full max-w-3xl mb-8">
                              <GameScheduleMock />
                          </div>
                          <HomeFeed />
                      </>
                  ) : (
                      <div className="w-full">
                          <WorkspaceOrchestrationBlueprint user={user} token={token} onSignIn={onSignIn} />
                      </div>
                  )}
              </div>
          )}

          {messages.length > 0 && (
              <div className="flex flex-col gap-8" aria-live="polite">
                 <AnimatePresence initial={false}>
                     {messages.map((msg, idx) => (
                         <motion.div 
                             initial={{ opacity: 0, y: 10, scale: 0.98 }}
                             animate={{ opacity: 1, y: 0, scale: 1 }}
                             transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                             key={msg.id} 
                             className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                         >
                             {msg.role === 'user' ? (
                                 <div className="bg-white/[0.06] border border-white/[0.02] text-white/95 px-5 py-3.5 rounded-[24px] max-w-[85%] rounded-br-[4px] text-[16px] font-normal leading-relaxed tracking-[-0.01em] shadow-sm backdrop-blur-md">
                                     {msg.content}
                                 </div>
                             ) : (
                                 <div className="w-full flex flex-col items-start max-w-full">
                                     {msg.artifacts?.map(renderArtifact)}
                                     
                                     {(idx === messages.length - 1 && !loading) && msg.artifacts?.some(a => a.type === 'SPORTS_ARTIFACT') && (
                                         <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="w-full max-w-full overflow-hidden mt-5 relative select-none"
                                         >
                                            <div className="flex overflow-x-auto gap-2.5 pb-2.5 pt-1 -mx-4 px-4 snap-x hide-scrollbars scroll-smooth w-full">
                                                {["Next Game?", "Season Progress?", "Standings?"].map(q => (
                                                    <motion.button 
                                                        key={q}
                                                        type="button"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.96 }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                        onClick={() => handleQuery(undefined, q)} 
                                                        className="snap-start shrink-0 px-5.5 h-11 flex items-center justify-center text-[11px] font-semibold tracking-widest uppercase text-neutral-300 hover:text-white bg-white/[0.03] active:bg-white/[0.08] rounded-full border border-white/[0.06] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/30 whitespace-nowrap cursor-pointer shadow-sm"
                                                    >
                                                        {q}
                                                    </motion.button>
                                                ))}
                                            </div>
                                         </motion.div>
                                     )}
                                 </div>
                             )}
                         </motion.div>
                     ))}
                 </AnimatePresence>
                 <div ref={endRef} className="h-4 w-full" />
              </div>
          )}
          
          {loading && (
              <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="flex items-center justify-center mt-8 mb-4 gap-3 text-neutral-500 text-[10px] font-mono tracking-widest uppercase select-none"
                 aria-live="polite"
                 aria-busy="true"
              >
                 <span className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </span>
                 <span>Synthesizing</span>
              </motion.div>
          )}
      </main>

      {/* Input Form with iOS Safe Area padding */}
      <div className="fixed bottom-0 w-full p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom,24px)+16px)] sm:pb-10 bg-gradient-to-t from-[#000000] via-[#000000]/95 to-transparent pointer-events-none z-50">
         <form onSubmit={handleQuery} className="max-w-xl mx-auto relative flex items-center bg-[#151517]/80 backdrop-blur-[40px] rounded-[32px] border border-white/[0.06] shadow-[0_-12px_40px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 focus-within:border-white/[0.15] focus-within:bg-[#1a1a1c]/90 focus-within:shadow-[0_-20px_60px_rgba(0,0,0,0.9)] pointer-events-auto supports-[backdrop-filter]:bg-[#151517]/60 transform-gpu">
            <label htmlFor="chat-input" className="sr-only">Query analysis or data</label>
            <div className="pl-6 pr-2 text-neutral-500" aria-hidden="true">
                <Search className="h-[18px] w-[18px]" strokeWidth={2} />
            </div>
            <input
              id="chat-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Query analysis or data..."
              className="flex-1 bg-transparent border-none outline-none py-4 text-[16px] text-white/95 placeholder:text-neutral-500 font-normal tracking-[-0.01em] disabled:opacity-50 disabled:cursor-not-allowed appearance-none animate-none"
              disabled={loading}
              autoComplete="off"
            />
            <div className="pr-2 pl-1">
                <button 
                  disabled={loading || !prompt.trim()}
                  type="submit" 
                  className={`bg-white text-black p-2.5 w-10 h-10 rounded-full transition-all duration-300 ease-[0.16,1,0.3,1] flex items-center justify-center cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 shadow-[0_2px_8px_rgba(255,255,255,0.1)] ${loading ? 'opacity-50 scale-95 animate-pulse' : 'hover:bg-neutral-200 active:scale-[0.92] disabled:opacity-0 disabled:scale-75'}`}
                  aria-label="Submit Query"
                >
                    <Send className="h-[16px] w-[16px] translate-x-[-0.5px] translate-y-[-0.5px]" strokeWidth={2.5} />
                </button>
            </div>
         </form>
      </div>
    </>
  );
}

// ============================================================================
// Canonical Pages
// ============================================================================
function CanonicalEntityPage() {
    const { id } = useParams<{ id: string }>();
    const { feed, loading } = useFeedData();
    const story = useMemo(() => feed.find(c => c.id === id || c.slug === id), [feed, id]);

    // Format defensive dates
    const validDate = useMemo(() => {
        if (!story?.publishedAt) return '';
        const d = new Date(story.publishedAt);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }, [story?.publishedAt]);

    if (loading) return <div className="p-16 text-center text-neutral-500 text-[11px] font-mono tracking-widest uppercase animate-pulse select-none mt-20">Resolving Context...</div>;
    if (!story) return <div className="p-16 text-center text-neutral-500 text-[14px] mt-20">Context not found or expired.</div>;

    return (
        <article className="max-w-3xl mx-auto w-full p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-[0.16,1,0.3,1] pt-10 pb-40 text-left">
            <SEO title={`${story.headline} | Aura`} canonicalPath={`/story/${story.slug || story.id}`} />
            
            <Link to="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-all duration-300 ease-[0.16,1,0.3,1] active:scale-[0.98] mb-10 text-[11px] font-mono uppercase tracking-widest rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 px-1 py-0.5 -ml-1">
               <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Return to Feed
            </Link>

            <header className="flex flex-wrap gap-3 items-center mb-6 select-none font-sans">
                 {story.priority === 'high_live' && (
                    <div className="inline-flex items-center gap-1.5 bg-[#FF3B30]/10 px-2 py-0.5 rounded-[4px] border border-[#FF3B30]/20 font-sans">
                       <span className="h-1.5 w-1.5 rounded-full bg-[#FF3B30] animate-pulse" />
                       <span className="text-[10px] font-bold text-[#FF3B30] uppercase tracking-widest font-sans">Live</span>
                    </div>
                 )}
                <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">{story.category || 'Intelligence'}</span>
                {validDate && (
                    <>
                        <span className="text-neutral-700 mx-1">•</span>
                        <time dateTime={new Date(story.publishedAt).toISOString()} className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest tabular-nums">
                            {validDate}
                        </time>
                    </>
                )}
            </header>

            <h1 className="text-[32px] sm:text-[40px] font-medium tracking-[-0.02em] text-white/95 leading-[1.15] mb-8">
                {story.headline}
            </h1>

            {story.image_url && (
                <figure className="w-full aspect-[21/9] sm:aspect-[16/9] rounded-[24px] overflow-hidden mb-12 bg-white/[0.02] border border-white/[0.04] relative">
                    <SafeImage 
                        src={story.image_url} 
                        alt={story.headline} 
                        containerClassName="absolute inset-0"
                        imageClassName="opacity-90 grayscale-[0.1]" 
                    />
                </figure>
            )}

            <div className="max-w-[640px] mx-auto text-white/80 text-[17px] sm:text-[19px] font-serif font-normal leading-[1.8] space-y-7">
                {story.type === 'PREDICTION_MARKET' ? (
                    <div className="bg-white/[0.02] rounded-[24px] p-8 sm:p-10 my-8 text-center border border-white/[0.04] backdrop-blur-md">
                        <div className="inline-flex items-center gap-2 text-[#34C759] text-[10px] font-medium uppercase tracking-widest mb-8 select-none font-sans">
                            <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse shadow-[0_0_8px_rgba(52,199,89,0.8)]" />
                            Live Kalshi Market
                        </div>
                        <h2 className="text-[24px] font-sans font-medium text-white/95 leading-tight mb-10 tracking-tight">
                            {story.headline}
                        </h2>
                        <div className="flex justify-center items-center gap-12 mb-10 select-none font-sans">
                            <div className="text-center">
                                <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-widest mb-3">Implied Yes</div>
                                <div className="text-[48px] font-sans font-medium text-white/95 tabular-nums lining-nums leading-none tracking-tighter">
                                    {story.metadata?.yes_price || 50}<span className="text-[24px] text-neutral-600 font-normal">%</span>
                                </div>
                            </div>
                            <div className="w-[1px] h-20 bg-white/[0.04]" />
                            <div className="text-center">
                                <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-widest mb-3">Implied No</div>
                                <div className="text-[48px] font-sans font-medium text-neutral-400 tabular-nums lining-nums leading-none tracking-tighter">
                                    {story.metadata?.no_price || 100 - (story.metadata?.yes_price || 50)}<span className="text-[24px] text-neutral-600 font-normal">%</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 font-sans">
                            <button className="bg-white/10 hover:bg-white/20 text-white border border-white/10 min-w-[160px] text-[15px] font-medium py-3.5 rounded-full transition-all duration-300 ease-[0.16,1,0.3,1] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">Execute Yes</button>
                            <button className="bg-transparent hover:bg-white/[0.04] text-neutral-300 border border-white/[0.08] min-w-[160px] text-[15px] font-medium py-3.5 rounded-full transition-all duration-300 ease-[0.16,1,0.3,1] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">Execute No</button>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-invert max-w-none prose-p:font-serif">
                        <Markdown
                            remarkPlugins={CHAT_REMARK_PLUGINS}
                            components={{
                                ...CHAT_MARKDOWN_COMPONENTS,
                                p: ({node, ...props}) => <p className="mb-6 last:mb-0 text-neutral-300 font-serif" {...props} />,
                            }}
                        >
                            {story.editorial_copy || story.ai_analysis || story.summary}
                        </Markdown>
                    </div>
                )}
                 
                 {(story.betting_angle || story.metadata?.kalshi_market_injected) && (
                     <aside className="bg-white/[0.02] rounded-[24px] p-6 sm:p-8 my-12 relative border border-white/[0.04] font-sans">
                        <div className="flex items-center gap-3 mb-6 select-none animate-none">
                            {story.metadata?.kalshi_market_injected ? (
                                <span className="text-[#34C759] text-[10px] font-medium uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse shadow-[0_0_8px_rgba(52,199,89,0.8)]" />
                                    Order Book Read
                                </span>
                            ) : (
                                <span className="text-neutral-400 text-[10px] font-medium uppercase tracking-widest flex items-center gap-2">
                                    Identified Value
                                </span>
                            )}
                        </div>
                        
                        {story.metadata?.kalshi_market_injected ? (
                            <div className="flex flex-col gap-6">
                                <div>
                                    <h3 className="text-[17px] font-medium text-white/95 leading-[1.3] mb-2 tracking-tight">
                                        {story.metadata.kalshi_title}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-6 bg-[#0a0a0a]/40 rounded-[16px] p-5 border border-white/[0.04] select-none">
                                    <div className="flex-1 w-full flex flex-col">
                                        <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-3 tabular-nums lining-nums uppercase tracking-widest">
                                            <span className="text-[#34C759]">Yes {story.metadata.kalshi_yes_price}%</span>
                                            <span className="text-neutral-600">No {100 - (story.metadata.kalshi_yes_price || 0)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden relative" role="progressbar" aria-valuenow={story.metadata.kalshi_yes_price} aria-valuemin={0} aria-valuemax={100}>
                                            <div 
                                                className="absolute top-0 left-0 h-full bg-[#34C759] rounded-full shadow-[0_0_12px_rgba(52,199,89,0.4)] transition-all duration-1000 ease-[0.16,1,0.3,1]"
                                                style={{ width: `${story.metadata.kalshi_yes_price}%` }}
                                            />
                                        </div>
                                        {story.metadata.kalshi_american_odds && (
                                            <div className="text-[10px] font-mono text-[#34C759]/80 mt-4 tabular-nums lining-nums text-center">
                                                Moneyline: {story.metadata.kalshi_american_odds}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-neutral-300 text-[15px] font-normal leading-relaxed">
                                {story.betting_angle}
                            </p>
                        )}
                     </aside>
                 )}

                 {story.factual_claims && story.factual_claims.length > 0 && (
                     <footer className="text-[10px] font-mono text-neutral-600 pt-8 mt-12 border-t border-white/[0.04] uppercase tracking-widest leading-relaxed select-none">
                         <span className="text-neutral-500">Cross-referenced via: </span> {Array.from(new Set(story.factual_claims.map((c: any) => c.source_entity))).join(', ')}
                     </footer>
                 )}
            </div>

            <footer className="mt-16 pt-8 border-t border-white/[0.04] flex items-center justify-between max-w-[640px] mx-auto select-none">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-[10px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-neutral-500 font-mono text-[14px]">A</div>
                    <div>
                        <div className="text-[12px] font-medium text-neutral-300 tracking-wide">Aura Intelligence</div>
                        <div className="text-[10px] text-neutral-600 font-mono mt-1 uppercase tracking-widest">
                            Verified Context
                        </div>
                    </div>
                </div>
            </footer>
        </article>
    );
}

// ============================================================================
// Stubs for remaining routes
// ============================================================================
function CategoryHubPage() {
    const { category } = useParams<{ category: string }>();
    const { feed, loading } = useFeedData();
    const filteredFeed = useMemo(() => {
        if (!category) return [];
        const decoded = decodeURIComponent(category).toLowerCase();
        return feed.filter(c => c.category?.toLowerCase() === decoded);
    }, [feed, category]);

    const displayCategory = category ? decodeURIComponent(category).charAt(0).toUpperCase() + decodeURIComponent(category).slice(1) : "Hub";

    return (
        <div className="max-w-3xl mx-auto w-full p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[0.16,1,0.3,1] pt-10 pb-40 text-left">
           <Link to="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-all duration-300 ease-[0.16,1,0.3,1] active:scale-[0.98] mb-10 text-[11px] font-mono uppercase tracking-widest rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 px-1 py-0.5 -ml-1">
               <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Dashboard
           </Link>
           <h1 className="text-[26px] font-medium tracking-tight mb-10 text-white/95">Latest in {displayCategory}</h1>
           
           {loading ? (
               <div className="space-y-6 animate-pulse" aria-busy="true">
                   {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/[0.02] rounded-[24px] border border-white/[0.04]" />)}
               </div>
           ) : filteredFeed.length === 0 ? (
               <div className="text-neutral-500 font-mono text-[11px] uppercase tracking-widest text-center bg-white/[0.015] border border-white/[0.04] rounded-[24px] p-10 border-dashed select-none">
                   No intelligence available in this sector.
               </div>
           ) : (
               <div className="space-y-6">
                   {filteredFeed.map(story => (
                       <Link key={story.id} to={`/story/${story.slug || story.id}`} className="block border border-white/[0.04] bg-white/[0.01] p-6 sm:p-8 rounded-[24px] hover:bg-white/[0.03] transition-all duration-500 ease-[0.16,1,0.3,1] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 font-sans">
                           <h2 className="text-[18px] font-medium text-neutral-100 mb-3 tracking-tight">{story.headline}</h2>
                           <p className="text-[14px] text-neutral-400 line-clamp-2 leading-[1.65]">{story.summary}</p>
                           <time dateTime={new Date(story.publishedAt).toISOString()} className="mt-6 block text-[10px] font-mono text-neutral-500 uppercase tracking-widest tabular-nums lining-nums">
                                {new Date(story.publishedAt).toLocaleDateString()}
                           </time>
                       </Link>
                   ))}
               </div>
           )}
        </div>
    );
}

function TeamCanonicalPage() {
    const { slug } = useParams<{ slug: string }>();
    return (
        <div className="max-w-3xl mx-auto w-full p-6 sm:p-8 pt-10 animate-in fade-in text-left">
            <SEO title={`${(slug || '').toUpperCase()} | Team Data`} canonicalPath={`/team/${slug}`} />
            <Link to="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-all duration-300 ease-[0.16,1,0.3,1] active:scale-[0.98] mb-8 text-[11px] font-mono uppercase tracking-widest rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 px-1 py-0.5 -ml-1">
               <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Dashboard
            </Link>
            <h1 className="text-[28px] font-medium text-white/95 mb-8 capitalize tracking-tight">{slug?.replace(/-/g, ' ')}</h1>
            <div className="bg-white/[0.015] border border-white/[0.04] p-10 rounded-[24px] text-neutral-500 text-center text-[11px] font-mono uppercase tracking-widest border-dashed select-none">Team context synchronization pending...</div>
        </div>
    );
}

// ============================================================================
// Main Application Wrapper
// ============================================================================
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setLoadingAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setLoadingAuth(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err) {
      console.error("Sign in failed:", err);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    setLoadingAuth(true);
    try {
      await logout();
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setLoadingAuth(false);
    }
  };

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-[#000000] text-neutral-200 flex flex-col font-sans selection:bg-white/15 selection:text-white">
          <Navigation user={user} loadingAuth={loadingAuth} onSignIn={handleSignIn} onSignOut={handleSignOut} />
          <Routes>
              <Route path="/" element={<ChatInterface user={user} token={token} onSignIn={handleSignIn} loadingAuth={loadingAuth} />} />
              <Route path="/story/:id" element={<CanonicalEntityPage />} />
              <Route path="/team/:slug" element={<TeamCanonicalPage />} />
              <Route path="/category/:category" element={<CategoryHubPage />} />
          </Routes>
      </div>
    </BrowserRouter>
  );
}
