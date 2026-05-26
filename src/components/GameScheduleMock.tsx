import React, { useState, useEffect, useRef, useCallback } from 'react'; // Updated React import
import { Calendar, Clock, ChevronLeft, ChevronRight, PlayCircle, AlertCircle } from 'lucide-react'; // Updated Lucide import
import { motion, AnimatePresence } from 'framer-motion'; // Using framer-motion for consistency

// ============================================================================
// Types
// ============================================================================
export interface LiveGame {
  id: string;
  league: string;
  homeTeam: string;
  homeAbbr: string;
  homeLogo?: string;
  homeScore?: number;
  awayTeam: string;
  awayAbbr: string;
  awayLogo?: string;
  awayScore?: number;
  time: string;
  network?: string;
  odds?: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINAL';
  clockOrInning?: string;
  timestamp: number;
}

const SPRING_TRANSITION = { type: "spring" as const, stiffness: 400, damping: 30 };
const EASE_TRANSITION = [0.16, 1, 0.3, 1];

// ============================================================================
// Safe Image Handler (Hydration Safe & Headshot/Flag Compatible) - REFINED
// ============================================================================
const TeamLogo = React.memo(({ src, alt }: { src?: string; alt: string }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
        return (
            <div className="w-9 h-9 rounded-full bg-neutral-800 border border-white/[0.06] flex items-center justify-center shrink-0 shadow-inner">
                <span className="text-[10px] font-mono text-neutral-500 tracking-widest font-bold">
                    {alt.substring(0, 3).toUpperCase()}
                </span>
            </div>
        );
    }

    return (
        <div className="w-9 h-9 flex items-center justify-center bg-neutral-950 rounded-full p-1 border border-white/[0.06] shrink-0 overflow-hidden shadow-sm">
            <img 
                src={src} 
                alt={alt} 
                className="w-full h-full object-contain opacity-90 drop-shadow-sm grayscale-[0.1] transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                onError={() => setHasError(true)}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
            />
        </div>
    );
});
TeamLogo.displayName = 'TeamLogo';

// ============================================================================
// Skeleton Loader (Zero CLS) - REFINED
// ============================================================================
const ScheduleSkeleton = () => (
    <div className="flex-shrink-0 w-[85%] sm:w-[280px] snap-center sm:snap-start bg-neutral-900 border border-white/[0.04] rounded-[24px] p-6 animate-pulse shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <div className="h-3 w-16 bg-white/[0.04] rounded-[4px]" />
            <div className="h-3 w-10 bg-white/[0.04] rounded-[4px]" />
        </div>
        <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/[0.04]" />
                    <div className="h-4 w-20 bg-white/[0.04] rounded-[6px]" />
                </div>
                <div className="h-5 w-8 bg-white/[0.04] rounded-[6px]" />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/[0.04]" />
                    <div className="h-4 w-20 bg-white/[0.04] rounded-[6px]" />
                </div>
                <div className="h-5 w-8 bg-white/[0.04] rounded-[6px]" />
            </div>
        </div>
        <div className="pt-4 border-t border-white/[0.02] flex justify-between">
            <div className="h-3 w-16 bg-white/[0.04] rounded-[4px]" />
            <div className="h-4 w-20 bg-white/[0.04] rounded-[6px]" />
        </div>
    </div>
);

