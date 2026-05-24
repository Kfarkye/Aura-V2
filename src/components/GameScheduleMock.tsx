import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronRight, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ============================================================================
// Types
// ============================================================================
export interface LiveGame {
  id: string;
  league: string;
  homeTeam: string;
  homeAbbr: string;
  homeLogo: string;
  homeScore?: number;
  awayTeam: string;
  awayAbbr: string;
  awayLogo: string;
  awayScore?: number;
  time: string;
  network?: string;
  odds?: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINAL';
  clockOrInning?: string;
  timestamp: number;
}

// ============================================================================
// Safe Image Handler (Hydration Safe)
// ============================================================================
const TeamLogo = React.memo(({ src, alt }: { src: string; alt: string }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
        return (
            <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                <span className="text-[9px] font-mono text-neutral-500 tracking-widest">{alt.substring(0, 3)}</span>
            </div>
        );
    }

    return (
        <div className="w-8 h-8 flex items-center justify-center bg-white/[0.01] rounded-full p-1 border border-white/[0.04] shrink-0 overflow-hidden">
            <img 
                src={src} 
                alt={alt} 
                className="w-full h-full object-contain opacity-90 drop-shadow-sm grayscale-[0.2]"
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
// Skeleton Loader (Zero CLS)
// ============================================================================
const ScheduleSkeleton = () => (
    <div className="flex-shrink-0 w-[85%] sm:w-[280px] snap-center sm:snap-start bg-white/[0.01] border border-white/[0.02] rounded-[24px] p-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
            <div className="h-3 w-16 bg-white/[0.03] rounded" />
            <div className="h-3 w-10 bg-white/[0.03] rounded" />
        </div>
        <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/[0.03]" />
                    <div className="h-4 w-12 bg-white/[0.03] rounded" />
                </div>
                <div className="h-5 w-6 bg-white/[0.03] rounded" />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/[0.03]" />
                    <div className="h-4 w-12 bg-white/[0.03] rounded" />
                </div>
                <div className="h-5 w-6 bg-white/[0.03] rounded" />
            </div>
        </div>
        <div className="pt-4 border-t border-white/[0.02] flex justify-between">
            <div className="h-3 w-16 bg-white/[0.03] rounded" />
            <div className="h-4 w-20 bg-white/[0.03] rounded-md" />
        </div>
    </div>
);

// ============================================================================
// Primary Component
// ============================================================================
function LiveScheduleCarousel() {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);

  // Autonomous Live Data Fetcher
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    
    const fetchSchedule = async () => {
      try {
        const endpoints = [
            { url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard', league: 'NBA' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard', league: 'NHL' },
            { url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard', league: 'MLB' }
        ];

        // Concurrent fetch across all active leagues
        const results = await Promise.allSettled(
            endpoints.map(ep => fetch(ep.url, { signal: controller.signal }).then(r => r.json()).then(d => ({ ...d, _league: ep.league })))
        );

        let parsedGames: LiveGame[] = [];

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value?.events) {
                const leagueData = result.value;
                const events = leagueData.events;

                events.forEach((event: any) => {
                    const comp = event.competitions?.[0];
                    if (!comp) return;

                    const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
                    const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
                    if (!home || !away) return;

                    const state = comp.status?.type?.state;
                    let status: LiveGame['status'] = 'SCHEDULED';
                    if (state === 'in') status = 'LIVE';
                    if (state === 'post') status = 'FINAL';

                    // Format Time
                    let timeStr = comp.status?.type?.shortDetail || 'TBD';
                    if (status === 'SCHEDULED' && event.date) {
                        const dateObj = new Date(event.date);
                        timeStr = !isNaN(dateObj.getTime()) 
                            ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                            : timeStr;
                    }

                    // Standardize Odds
                    let oddsStr = comp.odds?.[0]?.details;
                    if (oddsStr?.toLowerCase() === 'even') oddsStr = 'PK';

                    parsedGames.push({
                        id: event.id,
                        league: leagueData._league,
                        homeTeam: home.team?.displayName || home.team?.name,
                        homeAbbr: home.team?.abbreviation || 'HM',
                        homeLogo: home.team?.logo,
                        homeScore: status !== 'SCHEDULED' ? parseInt(home.score, 10) : undefined,
                        awayTeam: away.team?.displayName || away.team?.name,
                        awayAbbr: away.team?.abbreviation || 'AW',
                        awayLogo: away.team?.logo,
                        awayScore: status !== 'SCHEDULED' ? parseInt(away.score, 10) : undefined,
                        time: timeStr,
                        network: comp.broadcasts?.[0]?.names?.[0],
                        odds: oddsStr,
                        status,
                        clockOrInning: comp.status?.type?.shortDetail,
                        timestamp: new Date(event.date).getTime()
                    });
                });
            }
        }

        // Institutional Sorting: LIVE -> SCHEDULED -> FINAL
        parsedGames.sort((a, b) => {
            const rank = { 'LIVE': 1, 'SCHEDULED': 2, 'FINAL': 3 };
            if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
            if (a.status === 'FINAL') return b.timestamp - a.timestamp; // Most recently finished first
            return a.timestamp - b.timestamp; // Chronological order
        });

        if (isMounted) {
            setGames(parsedGames);
            setLoading(false);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error('[AURA:SCHEDULE] Sync Failure:', e.message);
        if (isMounted) setLoading(false);
      }
    };

    fetchSchedule();
    
    // Auto-refresh schedule every 30 seconds for live odds/scores
    const intervalId = setInterval(fetchSchedule, 30000);
    
    return () => {
        isMounted = false;
        controller.abort();
        clearInterval(intervalId);
    };
  }, []);

  if (!loading && games.length === 0) return null; // Collapse if slate is entirely empty

  return (
    <div className="w-full my-8 font-sans overflow-hidden">
      
      {/* Institutional Header */}
      <div className="flex items-center justify-between mb-5 px-1 select-none">
        <h2 className="text-[12px] font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2.5">
          <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
          Active Slate
        </h2>
        {!loading && (
            <span className="text-[10px] font-mono text-neutral-600 tracking-widest uppercase tabular-nums lining-nums flex items-center gap-1 group">
                {games.length} Events <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform duration-300 ml-0.5" />
            </span>
        )}
      </div>

      {/* CSS Native Snap Carousel (Hardware Accelerated) */}
      <div className="relative -mx-6 px-6 sm:mx-0 sm:px-0">
        <div 
            className="flex overflow-x-auto gap-4 pb-8 pt-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transform-gpu"
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
              ) : (
                  games.map((game, idx) => {
                      const isHomeWinner = game.status === 'FINAL' && (game.homeScore || 0) > (game.awayScore || 0);
                      const isAwayWinner = game.status === 'FINAL' && (game.awayScore || 0) > (game.homeScore || 0);

                      return (
                          <motion.article 
                            key={game.id} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
                            className="flex-shrink-0 w-[85%] sm:w-[280px] snap-center sm:snap-start bg-white/[0.015] backdrop-blur-md border border-white/[0.04] rounded-[24px] p-6 hover:bg-white/[0.03] hover:border-white/[0.06] transition-colors duration-300 flex flex-col justify-between group select-none outline-none focus-visible:ring-2 focus-visible:ring-white/20 active:scale-[0.98]"
                            tabIndex={0}
                            role="button"
                          >
                            
                            {/* Card Header (Time & Network) */}
                            <div className="flex items-center justify-between mb-6 text-[10px] font-mono tracking-widest uppercase">
                              {game.status === 'LIVE' ? (
                                <span className="text-[#34C759] flex items-center gap-1.5 font-bold">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-40" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34C759]" />
                                  </span>
                                  {game.clockOrInning}
                                </span>
                              ) : game.status === 'FINAL' ? (
                                 <span className="text-neutral-500 font-medium">FINAL</span>
                              ) : (
                                <span className="text-neutral-500 flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" /> {game.time}
                                </span>
                              )}

                              <div className="flex items-center gap-2">
                                <span className="text-neutral-600 font-bold">{game.league}</span>
                                {game.network && (
                                  <span className="text-neutral-500 flex items-center gap-1.5 truncate max-w-[80px]">
                                    {game.status === 'LIVE' && <PlayCircle className="w-3 h-3 text-[#34C759]" />}
                                    {game.network}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Teams Row */}
                            <div className="space-y-4 mb-8 flex-1">
                              {/* Away Team */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <TeamLogo src={game.awayLogo} alt={game.awayAbbr} />
                                  <span className={`text-[15px] tracking-tight ${isAwayWinner ? 'font-semibold text-white/95' : 'font-medium text-white/70'}`}>
                                    {game.awayAbbr}
                                  </span>
                                </div>
                                <span className={`text-[16px] font-mono tabular-nums lining-nums ${isAwayWinner ? 'font-semibold text-white/95' : 'font-medium text-neutral-500'}`}>
                                  {game.status !== 'SCHEDULED' ? game.awayScore : '-'}
                                </span>
                              </div>

                              {/* Home Team */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <TeamLogo src={game.homeLogo} alt={game.homeAbbr} />
                                  <span className={`text-[15px] tracking-tight ${isHomeWinner ? 'font-semibold text-white/95' : 'font-medium text-white/70'}`}>
                                    {game.homeAbbr}
                                  </span>
                                </div>
                                <span className={`text-[16px] font-mono tabular-nums lining-nums ${isHomeWinner ? 'font-semibold text-white/95' : 'font-medium text-neutral-500'}`}>
                                  {game.status !== 'SCHEDULED' ? game.homeScore : '-'}
                                </span>
                              </div>
                            </div>

                            {/* Odds Footer */}
                            <div className="mt-auto pt-4 border-t border-white/[0.04]">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
                                    Consensus
                                </span>
                                {game.odds && game.status !== 'FINAL' ? (
                                    <span className="text-[11px] font-mono text-[#34C759] font-medium tracking-tight bg-[#34C759]/10 border border-[#34C759]/20 px-2 py-0.5 rounded-[4px] tabular-nums lining-nums truncate max-w-[120px]">
                                        {game.odds}
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-mono text-neutral-600 tracking-widest uppercase">
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

export { LiveScheduleCarousel as GameScheduleMock };
