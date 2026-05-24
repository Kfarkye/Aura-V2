// ============================================================================
// Deterministic Entity Resolution Service
// ============================================================================

const TEAM_NAME_RESOLUTION_MAP: Record<string, string> = {
    // NBA
    'los angeles lakers': 'LAL',
    'la lakers': 'LAL',
    'lakers': 'LAL',
    'lal': 'LAL',
    'new york knicks': 'NYK',
    'knicks': 'NYK',
    'nyk': 'NYK',
    'oklahoma city thunder': 'OKC',
    'okc thunder': 'OKC',
    'thunder': 'OKC',
    'okc': 'OKC',
    'golden state warriors': 'GSW',
    'warriors': 'GSW',
    'gsw': 'GSW',
    'boston celtics': 'BOS',
    'celtics': 'BOS',
    'bos': 'BOS',

    // MLB
    'new york yankees': 'NYY',
    'ny yankees': 'NYY',
    'yankees': 'NYY',
    'nyy': 'NYY',
    'boston red sox': 'BOS',
    'red sox': 'BOS',
    'los angeles dodgers': 'LAD',
    'dodgers': 'LAD',
    'lad': 'LAD',
    'san francisco giants': 'SF',
    'giants': 'SF',

    // NFL
    'kansas city chiefs': 'KC',
    'chiefs': 'KC',
    'kc': 'KC',
    'san francisco 49ers': 'SF',
    '49ers': 'SF',
    'niners': 'SF',
    'dallas cowboys': 'DAL',
    'cowboys': 'DAL',
    'dal': 'DAL',
    'philadelphia eagles': 'PHI',
    'eagles': 'PHI',
    'phi': 'PHI',

    // NHL
    'vegas golden knights': 'VGK',
    'golden knights': 'VGK',
    'vegas': 'VGK',
    'vgk': 'VGK',
    'new york rangers': 'NYR',
    'rangers': 'NYR',
    'nyr': 'NYR',
    'edmonton oilers': 'EDM',
    'oilers': 'EDM',
    'edm': 'EDM'
};

/**
 * Deterministically resolves arbitrary team name or abbreviation to Canonical Abbreviation.
 * Returns the uppercase raw input if no mapping is found to gracefully degrade.
 */
export function resolveTeamAbbreviation(inputNameOrAbbr: string): string {
    if (!inputNameOrAbbr) return '';
    const lookup = inputNameOrAbbr.trim().toLowerCase();
    
    // Exact mapping check
    if (TEAM_NAME_RESOLUTION_MAP[lookup]) {
        return TEAM_NAME_RESOLUTION_MAP[lookup];
    }

    // Keyword containment fallback matching
    for (const [key, val] of Object.entries(TEAM_NAME_RESOLUTION_MAP)) {
        if (lookup.includes(key) || key.includes(lookup)) {
            return val;
        }
    }

    return inputNameOrAbbr.toUpperCase();
}