// ============================================================================
// Primary Component (SportsCalendar) - PRODUCTION-GRADE
// Renamed to SportsCalendar for consistency with App.tsx imports
// ============================================================================
export function SportsCalendar({ games: propGames, leagueContext }: { games?: LiveGame[]; leagueContext?: string; }) {
  const [games, setGames] = useState<LiveGame[]>(propGames || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false); 
  const [hasHydrated, setHasHydrated] = useState(false); // Safeguard against Timezone Hydration mismatch

  // Hydration check for client-side rendering of localized dates
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Sync propGames with internal state, and set loading to false if propGames provided
  useEffect(() => {
    if (propGames && propGames.length > 0) {
      setGames(propGames);
      setLoading(false);
      setError(null); 
    } else if (propGames && propGames.length === 0) {
        setGames([]);
        setLoading(false);
        setError("No events found for this selection.");
    }
  }, [propGames]);

  // Autonomous Multi-League Live Data Fetcher (Enhanced for Production)
  const fetchSchedule = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
        const isProd = process.env.NODE_ENV === 'production';
        const endpoints = isProd 
          ? [{ url: '/api/sports/slate', league: 'PROXY' }] // Production routes through a single backend proxy
          : [ // Development fetches directly from ESPN
            { url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?limit=50', league: 'NBA' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?limit=50', league: 'WNBA' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?limit=50', league: 'NHL' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?limit=50', league: 'MLB' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?limit=50', league: 'EPL' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?limit=50', league: 'LALIGA' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?limit=50', league: 'SERIE A' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard?limit=50', league: 'BUNDESLIGA' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?limit=50', league: 'LIGUE 1' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?limit=50', league: 'LIGA MX' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?limit=50', league: 'MLS' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?limit=50', league: 'UCL' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?limit=150', league: 'ATP' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard?limit=150', league: 'WTA' }
          ];

        // Filter endpoints by leagueContext if provided
        const filteredEndpoints = leagueContext ? endpoints.filter(ep => ep.league.toLowerCase() === leagueContext.toLowerCase()) : endpoints;

        const results = await Promise.allSettled(
            filteredEndpoints.map(ep => 
                fetch(ep.url, { signal }) // Pass abort signal to fetch
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status} for ${ep.league}`);
                    return r.json();
                })
                .then(d => ({ ...d, _league: ep.league }))
            )
        );

        let parsedGames: LiveGame[] = [];

        // Handle single aggregated server proxy payload vs raw direct endpoints
        if (isProd && results[0].status === 'fulfilled') {
            parsedGames = results[0].value.games || []; // Assuming proxy returns { games: [...] }
        } else {
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value?.events) {
                    const leagueData = result.value;
                    const events = leagueData.events;

                    events.forEach((event: any) => {
                        try {
                            const comp = event.competitions?.[0];
                            if (!comp) return;

                            const homeRaw = comp.competitors?.find((c: any) => c.homeAway === 'home') || comp.competitors?.[0];
                            const awayRaw = comp.competitors?.find((c: any) => c.homeAway === 'away') || comp.competitors?.[1];
                            if (!homeRaw || !awayRaw) return;

                            const homeEntity = homeRaw.team || homeRaw.athlete || homeRaw.player || homeRaw;
                            const awayEntity = awayRaw.team || awayRaw.athlete || awayRaw.player || awayRaw;

                            const state = comp.status?.type?.state;
                            let status: LiveGame['status'] = 'SCHEDULED';
                            if (state === 'in') status = 'LIVE';
                            if (state === 'post') status = 'FINAL';

                            let timeStr = comp.status?.type?.shortDetail || 'TBD';
                            if (status === 'SCHEDULED' && event.date) {
                                const dateObj = new Date(event.date);
                                timeStr = hasHydrated // Only localize date client-side
                                    ? (!isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : timeStr)
                                    : timeStr; // Server-side render raw string
                            }

                            let oddsStr = comp.odds?.[0]?.details;
                            if (oddsStr?.toLowerCase() === 'even') oddsStr = 'PK';

                            const homeName = homeEntity.displayName || homeEntity.name || homeEntity.fullName || 'Home';
                            const awayName = awayEntity.displayName || awayEntity.name || awayEntity.fullName || 'Away';

                            const getAbbr = (entity: any, name: string, fallback: string) => {
                                if (entity.abbreviation) return entity.abbreviation;
                                if (entity.shortName) return entity.shortName;
                                if (leagueData._league === 'ATP' || leagueData._league === 'WTA') {
                                    const parts = name.trim().split(' ');
                                    return parts[parts.length - 1].substring(0, 3).toUpperCase();
                                }
                                return fallback;
                            };

                            const extractLogo = (entity: any, raw: any) => {
                                return entity.headshot?.href || 
                                       entity.headshot || 
                                       entity.logo || 
                                       entity.logos?.[0]?.href || 
                                       entity.flag?.href || 
                                       raw.athlete?.flag?.href || 
                                       undefined;
                            };

                            // FIX: Tennis set-score aggregation safeguard
                            const isTennis = leagueData._league === 'ATP' || leagueData._league === 'WTA';
                            const homeScoreVal = isTennis ? homeRaw.score : (homeRaw.score !== undefined ? homeRaw.score : (homeRaw.linescores && homeRaw.linescores.length > 0) ? homeRaw.linescores.map((ls:any)=>ls.value).join('-') : undefined);
                            const awayScoreVal = isTennis ? awayRaw.score : (awayRaw.score !== undefined ? awayRaw.score : (awayRaw.linescores && awayRaw.linescores.length > 0) ? awayRaw.linescores.map((ls:any)=>ls.value).join('-') : undefined);
                            
                            const pHomeScore = parseInt(homeScoreVal, 10);
                            const pAwayScore = parseInt(awayScoreVal, 10);

                            parsedGames.push({
                                id: event.id,
                                league: leagueData._league,
                                homeTeam: homeName,
                                homeAbbr: getAbbr(homeEntity, homeName, 'HM'),
                                homeLogo: extractLogo(homeEntity, homeRaw),
                                homeScore: status !== 'SCHEDULED' && !isNaN(pHomeScore) ? pHomeScore : undefined,
                                awayTeam: awayName,
                                awayAbbr: getAbbr(awayEntity, awayName, 'AW'),
                                awayLogo: extractLogo(awayEntity, awayRaw),
                                awayScore: status !== 'SCHEDULED' && !isNaN(pAwayScore) ? pAwayScore : undefined,
                                time: timeStr,
                                network: comp.broadcasts?.[0]?.names?.[0],
                                odds: oddsStr,
                                status,
                                clockOrInning: comp.status?.type?.shortDetail,
                                timestamp: new Date(event.date).getTime()
                            });
                        } catch (parseErr) {
                            console.warn(`[AURA:SCHEDULE] Suppressed parse error for event ${event?.id}:`, parseErr);
                        }
                    });
                }
            }
        }

        // Institutional Sorting: LIVE -> SCHEDULED -> FINAL
        parsedGames.sort((a, b) => {
            const rank = { 'LIVE': 1, 'SCHEDULED': 2, 'FINAL': 3 };
            if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
            if (a.status === 'FINAL') return b.timestamp - a.timestamp; // Most recently finished first
            return a.timestamp - b.timestamp; // Chronological order
        });

        setGames(parsedGames);
        setLoading(false);
        checkScrollability(); // Re-check scrollability after new games are loaded
    } catch (e: any) {
        if (e.name !== 'AbortError') console.error('[AURA:SCHEDULE] Sync Failure:', e.message);
        setError(e.message || "Failed to fetch schedule.");
        setLoading(false);
    }
  }, [leagueContext, hasHydrated]); // Added hasHydrated to dependencies to trigger re-fetch on client-side hydrate

  // Initial fetch and auto-refresh
  useEffect(() => {
    const controller = new AbortController();
    fetchSchedule(controller.signal); // Pass initial abort signal

    const intervalId = setInterval(() => fetchSchedule(controller.signal), 30000); // Refresh every 30 seconds
    
    return () => {
        controller.abort(); // Instantly cancel all pending network sockets on unmount
        clearInterval(intervalId);
    };
  }, [fetchSchedule]);

  // Check scrollability on mount and whenever games change
  const checkScrollability = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5); // Corrected scroll right condition
    }
  }, [games]); // Re-run if games array changes

  const handleScroll = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
          const scrollAmount = 300; // Adjusted scroll amount for better UX
          scrollContainerRef.current.scrollBy({
              left: direction === 'left' ? -scrollAmount : scrollAmount,
              behavior: 'smooth'
          });
          // Small delay to allow scroll to complete before re-checking
          setTimeout(checkScrollability, 350); 
      }
  };

  if (!hasHydrated) { // Render skeleton until hydration is complete
      return (
          <div className="w-full my-8 font-sans overflow-hidden">
              <div className="flex gap-4 pb-8 pt-2 overflow-x-auto">
                  <ScheduleSkeleton />
                  <ScheduleSkeleton />
                  <ScheduleSkeleton />
              </div>
          </div>
      );
  }

  if (!loading && games.length === 0 && !error) return null; // Collapse if slate is entirely empty and no error

  return (
    <div className="w-full my-8 font-sans overflow-hidden relative group/schedule">
      
      {/* Institutional Header */}
      <div className="flex items-center justify-between mb-5 px-1 select-none">
        <h2 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2.5 font-mono">
          <Calendar className="w-3.5 h-3.5 text-blue-400" strokeWidth={2.5} />
          {leagueContext ? `${leagueContext} Slate` : 'Global Slate'}
        </h2>
        {loading ? (
            <span className="text-[10px] font-mono font-bold text-neutral-600 tracking-widest uppercase tabular-nums lining-nums flex items-center gap-1 animate-pulse">
                Syncing...
            </span>
        ) : error ? (
            <span className="text-[10px] font-mono font-bold text-rose-500 tracking-widest uppercase tabular-nums lining-nums flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Error
            </span>
        ) : (
            <span className="text-[10px] font-mono font-bold text-neutral-600 tracking-widest uppercase tabular-nums lining-nums flex items-center gap-1 group cursor-pointer hover:text-neutral-400 transition-colors">
                {games.length} Events <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform duration-300 ml-0.5" strokeWidth={2.5} />
            </span>
        )}
      </div>

      {/* Hardware Accelerated Snap Carousel */}
      <div className="relative -mx-6 px-6 sm:mx-0 sm:px-0">
        {/* Desktop Navigation Buttons */}
        <AnimatePresence>
            {canScrollLeft && (
                <motion.button 
                    key="scroll-left"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={SPRING_TRANSITION}
                    onClick={() => handleScroll('left')}
                    className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-neutral-900/80 backdrop-blur-md text-white hover:bg-neutral-800 transition-colors duration-200 shadow-lg border border-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
                    aria-label="Previous game"
                >
                    <ChevronLeft size={20} strokeWidth={2} />
                </motion.button>
            )}
            {canScrollRight && (
                <motion.button 
                    key="scroll-right"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={SPRING_TRANSITION}
                    onClick={() => handleScroll('right')}
                    className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-neutral-900/80 backdrop-blur-md text-white hover:bg-neutral-800 transition-colors duration-200 shadow-lg border border-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
                    aria-label="Next game"
                >
                    <ChevronRight size={20} strokeWidth={2} />
                </motion.button>
            )}
        </AnimatePresence>

        <div 
            ref={scrollContainerRef}
            onScroll={checkScrollability} // Check scrollability on scroll
            className="flex overflow-x-auto gap-4 pb-8 pt-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-webkit-scrollbar]:hidden transform-gpu"
            role="region"
            aria-label="Live Game Schedule"
        >
          <AnimatePresence mode="wait">
              {loading ? (
                  <React.Fragment key="loading-skeletons">
                      <ScheduleSkeleton key="sk1" />
                      <ScheduleSkeleton key="sk2" />
                      <ScheduleSkeleton key="sk3" />
                  </React.Fragment>
              ) : error ? (
                  <motion.div 
                    key="error-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex-shrink-0 w-full sm:w-[calc(100%-32px)] snap-center bg-neutral-900 border border-rose-500/30 rounded-[24px] p-8 text-center shadow-sm flex flex-col items-center justify-center min-h-[200px] mx-4"
                  >
                      <AlertCircle className="w-8 h-8 text-rose-500 mb-3" />
                      <h3 className="text-[12px] font-mono font-bold tracking-widest text-rose-500 uppercase mb-2">Schedule Unavailable</h3>
                      <p className="text-[14px] text-neutral-400 font-sans">{error}</p>
                      <button 
                          onClick={() => fetchSchedule()} 
                          className="mt-6 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-bold uppercase tracking-widest rounded-full transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-400/40"
                      >
                          Retry
                      </button>
                  </motion.div>
              ) : (
                  games.map((game, idx) => {
                      const isHomeWinner = game.status === 'FINAL' && (game.homeScore || 0) > (game.awayScore || 0);
                      const isAwayWinner = game.status === 'FINAL' && (game.awayScore || 0) > (game.homeScore || 0);

                      return (
                          <motion.article 
                            key={`${game.id}-${game.status}`} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
                            className="flex-shrink-0 w-[85%] sm:w-[280px] snap-center sm:snap-start bg-neutral-900 border border-white/[0.04] rounded-[24px] p-6 hover:bg-neutral-800 hover:border-white/[0.08] transition-all duration-300 flex flex-col justify-between group select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 active:scale-[0.98] shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] cursor-pointer"
                            tabIndex={0}
                            role="button"
                          >
                            
                            {/* Card Header (Time, Status & Network) */}
                            <div className="flex items-center justify-between mb-6 text-[10px] font-mono tracking-widest uppercase font-bold">
                              {game.status === 'LIVE' ? (
                                <span className="text-rose-500 flex items-center gap-1.5 drop-shadow-sm truncate max-w-[130px]" title={game.clockOrInning}>
                                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-40" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                                  </span>
                                  <span className="truncate">{game.clockOrInning}</span>
                                </span>
                              ) : game.status === 'FINAL' ? (
                                 <span className="text-neutral-500">FINAL</span>
                              ) : (
                                <span className="text-neutral-400 flex items-center gap-1.5 truncate max-w-[130px]" title={game.time}>
                                  <Clock className="w-3 h-3 text-neutral-600" /> <span className="truncate">{game.time}</span>
                                </span>
                              )}

                              <div className="flex items-center gap-2 ml-2 shrink-0">
                                <span className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-[4px] border border-blue-400/20">{game.league}</span>
                                {game.network && (
                                  <span className="text-neutral-500 flex items-center gap-1.5 truncate max-w-[60px]" title={game.network}>
                                    {game.status === 'LIVE' && <PlayCircle className="w-3 h-3 text-rose-500 shrink-0" />}
                                    <span className="truncate">{game.network}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Competitor Row */}
                            <div className="space-y-4 mb-8 flex-1">
                              {/* Away Entity */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0 pr-3">
                                  <TeamLogo src={game.awayLogo} alt={game.awayAbbr} />
                                  <span className={`text-[15px] tracking-tight truncate max-w-[130px] ${isAwayWinner ? 'font-bold text-white' : 'font-medium text-white/70'}`} title={game.awayTeam}>
                                    {game.awayAbbr}
                                  </span>
                                </div>
                                <span className={`text-[17px] font-mono tabular-nums lining-nums shrink-0 ${isAwayWinner ? 'font-bold text-white' : 'font-medium text-neutral-500'}`}>
                                  {game.status !== 'SCHEDULED' ? game.awayScore : '-'}
                                </span>
                              </div>

                              {/* Home Entity */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0 pr-3">
                                  <TeamLogo src={game.homeLogo} alt={game.homeAbbr} />
                                  <span className={`text-[15px] tracking-tight truncate max-w-[130px] ${isHomeWinner ? 'font-bold text-white' : 'font-medium text-white/70'}`} title={game.homeTeam}>
                                    {game.homeAbbr}
                                  </span>
                                </div>
                                <span className={`text-[17px] font-mono tabular-nums lining-nums shrink-0 ${isHomeWinner ? 'font-bold text-white' : 'font-medium text-neutral-500'}`}>
                                  {game.status !== 'SCHEDULED' ? game.homeScore : '-'}
                                </span>
                              </div>
                            </div>

                            {/* Market Consensus Footer */}
                            <div className="mt-auto pt-4 border-t border-white/[0.04]">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest font-bold shrink-0">
                                    Consensus
                                </span>
                                {game.odds && game.status !== 'FINAL' ? (
                                    <span className="text-[11px] font-mono text-emerald-400 font-bold tracking-tight bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-[4px] tabular-nums lining-nums truncate max-w-[120px]" title={game.odds}>
                                        {game.odds}
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-mono text-neutral-600 tracking-widest uppercase font-bold shrink-0">
                                        OFF
                                    </span>
                                )}
                              </div>
                            </div>

                          </motion.article>
                      );
                  })
              )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export { SportsCalendar as GameScheduleMock };