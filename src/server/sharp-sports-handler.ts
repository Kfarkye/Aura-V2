import { AuraArtifact } from '../types/aura';
import { getDocs, query, collection, where } from 'firebase/firestore';
import { isDbDisabled, reportDbError } from './db-breaker';

interface SportsQueryParams {
    team?: string;
    league?: string;
    date?: string; // YYYYMMDD
    include_odds?: boolean;
}

export async function handleSportsQuery(params: SportsQueryParams, db?: any): Promise<AuraArtifact> {
    const { team, league, date } = params;

    if (!league) {
        return {
            id: `err_${Date.now()}`,
            type: 'SPORTS_ARTIFACT',
            resolution_state: 'GROUNDING_FAULT',
            context_summary: "Couldn't determine which league you meant. Try naming the league (e.g., NBA, NFL)."
        };
    }

    const safeLeague = league.toLowerCase();
    
    // Check if the query is historical (> 24h old)
    let isHistorical = false;
    let formattedDate = "";
    if (date) {
        // YYYYMMDD
        const y = parseInt(date.substring(0, 4), 10);
        const m = parseInt(date.substring(4, 6), 10) - 1;
        const d = parseInt(date.substring(6, 8), 10);
        const qDate = new Date(Date.UTC(y, m, d));
        if (Date.now() - qDate.getTime() > 24 * 60 * 60 * 1000) {
            isHistorical = true;
        }
        formattedDate = `${date.substring(0,4)}-${date.substring(4,6)}-${date.substring(6,8)}`;
    }

    // --- Google Scale Hot/Cold Routing ---
    // If the database is available, dynamically route player stats and games.
    if (db && !isDbDisabled()) {
        try {
            const gamesCollection = isHistorical ? 'bq_historical_games' : 'sports_games_staging';
            const logsCollection = isHistorical ? 'bq_historical_logs' : 'sports_player_game_logs_staging';
            
            const gamesRef = collection(db, gamesCollection);
            let gamesQ: any = query(gamesRef, where('league', '==', safeLeague));
            if (formattedDate) {
                gamesQ = query(gamesQ, where('date', '==', formattedDate));
            }
            
            const gamesSnap = await getDocs(gamesQ);
            
            if (!gamesSnap.empty) {
                const dbEvents = [];
                for (const gameDoc of gamesSnap.docs) {
                    const gameData: any = gameDoc.data();
                    
                    // Filter match by team
                    if (team) {
                        const t = team.toLowerCase();
                        const hAbbr = gameData.home_team?.abbreviation?.toLowerCase() || '';
                        const aAbbr = gameData.away_team?.abbreviation?.toLowerCase() || '';
                        const hName = gameData.home_team?.name?.toLowerCase() || '';
                        const aName = gameData.away_team?.name?.toLowerCase() || '';
                        if (!(hAbbr === t || aAbbr === t || hName.includes(t) || aName.includes(t))) {
                            continue;
                        }
                    }

                    // Fetch associated player logs from appropriately routed collection
                    const logsQ = query(collection(db, logsCollection), where('game_id', '==', gameData.id));
                    const logsSnap = await getDocs(logsQ);
                    const playerStats: any[] = [];
                    logsSnap.forEach((logDoc) => {
                         playerStats.push(logDoc.data());
                    });

                    dbEvents.push({
                        game_id: gameData.id,
                        status: gameData.status,
                        short_status: gameData.status,
                        start_time: gameData.scheduled_at_utc || gameData.date,
                        venue: gameData.venue,
                        home_team: gameData.home_team,
                        away_team: gameData.away_team,
                        home_score: gameData.home_score,
                        away_score: gameData.away_score,
                        player_stats: playerStats
                    });
                }
                
                if (dbEvents.length > 0) {
                     console.log(`[Resolver Core] Routed query for ${safeLeague} on ${formattedDate} to ${gamesCollection} (${dbEvents.length} distinct matches)`);
                     return {
                         id: `evt_db_${Date.now()}`,
                         type: 'SPORTS_ARTIFACT',
                         resolution_state: isHistorical ? 'COLD_STORAGE_DATA' : 'HOT_MEMORY_DATA',
                         data: {
                             events: dbEvents,
                             source: isHistorical ? 'BigQuery Simulation' : 'Firestore Memory'
                         }
                     };
                }
            } else if (isHistorical) {
                 // Fast fail for cold storage misses without hitting external APIs unnecessarily
                 return {
                     id: `evt_none_${Date.now()}`,
                     type: 'SPORTS_ARTIFACT',
                     resolution_state: 'NO_GAMES_SCHEDULED',
                     context_summary: `No historical games found in cold storage for ${safeLeague.toUpperCase()} on ${formattedDate}.`
                 };
            }
        } catch (dbErr) {
             reportDbError(dbErr, 'Resolver Core');
             // Fallback to Live ESPN fetch if DB fails implicitly
        }
    }

    // ESPN API format: https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
    let sport = 'basketball';
    if (safeLeague === 'nfl') sport = 'football';
    if (safeLeague === 'mlb') sport = 'baseball';
    if (safeLeague === 'nhl') sport = 'hockey';

    try {
        let res: Response;
        let standingsData: any = null;

        const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${safeLeague}/scoreboard${date ? `?dates=${date}` : ''}`;
        const standingsUrl = `https://site.api.espn.com/apis/v2/sports/${sport}/${safeLeague}/standings`;
        
        // Fetch parallel
        const responses = await Promise.allSettled([
            fetch(url),
            team ? fetch(standingsUrl).catch(() => null) : Promise.resolve(null)
        ]);

        const [scoreboardResult, standingsResult] = responses;

        if (scoreboardResult.status === 'fulfilled') {
             res = scoreboardResult.value;
             if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);
        } else {
             throw new Error("Failed to fetch scoreboard");
        }

        if (standingsResult.status === 'fulfilled' && standingsResult.value) {
            const tempRes = standingsResult.value;
            if (tempRes && tempRes.ok) {
                 standingsData = await tempRes.json();
            }
        }

        const data = await res.json();

        if (!data.events || data.events.length === 0) {
            return {
                id: `evt_none_${Date.now()}`,
                type: 'SPORTS_ARTIFACT',
                resolution_state: 'NO_GAMES_SCHEDULED',
                context_summary: `No ${safeLeague.toUpperCase()} games scheduled${date ? ` on ${date}` : " live"}.`
            };
        }

        // Filter by team if requested
        let events = data.events;
        if (team) {
            const searchTeam = team.toLowerCase();
            events = events.filter((e: any) => {
                return e.competitions[0].competitors.some((c: any) => {
                    return c.team.abbreviation.toLowerCase() === searchTeam || 
                           c.team.name.toLowerCase().includes(searchTeam) ||
                           c.team.displayName.toLowerCase().includes(searchTeam);
                });
            });
        }

        if (events.length === 0) {
             return {
                id: `evt_none_team_${Date.now()}`,
                type: 'SPORTS_ARTIFACT',
                resolution_state: 'NO_GAMES_SCHEDULED',
                context_summary: `No matching games found for '${team}' in ${safeLeague.toUpperCase()}${date ? ` on ${date}` : " live"}.`
            };
        }

        const parsedEvents = await Promise.all(events.map(async (game: any) => {
            const comp = game.competitions[0];
            const homeCompetitor = comp.competitors.find((c: any) => c.homeAway === 'home');
            const awayCompetitor = comp.competitors.find((c: any) => c.homeAway === 'away');

            const homeScoreRaw = parseInt(homeCompetitor.score, 10);
            const awayScoreRaw = parseInt(awayCompetitor.score, 10);

            const isPreGame = comp.status.type.state === 'pre';

            const eventData: any = {
                game_id: game.id,
                status: comp.status.type.name,
                short_status: comp.status.type.shortDetail,
                series_summary: comp.series?.summary || game.competitions[0].series?.summary || game.series?.summary || '',
                game_notes: comp.notes?.length ? comp.notes[0].headline : '',
                start_time: game.date,
                venue: comp.venue?.fullName,
                home_team: {
                    id: homeCompetitor.team.id,
                    name: homeCompetitor.team.name,
                    abbreviation: homeCompetitor.team.abbreviation,
                    logo: homeCompetitor.team.logo,
                    ...(isPreGame ? {} : { score: isNaN(homeScoreRaw) ? undefined : homeScoreRaw })
                },
                away_team: {
                    id: awayCompetitor.team.id,
                    name: awayCompetitor.team.name,
                    abbreviation: awayCompetitor.team.abbreviation,
                    logo: awayCompetitor.team.logo,
                    ...(isPreGame ? {} : { score: isNaN(awayScoreRaw) ? undefined : awayScoreRaw })
                }
            };

            if (isPreGame) {
                try {
                     const fetchInjuries = async (teamId: string, teamAbbr: string) => {
                          const rosterRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${safeLeague}/teams/${teamId}/roster`);
                          if (!rosterRes.ok) return null;
                          const rosterData = await rosterRes.json();
                          const injured: any[] = [];
                          rosterData.athletes.forEach((group: any) => {
                              group.items.forEach((athlete: any) => {
                                  let statusStr = '';
                                  if (athlete.injuries && athlete.injuries.length > 0) {
                                      statusStr = athlete.injuries[0].status || 'Out';
                                  } else if (athlete.status && athlete.status.id !== '1') {
                                      statusStr = athlete.status.name || 'Out';
                                  }
                                  
                                  if (statusStr && !statusStr.toLowerCase().includes('active')) {
                                       injured.push({
                                           id: athlete.id,
                                           name: athlete.fullName,
                                           position: athlete.position?.abbreviation || group.position,
                                           status: statusStr
                                       });
                                  }
                              });
                          });

                          // Only return if there are injured players, and optionally sort or limit if too many, but let's keep it simple for now.
                          if (injured.length > 0) {
                              return {
                                  teamAbbreviation: teamAbbr,
                                  players: injured
                              };
                          }
                          return null;
                     };

                     const [homeInjuries, awayInjuries] = await Promise.all([
                          fetchInjuries(eventData.home_team.id, eventData.home_team.abbreviation),
                          fetchInjuries(eventData.away_team.id, eventData.away_team.abbreviation)
                     ]);

                     const injuries = [];
                     if (homeInjuries) injuries.push(homeInjuries);
                     if (awayInjuries) injuries.push(awayInjuries);

                     if (injuries.length > 0) {
                          eventData.injuries = injuries;
                     }
                } catch (e) {
                    console.log('Error fetching injuries', e);
                }
            }

            return eventData;
        }));

        let leagueContext = undefined;
        if (standingsData && standingsData.children) {
            const searchTeam = team!.toLowerCase();
            let foundTeamEntry: any = null;
            let groupName = '';

            for (const conf of standingsData.children) {
                if (conf.standings && conf.standings.entries) {
                     const match = conf.standings.entries.find((e: any) => 
                         e.team.abbreviation.toLowerCase() === searchTeam || 
                         e.team.name.toLowerCase().includes(searchTeam) ||
                         e.team.displayName.toLowerCase().includes(searchTeam)
                     );
                     if (match) {
                          foundTeamEntry = match;
                          groupName = conf.name;
                          break;
                     }
                }
                
                // Sometimes standings are nested one level deeper (like divisions inside conferences/leagues)
                if (conf.children) {
                     for (const div of conf.children) {
                          if (div.standings && div.standings.entries) {
                              const match = div.standings.entries.find((e: any) => 
                                  e.team.abbreviation.toLowerCase() === searchTeam || 
                                  e.team.name.toLowerCase().includes(searchTeam) ||
                                  e.team.displayName.toLowerCase().includes(searchTeam)
                              );
                              if (match) {
                                   foundTeamEntry = match;
                                   groupName = div.name;
                                   break;
                              }
                          }
                     }
                }
                
                if (foundTeamEntry) break;
            }

            if (foundTeamEntry) {
                 const getStat = (name: string, fallback: string = '-') => {
                     const stat = foundTeamEntry.stats.find((s: any) => s.name === name);
                     return stat ? stat.displayValue : fallback;
                 };

                 leagueContext = {
                     teamAbbreviation: foundTeamEntry.team.abbreviation,
                     groupName: groupName,
                     gamesBack: getStat('gamesBehind'),
                     streak: getStat('streak'),
                     winPercent: getStat('winPercent'),
                     overallRecord: getStat('overall')
                 };
            }
        }

        return {
            id: `evt_${Date.now()}`,
            type: 'SPORTS_ARTIFACT',
            resolution_state: 'LIVE_DATA',
            data: {
                events: parsedEvents,
                league_context: leagueContext
            }
        };

    } catch (e: any) {
        console.error('[SPORTS_HANDLER_ERR]', e);
        return {
            id: `err_${Date.now()}`,
            type: 'SPORTS_ARTIFACT',
            resolution_state: 'GROUNDING_FAULT',
            context_summary: "A connection error occurred while querying the sports data source."
        };
    }
}
