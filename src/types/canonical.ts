// ============================================================================
// Canonical Types for Aura Orchestration
// ============================================================================

// --- Workspace Canonical Types ---

export interface CanonicalEmail {
    id: string;
    subject: string;
    sender: {
        name: string;
        email: string;
    };
    body: string;
    receivedAt: string; // ISO 8601 Timestamp
    importance: 'HIGH' | 'NORMAL' | 'LOW';
    extractedEntities: {
        resolved_names: string[];
        action_items: string[];
    };
}

export interface CanonicalCalendarEvent {
    id: string;
    summary: string;
    startTime: string; // ISO 8601 Timestamp
    endTime: string; // ISO 8601 Timestamp
    organizer: string; // Email address
    attendees: string[]; // List of attendee Emails
    location?: string;
    description?: string;
}

export interface CanonicalDriveFile {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    owner: string;
    lastModifiedBy: string;
    viewUrl: string;
}

export interface CanonicalTask {
    id: string;
    title: string;
    dueDate?: string; // YYYY-MM-DD
    status: 'NEEDS_ACTION' | 'COMPLETED';
    notes?: string;
}

// --- Sports Canonical Types ---

export interface CanonicalTeam {
    id: string;
    name: string;
    abbreviation: string; // resolved canonical, e.g., "LAL", "NYY", "OKC", "VGK"
    logo?: string;
}

export interface CanonicalGame {
    id: string;
    league: 'nba' | 'nfl' | 'mlb' | 'nhl';
    status: 'scheduled' | 'inprogress' | 'final';
    shortStatus: string;
    startTime: string; // ISO 8601 or date string
    venue?: string;
    homeTeam: CanonicalTeam;
    awayTeam: CanonicalTeam;
    homeScore?: number;
    awayScore?: number;
}

export interface OddsValue {
    provider: string; // e.g., "DraftKings", "Kalshi"
    line?: string;    // e.g., "+150" or "-110", or "More / Less"
    value?: number | string; // e.g., 48.5 points O/U
}

export interface CanonicalOdds {
    gameId: string;
    homeTeamAbbr: string;
    awayTeamAbbr: string;
    moneylineHome: OddsValue;
    moneylineAway: OddsValue;
    spreadHome?: OddsValue;
    spreadAway?: OddsValue;
    overUnder?: OddsValue;
}
