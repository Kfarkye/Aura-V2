// Epistemic States
export type ResolutionState = 
  | 'LIVE_DATA' 
  | 'NO_GAMES_SCHEDULED' 
  | 'OFF_SEASON' 
  | 'GROUNDING_FAULT'
  | 'DEPLOYED'
  | 'PENDING'
  | 'CONVERSATIONAL'
  | 'COLD_STORAGE_DATA'
  | 'HOT_MEMORY_DATA';

export type AuraArtifactType = 
  | 'SPORTS_ARTIFACT' 
  | 'WORK_ARTIFACT' 
  | 'MARKETS_ARTIFACT' 
  | 'SYSTEM_MESSAGE' 
  | 'TRUST_GATE_RECEIPT'
  | 'WAGERING_ARTIFACT'
  | 'WIN_PROBABILITY_ARTIFACT'
  | 'PLAYER_PROP_ARTIFACT'
  | 'GAME_SCHEDULE_ARTIFACT';

// Core Artifact Definition
export interface AuraArtifact {
  id: string;
  type: AuraArtifactType;
  resolution_state: ResolutionState;
  context_summary?: string;
  data?: any; // The immutable payload 
}

export interface WageringOdds {
  provider: string;
  details?: string; // e.g. "NYY -1.5"
  overUnder?: number;
  moneyline?: string;
}

export interface WageringMarketData extends SportsData {
  odds: WageringOdds[];
}

export interface WinProbabilityDataUnit {
  playId: string;
  homeWinPercentage: number;
  awayWinPercentage: number;
  playDescription?: string;
}

export interface WinProbabilityArtifactData {
  gameId: string;
  homeTeam: { name: string; abbreviation: string; color: string; logo: string };
  awayTeam: { name: string; abbreviation: string; color: string; logo: string };
  probabilities: WinProbabilityDataUnit[];
}

export interface PlayerProp {
  playerId: string;
  playerName: string;
  headshot: string;
  teamAbbreviation: string;
  teamColor: string;
  statName: string;      // e.g. "Hits", "Points", "Strikeouts"
  currentValue: number;
  propLine: number;      // e.g. 1.5
  overPrice: string;     // e.g. "MORE"
  underPrice: string;    // e.g. "LESS"
}

export interface PlayerPropArtifactData {
  gameId: string;
  props: PlayerProp[];
}
export interface TeamState {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  score?: number; // Omitted if not numeric/available
}

export interface LeagueContext {
  teamAbbreviation: string;
  groupName: string; // e.g., 'Eastern Conference' or 'American League'
  gamesBack: string | number;
  streak: string;
  winPercent: string;
  overallRecord: string;
  seed?: string | number;
}

export interface InjuredPlayer {
  id: string;
  name: string;
  position: string;
  status: string;
}

export interface TeamInjuries {
  teamAbbreviation: string; // e.g., 'TB'
  players: InjuredPlayer[];
}

export interface SportsData {
  game_id: string;
  status: string; // e.g., 'STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_FINAL'
  short_status?: string; 
  home_team: TeamState;
  away_team: TeamState;
  venue?: string;
  start_time: string;
  injuries?: TeamInjuries[];
}

export interface SportsArtifactData {
  events: SportsData[];
  league_context?: LeagueContext;
}

export interface AuraChatMessage {
  id: string;
  role: 'user' | 'model';
  content?: string;
  artifacts?: AuraArtifact[];
}

export interface AuraHistoryMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AuraChatResponse {
  artifacts: AuraArtifact[];
}
