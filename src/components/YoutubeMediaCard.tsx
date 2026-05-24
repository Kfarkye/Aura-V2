import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Clock, MonitorPlay, Activity } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================
export interface VideoItem {
    title: string;
    url: string;
    thumbnail: string;
    author: string;
    duration: string;
}

export interface YoutubeMediaCardProps {
    data: {
        videos: VideoItem[];
    };
}

// ============================================================================
// Utilities
// ============================================================================
function extractYoutubeId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

// ============================================================================
// Internal Component: Safe Image
// ============================================================================
const SafeThumbnail = React.memo(({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
        return <div className={`bg-[#050505] flex items-center justify-center ${className || ''}`} />;
    }

    return (
        <img 
            src={src} 
            alt={alt}
            className={`object-cover ${className || ''}`}
            onError={() => setHasError(true)}
            loading="lazy"
            decoding="async"
        />
    );
});
SafeThumbnail.displayName = 'SafeThumbnail';

// ============================================================================
// Primary Component
// ============================================================================
export function YoutubeMediaCard({ data }: YoutubeMediaCardProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const videos = data?.videos || [];
    const activeVideo = videos[activeIndex];

    const activeVideoId = useMemo(() => {
        if (!activeVideo?.url) return null;
        return extractYoutubeId(activeVideo.url);
    }, [activeVideo]);

    const embedUrl = useMemo(() => {
        if (!activeVideoId) return '';
        const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
        // Utilizes youtube-nocookie for privacy compliance and strips branding
        return `https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1${originUrl ? `&origin=${encodeURIComponent(originUrl)}` : ''}`;
    }, [activeVideoId]);

    const handlePlayRequest = useCallback(() => {
        setIsPlaying(true);
    }, []);

    const handleQueueSelect = useCallback((index: number) => {
        if (index === activeIndex) return;
        setActiveIndex(index);
        setIsPlaying(true); // Auto-play when explicitly selecting from queue
    }, [activeIndex]);

    if (videos.length === 0 || !activeVideo) return null;

    return (
        <div className="w-full relative z-10 mb-8 mt-4 font-sans text-left animate-in fade-in duration-700 ease-[0.16,1,0.3,1]">
            <div className="bg-[#050505] rounded-[24px] overflow-hidden border border-white/[0.04] shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
                
                {/* Structural Header */}
                <div className="px-6 py-4 border-b border-white/[0.04] bg-[#0A0A0A] flex items-center justify-between select-none">
                    <div className="flex items-center gap-2.5">
                        <MonitorPlay className="w-4 h-4 text-neutral-500" strokeWidth={1.5} />
                        <h4 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                            Media Intelligence
                        </h4>
                    </div>
                    {isPlaying ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-[4px] animate-in fade-in">
                            <Activity className="w-2.5 h-2.5 text-[#FF3B30]" />
                            <span className="text-[9px] font-mono font-bold text-[#FF3B30] uppercase tracking-widest">Streaming</span>
                        </div>
                    ) : (
                        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest tabular-nums lining-nums">
                            {videos.length} Item{videos.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* SOTA Performance Facade Player */}
                <div className="w-full aspect-[16/9] relative bg-[#000000] overflow-hidden group border-b border-white/[0.04]">
                    <AnimatePresence mode="wait">
                        {!isPlaying ? (
                            <motion.div 
                                key="facade"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 cursor-pointer"
                                onClick={handlePlayRequest}
                                role="button"
                                tabIndex={0}
                                aria-label={`Play video: ${activeVideo.title}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handlePlayRequest();
                                    }
                                }}
                            >
                                <SafeThumbnail 
                                    src={activeVideo.thumbnail} 
                                    alt={activeVideo.title}
                                    className="w-full h-full opacity-70 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-700 ease-[0.16,1,0.3,1] grayscale-[0.2] group-hover:grayscale-0 transform-gpu"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-90 pointer-events-none" />
                                
                                {/* Glassmorphic Play Button */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] group-hover:bg-white/10 group-hover:scale-105 transition-all duration-500 ease-[0.16,1,0.3,1] group-active:scale-95">
                                        <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-1.5 fill-white" strokeWidth={1} />
                                    </div>
                                </div>

                                {/* Facade Duration Badge */}
                                <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-[6px] border border-white/10 pointer-events-none">
                                    <span className="text-[11px] font-mono text-white/90 tracking-widest tabular-nums lining-nums font-medium">
                                        {activeVideo.duration}
                                    </span>
                                </div>
                            </motion.div>
                        ) : activeVideoId ? (
                            <motion.iframe 
                                key={`iframe-${activeVideoId}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0 w-full h-full"
                                src={embedUrl}
                                title={activeVideo.title}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                referrerPolicy="strict-origin-when-cross-origin"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-neutral-500 font-mono text-[11px] uppercase tracking-widest select-none">
                                Payload Unresolvable
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Active Video Metadata */}
                <div className="px-6 py-6 flex flex-col gap-3 bg-[#050505]">
                    <h3 className="text-[18px] sm:text-[20px] font-medium text-white/95 leading-[1.3] tracking-tight line-clamp-2">
                        {activeVideo.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-500 uppercase tracking-widest select-none">
                        <span className="text-neutral-300 font-semibold truncate">{activeVideo.author || 'Unknown Source'}</span>
                        <span className="text-neutral-700">•</span>
                        <div className="flex items-center gap-1.5 tabular-nums lining-nums">
                            <Clock className="w-3.5 h-3.5 opacity-70" />
                            <span>{activeVideo.duration || '--:--'}</span>
                        </div>
                    </div>
                </div>

                {/* Stateful Playlist Queue */}
                {videos.length > 1 && (
                    <div className="border-t border-white/[0.04] bg-[#0A0A0A]">
                        <div className="px-6 py-4 border-b border-white/[0.02]">
                            <h5 className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest select-none font-bold">
                                Playback Queue
                            </h5>
                        </div>
                        <div className="flex flex-col divide-y divide-white/[0.02] max-h-[320px] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {videos.map((video, idx) => {
                                const isActive = idx === activeIndex;
                                
                                return (
                                    <button 
                                        key={idx} 
                                        onClick={() => handleQueueSelect(idx)}
                                        className={`flex items-start sm:items-center gap-4 p-4 sm:px-6 transition-all duration-300 outline-none focus-visible:bg-white/[0.05] text-left group ${
                                            isActive 
                                                ? 'bg-white/[0.03]' 
                                                : 'bg-transparent hover:bg-white/[0.02]'
                                        }`}
                                        aria-label={`Play ${video.title}`}
                                    >
                                        {/* Queue Thumbnail */}
                                        <div className="w-[120px] sm:w-[140px] aspect-video bg-[#000000] rounded-[8px] overflow-hidden relative shrink-0 border border-white/[0.04]">
                                            <SafeThumbnail 
                                                src={video.thumbnail} 
                                                alt={video.title} 
                                                className={`w-full h-full transition-all duration-500 transform-gpu ${isActive ? 'opacity-100 grayscale-0' : 'opacity-60 grayscale-[0.5] group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105'}`} 
                                            />
                                            <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md text-white/90 text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] font-medium tabular-nums lining-nums border border-white/10 pointer-events-none">
                                                {video.duration}
                                            </div>
                                            {isActive && isPlaying && (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                                                    <span className="flex gap-1 items-end h-3">
                                                        <span className="w-0.5 h-full bg-[#34C759] animate-[bounce_1s_infinite] origin-bottom rounded-full" />
                                                        <span className="w-0.5 h-2/3 bg-[#34C759] animate-[bounce_1s_infinite_0.2s] origin-bottom rounded-full" />
                                                        <span className="w-0.5 h-full bg-[#34C759] animate-[bounce_1s_infinite_0.4s] origin-bottom rounded-full" />
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Queue Metadata */}
                                        <div className="flex flex-col gap-1.5 min-w-0 flex-1 py-1">
                                            <h4 className={`text-[13px] font-medium leading-snug line-clamp-2 transition-colors ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                                                {video.title}
                                            </h4>
                                            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest truncate">
                                                {video.author}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
