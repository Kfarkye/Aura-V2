import React from 'react';
import { Clock } from 'lucide-react';

interface YoutubeMediaCardProps {
    data: {
        videos: Array<{
            title: string;
            url: string;
            thumbnail: string;
            author: string;
            duration: string;
        }>;
    };
}

export function YoutubeMediaCard({ data }: YoutubeMediaCardProps) {
    if (!data.videos || data.videos.length === 0) return null;

    const mainVideo = data.videos[0];

    const videoId = mainVideo.url.match(/[?&]v=([^&]+)/)?.[1];
    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const embedUrl = videoId 
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1${originUrl ? `&origin=${encodeURIComponent(originUrl)}` : ''}` 
        : '';

    return (
        <div className="w-full relative z-10 mb-8 mt-2 p-1">
            <div className="bg-[#1c1c1e]/60 backdrop-blur-3xl rounded-[32px] overflow-hidden border border-white/[0.04] shadow-[0_12px_40px_rgb(0,0,0,0.12)]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#FF0000]/10 flex items-center justify-center">
                            <span className="w-2.5 h-2.5 bg-[#FF0000] rounded-[2px]" />
                        </div>
                        <h4 className="text-[17px] font-medium text-white tracking-tight">Media Player</h4>
                    </div>
                </div>

                {/* Main Player */}
                <div className="w-full aspect-[16/9] relative bg-black">
                     {embedUrl ? (
                         <iframe 
                             width="100%" 
                             height="100%" 
                             src={embedUrl}
                             title={mainVideo.title}
                             frameBorder="0" 
                             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                             allowFullScreen
                             referrerPolicy="strict-origin-when-cross-origin"
                             className="w-full h-full"
                         ></iframe>
                     ) : (
                         <div className="w-full h-full flex items-center justify-center text-white/50">
                             Video format not supported
                         </div>
                     )}
                </div>

                {/* Details Footer */}
                <div className="px-8 py-6 flex flex-col gap-2">
                    <h3 className="text-[20px] font-medium text-white leading-snug tracking-[-0.01em] line-clamp-2">
                        {mainVideo.title}
                    </h3>
                    <div className="flex items-center gap-4 text-[14px] text-white/50 tracking-wide mt-1">
                        <span className="font-medium text-white/70">{mainVideo.author}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{mainVideo.duration}</span>
                        </div>
                    </div>
                </div>

                {/* Up Next List if multiple videos */}
                {data.videos.length > 1 && (
                    <div className="border-t border-white/[0.02] bg-white/[0.01] px-8 py-6">
                        <h5 className="text-[13px] font-medium text-white/40 uppercase tracking-widest mb-4">Up Next</h5>
                        <div className="flex flex-col gap-4">
                            {data.videos.slice(1).map((video, idx) => (
                                <a key={idx} href={video.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group cursor-pointer hover:bg-white/[0.02] p-2 -mx-2 rounded-xl transition-colors">
                                    <div className="w-32 aspect-video bg-black rounded-lg overflow-hidden relative shrink-0">
                                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur text-white text-[10px] px-1.5 rounded-sm font-medium">
                                            {video.duration}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <h4 className="text-[14px] font-medium text-white/90 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                                            {video.title}
                                        </h4>
                                        <span className="text-[12px] text-white/50">{video.author}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
