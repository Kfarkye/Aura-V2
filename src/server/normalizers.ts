// ============================================================================
// API-Specific Normalizers (Step 3: Canonical Mapping & Fusion)
// ============================================================================

import { 
    CanonicalEmail, 
    CanonicalCalendarEvent, 
    CanonicalDriveFile, 
    CanonicalTask,
    CanonicalGame,
    CanonicalTeam,
    CanonicalOdds
} from '../types/canonical';
import { resolveTeamAbbreviation } from './entity-resolution';

/**
 * Normalizes Raw Gmail Message JSON to CanonicalEmail
 */
export function normalizeGmailMessage(raw: any): CanonicalEmail {
    const headers: { name: string; value: string }[] = raw.payload?.headers || [];
    const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
    const senderRaw = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
    
    // Parse Sender name and email
    let name = senderRaw;
    let email = senderRaw;
    const match = senderRaw.match(/^(.*?)\s*<(.*?)>$/);
    if (match) {
        name = match[1].trim();
        email = match[2].trim();
    }

    // Attempt to extract body from payload parts
    let body = raw.snippet || '';
    if (raw.payload?.parts) {
        const textPart = raw.payload.parts.find((p: any) => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
        }
    } else if (raw.payload?.body?.data) {
        body = Buffer.from(raw.payload.body.data, 'base64').toString('utf8');
    }

    // Truncate body if excessive
    const maxBodyLen = 800;
    if (body.length > maxBodyLen) {
        body = body.substring(0, maxBodyLen) + '...';
    }

    // Simulated/Deterministic Entity Recognition on body
    const resolvedNames: string[] = [];
    if (body.toLowerCase().includes('aura')) resolvedNames.push('AURA');
    if (body.toLowerCase().includes('gcp') || body.toLowerCase().includes('google cloud')) resolvedNames.push('GCP');
    if (body.toLowerCase().includes('calendar') || body.toLowerCase().includes('schedule')) resolvedNames.push('Google Calendar');

    // Extract basic action items using word patterns (naive deterministic parsing)
    const actionItems: string[] = [];
    const lines = body.split('\n');
    for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('todo') || lower.includes('please') || lower.includes('need to') || lower.includes('action:')) {
            actionItems.push(line.trim());
        }
    }
    if (actionItems.length === 0) {
        actionItems.push("Review thread and follow up if necessary");
    }

    // Determine importance
    let importance: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL';
    const isUrgent = body.toLowerCase().match(/urgent|asap|critical|important|action required/);
    if (isUrgent) importance = 'HIGH';

    const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value;
    const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

    return {
        id: raw.id,
        subject,
        sender: { name, email },
        body: body.trim(),
        receivedAt,
        importance,
        extractedEntities: {
            resolved_names: resolvedNames,
            action_items: actionItems.slice(0, 3)
        }
    };
}

/**
 * Normalizes Raw Calendar Event JSON to CanonicalCalendarEvent
 */
export function normalizeCalendarEvent(raw: any): CanonicalCalendarEvent {
    const attendees = (raw.attendees || []).map((a: any) => a.email).filter(Boolean);
    const summary = raw.summary || '(No Title)';
    const startTime = raw.start?.dateTime || raw.start?.date || new Date().toISOString();
    const endTime = raw.end?.dateTime || raw.end?.date || new Date().toISOString();
    const organizer = raw.organizer?.email || 'unknown@google.com';

    return {
        id: raw.id,
        summary,
        startTime,
        endTime,
        organizer,
        attendees,
        location: raw.location || undefined,
        description: raw.description || undefined
    };
}

/**
 * Normalizes Raw Google Drive File JSON to CanonicalDriveFile
 */
export function normalizeDriveFile(raw: any): CanonicalDriveFile {
    const ownerName = raw.owners && raw.owners.length > 0 ? raw.owners[0].displayName : 'Unknown';
    const lastModifier = raw.lastModifyingUser?.displayName || ownerName;

    return {
        id: raw.id,
        name: raw.name || 'Untitled Document',
        mimeType: raw.mimeType || 'application/octet-stream',
        sizeBytes: parseInt(raw.size, 10) || 0,
        owner: ownerName,
        lastModifiedBy: lastModifier,
        viewUrl: raw.webViewLink || `https://drive.google.com/open?id=${raw.id}`
    };
}

/**
 * Normalizes Raw Google Task JSON to CanonicalTask
 */
export function normalizeTask(raw: any): CanonicalTask {
    return {
        id: raw.id,
        title: raw.title || '(No Title)',
        dueDate: raw.due ? raw.due.split('T')[0] : undefined,
        status: raw.status === 'completed' ? 'COMPLETED' : 'NEEDS_ACTION',
        notes: raw.notes || undefined
    };
}

/**
 * Normalizes Raw ESPN Sports Event to CanonicalGame with Entity Resolution
 */
export function normalizeEspnGame(raw: any): CanonicalGame {
    const homeComp = raw.competitions[0].competitors.find((c: any) => c.homeAway === 'home');
    const awayComp = raw.competitions[0].competitors.find((c: any) => c.homeAway === 'away');

    const rawLeague = raw.competitions[0].lg?.abbreviation || 'nba'; // e.g. "nba"
    const league = rawLeague.toLowerCase() as 'nba' | 'nfl' | 'mlb' | 'nhl';

    // Apply deterministic entity resolution mapping on team names
    const homeAbbr = resolveTeamAbbreviation(homeComp.team.displayName || homeComp.team.name);
    const awayAbbr = resolveTeamAbbreviation(awayComp.team.displayName || awayComp.team.name);

    return {
        id: raw.id,
        league,
        status: raw.competitions[0].status.type.state === 'pre' ? 'scheduled' : 
                raw.competitions[0].status.type.state === 'post' ? 'final' : 'inprogress',
        shortStatus: raw.competitions[0].status.type.shortDetail,
        startTime: raw.date,
        venue: raw.competitions[0].venue?.fullName,
        homeTeam: {
            id: homeComp.team.id,
            name: homeComp.team.displayName,
            abbreviation: homeAbbr,
            logo: homeComp.team.logo
        },
        awayTeam: {
            id: awayComp.team.id,
            name: awayComp.team.displayName,
            abbreviation: awayAbbr,
            logo: awayComp.team.logo
        },
        homeScore: homeComp.score ? parseInt(homeComp.score, 10) : undefined,
        awayScore: awayComp.score ? parseInt(awayComp.score, 10) : undefined
    };
}
