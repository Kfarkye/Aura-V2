import { SportsData, LeagueContext } from '../types/aura';
import { CalendarDays, Trophy, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface SportsCalendarProps {
  games: SportsData[];
  leagueContext?: LeagueContext;
}

export function SportsCalendar({ games, leagueContext }: SportsCalendarProps) {
  const getDayStr = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const groupedGames = games.reduce((acc, game) => {
    const gameDate = new Date(game.start_time);
    const dayStr = getDayStr(gameDate);
    if (!acc[dayStr]) acc[dayStr] = [];
    acc[dayStr].push(game);
    return acc;
  }, {} as Record<string, SportsData[]>);

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      {leagueContext && (
         <div className="bg-[#1c1c1e]/60 backdrop-blur-2xl border border-white/[0.08] rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 mb-2 relative group">
              <div className="flex items-center gap-2 mb-5">
                  <Trophy className="h-4 w-4 text-[#34c759]" />
                  <h4 className="text-[15px] font-semibold text-white/90 tracking-tight">Playoff Implications</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">Standing</span>
                      <span className="text-[22px] font-medium text-white/90 flex items-end gap-1.5">{leagueContext.teamAbbreviation} <span className="text-[13px] text-white/40 mb-1">{leagueContext.groupName}</span></span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">Seed</span>
                      <span className="text-[22px] font-medium text-[#34c759]">#{leagueContext.seed}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">Games Back</span>
                      <span className="text-[22px] font-medium text-white/90">{leagueContext.gamesBack}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">Record</span>
                      <span className="text-[22px] font-medium text-white/90">{leagueContext.overallRecord} <span className="text-[14px] text-white/40 tracking-tighter">({leagueContext.winPercent})</span></span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">Streak</span>
                      <div className="flex items-center gap-1.5 mt-1 text-[#34c759] font-medium">
                         <TrendingUp className="h-[18px] w-[18px]" />
                         <span className="text-[20px]">{leagueContext.streak}</span>
                      </div>
                  </div>
              </div>
         </div>
      )}

      {Object.entries(groupedGames).map(([dateLabel, dayGames]) => (
        <div key={dateLabel} className="bg-[#1c1c1e]/40 backdrop-blur-3xl border border-white/[0.08] rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="bg-white/[0.02] px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-[18px] w-[18px] text-[#34c759]" />
              <h4 className="text-[15px] font-medium text-white/90 tracking-wide">{dateLabel}</h4>
            </div>
            <span className="text-[13px] text-white/40 font-medium">{dayGames.length} Event{dayGames.length !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="flex flex-col divide-y divide-white/[0.04]">
            {dayGames.map((game) => {
               const gameDate = new Date(game.start_time);
               const timeString = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
               const isFinal = game.status.includes('FINAL') || game.status.includes('FT') || game.status.includes('Completed');
               const isLive = game.status.includes('IN_PROGRESS') || game.status.includes('LIVE') || game.status.includes('Half');
               
               return (
                 <motion.div 
                    key={game.game_id} 
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className="p-5 hover:bg-white/[0.03] transition-colors duration-400 cursor-pointer relative group flex flex-col gap-5"
                 >
                    <div className="flex items-center justify-between">
                       {/* Teams */}
                       <div className="flex flex-col gap-4 w-1/2">
                          {/* Away Team */}
                          <div className="flex items-center gap-3.5">
                             <div className="h-8 w-8 bg-white/5 rounded-full flex items-center justify-center border border-white/5 shadow-sm shrink-0 p-1.5">
                               {game.away_team.logo ? (
                                  <img src={game.away_team.logo} alt={game.away_team.abbreviation} className="w-full h-full object-contain" />
                               ) : (
                                  <span className="text-[10px] font-medium text-white/50">{game.away_team.abbreviation}</span>
                               )}
                             </div>
                             <span className={`text-[17px] tracking-tight ${game.away_team.score !== undefined && game.away_team.score > (game.home_team.score || 0) ? 'font-medium text-white/90' : 'font-normal text-white/60'}`}>
                               {game.away_team.name}
                             </span>
                          </div>
                          
                          {/* Home Team */}
                          <div className="flex items-center gap-3.5">
                             <div className="h-8 w-8 bg-white/5 rounded-full flex items-center justify-center border border-white/5 shadow-sm shrink-0 p-1.5">
                               {game.home_team.logo ? (
                                  <img src={game.home_team.logo} alt={game.home_team.abbreviation} className="w-full h-full object-contain" />
                               ) : (
                                  <span className="text-[10px] font-medium text-white/50">{game.home_team.abbreviation}</span>
                               )}
                             </div>
                             <span className={`text-[17px] tracking-tight ${game.home_team.score !== undefined && game.home_team.score > (game.away_team.score || 0) ? 'font-medium text-white/90' : 'font-normal text-white/60'}`}>
                               {game.home_team.name}
                             </span>
                          </div>
                       </div>
                       
                       {/* Scores or Time */}
                       <div className="flex gap-6 items-center">
                          {(game.away_team.score !== undefined || game.home_team.score !== undefined) ? (
                              <div className="flex flex-col gap-3 items-end justify-center min-w-[32px]">
                                 <span className={`text-[19px] leading-none tracking-tight ${game.away_team.score !== undefined && game.away_team.score > (game.home_team.score || 0) ? 'text-white/90 font-medium' : 'text-white/60 font-normal'}`}>{game.away_team.score ?? '-'}</span>
                                 <span className={`text-[19px] leading-none tracking-tight ${game.home_team.score !== undefined && game.home_team.score > (game.away_team.score || 0) ? 'text-white/90 font-medium' : 'text-white/60 font-normal'}`}>{game.home_team.score ?? '-'}</span>
                              </div>
                          ) : (
                              <div className="text-right">
                                  <div className="text-[16px] font-medium text-white/70 tracking-tight">{timeString}</div>
                              </div>
                          )}

                          {/* Status Badge */}
                          <div className="flex flex-col items-end w-32 gap-2">
                              {isLive ? (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-full">
                                     <div className="w-1.5 h-1.5 rounded-full bg-[#ff3b30] animate-pulse"></div>
                                     <span className="text-[11px] font-semibold text-[#ff3b30] tracking-wider">LIVE</span>
                                  </div>
                              ) : isFinal ? (
                                  <span className="text-[12px] text-white/40 font-semibold tracking-wide uppercase">{game.short_status || 'FT'}</span>
                              ) : (
                                  <span className="text-[12px] text-white/40 font-medium tracking-wide uppercase">{game.short_status || 'SCHED'}</span>
                              )}

                              {(game as any).series_summary && (
                                  <span className="text-[11px] text-[#34c759] font-medium tracking-tight text-right w-full leading-tight">
                                     {(game as any).series_summary}
                                  </span>
                              )}
                              {(game as any).game_notes && (
                                  <span className="text-[11px] text-[#ff9500] font-medium tracking-tight text-right w-full leading-tight">
                                     {(game as any).game_notes}
                                  </span>
                              )}
                          </div>
                       </div>
                    </div>
                    
                    {/* Injury Impact */}
                    {game.injuries && game.injuries.length > 0 && (
                       <div className="mt-3 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-[#ff3b30] to-[#ff3b30]/40" />
                          <div className="flex items-center gap-2 px-1 pb-2 border-b border-[#ff3b30]/20">
                              <AlertTriangle className="h-4 w-4 text-[#ff3b30]" />
                              <span className="text-[11px] text-[#ff3b30] uppercase tracking-[0.1em] font-semibold">Injury Impact</span>
                          </div>
                          <div className="flex flex-col gap-4 pl-2 pt-1">
                             {game.injuries.map(teamInjs => (
                                <div key={teamInjs.teamAbbreviation} className="flex gap-4">
                                    <span className="text-[13px] font-medium text-white/50 w-10 pt-1">{teamInjs.teamAbbreviation}</span>
                                    <div className="flex flex-wrap gap-2.5 flex-1">
                                        {teamInjs.players.slice(0, 5).map((p: any) => (
                                            <div key={p.id} className="flex items-center gap-2 bg-[#ff3b30]/5 border border-[#ff3b30]/20 rounded-lg px-2.5 py-1.5 shadow-sm">
                                               <span className="text-[11px] text-[#ff3b30]/70 font-medium">{p.position}</span>
                                               <span className="text-[13px] text-white/80 font-medium">{p.name}</span>
                                               <span className="text-[10px] text-[#ff3b30] uppercase tracking-wide font-semibold">{p.status}</span>
                                            </div>
                                        ))}
                                        {teamInjs.players.length > 5 && (
                                           <span className="text-[12px] text-white/40 self-center">+{teamInjs.players.length - 5} more</span>
                                        )}
                                    </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* Embedded Odds UI */}
                    {(game as any).odds && (game as any).odds.length > 0 && (
                        <div className="pt-4 border-t border-white/[0.04] grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                           {((game as any).odds).map((odd: any, idx: number) => (
                               <div key={idx} className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04] flex flex-col gap-1.5 col-span-2 md:col-span-4">
                                   <div className="text-[11px] tracking-wide text-white/40 uppercase flex items-center justify-between">
                                       <span>{odd.provider} (Odds)</span>
                                   </div>
                                   <div className="flex items-center gap-5 text-[14px] mt-1">
                                       {odd.details && <span className="font-medium text-[#34c759]"><span className="text-white/40 text-[11px] mr-1.5">SPREAD</span>{odd.details}</span>}
                                       {odd.overUnder && <span className="font-medium text-[#34c759]"><span className="text-white/40 text-[11px] mr-1.5">O/U</span>{odd.overUnder}</span>}
                                       {odd.moneyline && <span className="font-medium text-[#34c759]"><span className="text-white/40 text-[11px] mr-1.5">ML</span>{odd.moneyline}</span>}
                                   </div>
                               </div>
                           ))}
                        </div>
                    )}
                 </motion.div>
               );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
