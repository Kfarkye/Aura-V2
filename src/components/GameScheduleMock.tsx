import React from 'react';
import { Calendar, Clock, ChevronRight, PlayCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface MockGame {
  id: string;
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
  inningOrQuarter?: string;
}

const mockGames: MockGame[] = [
  {
    id: "g1",
    homeTeam: "New York Yankees",
    homeAbbr: "NYY",
    homeLogo: "https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png",
    homeScore: 4,
    awayTeam: "Boston Red Sox",
    awayAbbr: "BOS",
    awayLogo: "https://a.espncdn.com/i/teamlogos/mlb/500/bos.png",
    awayScore: 2,
    time: "7:05 PM ET",
    network: "ESPN",
    odds: "NYY -140",
    status: 'LIVE',
    inningOrQuarter: "Top 6th"
  },
  {
    id: "g2",
    homeTeam: "Los Angeles Dodgers",
    homeAbbr: "LAD",
    homeLogo: "https://a.espncdn.com/i/teamlogos/mlb/500/lad.png",
    awayTeam: "San Diego Padres",
    awayAbbr: "SD",
    awayLogo: "https://a.espncdn.com/i/teamlogos/mlb/500/sd.png",
    time: "10:10 PM ET",
    network: "FS1",
    odds: "LAD -155",
    status: 'SCHEDULED'
  },
  {
    id: "g3",
    homeTeam: "Atlanta Braves",
    homeAbbr: "ATL",
    homeLogo: "https://a.espncdn.com/i/teamlogos/mlb/500/atl.png",
    homeScore: 8,
    awayTeam: "Philadelphia Phillies",
    awayAbbr: "PHI",
    awayLogo: "https://a.espncdn.com/i/teamlogos/mlb/500/phi.png",
    awayScore: 3,
    time: "Final",
    status: 'FINAL'
  },
  {
    id: "g4",
    homeTeam: "Dallas Mavericks",
    homeAbbr: "DAL",
    homeLogo: "https://a.espncdn.com/i/teamlogos/nba/500/dal.png",
    awayTeam: "Minnesota Timberwolves",
    awayAbbr: "MIN",
    awayLogo: "https://a.espncdn.com/i/teamlogos/nba/500/min.png",
    time: "8:30 PM ET",
    network: "TNT",
    odds: "DAL -4.5",
    status: 'SCHEDULED'
  }
];

export function GameScheduleMock() {
  return (
    <div className="w-full my-8 font-sans">
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-[19px] font-medium text-white/90 tracking-tight flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-white/40" />
          Today's Schedule
        </h2>
        <button className="text-[13px] font-medium text-white/40 hover:text-white/80 flex items-center transition-all duration-300 group">
          View All 
          <ChevronRight className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
        </button>
      </div>

      <div className="flex overflow-x-auto gap-5 pb-8 snap-x hide-scrollbars -mx-6 px-6 sm:mx-0 sm:px-0">
        {mockGames.map((game, idx) => (
          <motion.div 
            key={game.id} 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -4, scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            className="flex-shrink-0 w-[280px] snap-start bg-[#151517]/40 backdrop-blur-3xl border border-white/[0.06] rounded-[28px] p-6 hover:bg-[#1a1a1c]/60 hover:border-white/[0.1] transition-all duration-400 shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] cursor-pointer flex flex-col justify-between group overflow-hidden relative"
          >
            {/* Subtle top gradient on hover */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/0 to-transparent group-hover:via-white/20 transition-all duration-700" />
            
            <div className="flex items-center justify-between mb-5 text-[12px] font-medium tracking-wide">
              {game.status === 'LIVE' ? (
                <span className="text-[#ff3b30] flex items-center gap-1.5 font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3b30] opacity-40"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff3b30]"></span>
                  </span>
                  {game.inningOrQuarter}
                </span>
              ) : game.status === 'FINAL' ? (
                 <span className="text-white/40 font-semibold tracking-wider">FINAL</span>
              ) : (
                <span className="text-white/50 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {game.time}
                </span>
              )}
              {game.network && (
                <span className="text-white/50 flex items-center gap-1.5">
                  {game.status === 'LIVE' && <PlayCircle className="w-3.5 h-3.5 text-white/40" />}
                  {game.network}
                </span>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-full p-1 border border-white/5">
                    <img src={game.awayLogo} alt={game.awayTeam} className="w-full h-full object-contain drop-shadow-md" />
                  </div>
                  <span className={`text-[16px] tracking-tight ${game.status === 'FINAL' && (game.awayScore! > game.homeScore!) ? 'font-semibold text-white' : 'font-medium text-white/70'}`}>
                    {game.awayAbbr}
                  </span>
                </div>
                {game.status !== 'SCHEDULED' && (
                  <span className={`text-[18px] font-medium tracking-tighter ${game.status === 'FINAL' && (game.awayScore! > game.homeScore!) ? 'text-white' : 'text-white/60'}`}>
                    {game.awayScore}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-full p-1 border border-white/5">
                    <img src={game.homeLogo} alt={game.homeTeam} className="w-full h-full object-contain drop-shadow-md" />
                  </div>
                  <span className={`text-[16px] tracking-tight ${game.status === 'FINAL' && (game.homeScore! > game.awayScore!) ? 'font-semibold text-white' : 'font-medium text-white/70'}`}>
                    {game.homeAbbr}
                  </span>
                </div>
                {game.status !== 'SCHEDULED' && (
                  <span className={`text-[18px] font-medium tracking-tighter ${game.status === 'FINAL' && (game.homeScore! > game.awayScore!) ? 'text-white' : 'text-white/60'}`}>
                    {game.homeScore}
                  </span>
                )}
              </div>
            </div>

            {game.odds && (
              <div className="mt-auto pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-white/40 font-medium">Live Odds</span>
                  <span className="text-[#34c759] font-medium tracking-tight bg-[#34c759]/10 px-2.5 py-1 rounded-lg">{game.odds}</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbars::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbars {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
