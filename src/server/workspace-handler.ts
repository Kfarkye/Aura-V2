// ============================================================================
// Google Workspace API Fetching & Clean Normalization
// ============================================================================

import { 
    normalizeGmailMessage, 
    normalizeCalendarEvent, 
    normalizeDriveFile, 
    normalizeTask 
} from './normalizers';

import { 
    CanonicalEmail, 
    CanonicalCalendarEvent, 
    CanonicalDriveFile, 
    CanonicalTask 
} from '../types/canonical';

import { AuraArtifact } from '../types/aura';

const LOG_PREFIX = '[WORKSPACE:INFO]';
const NETWORK_LIMIT_MS = 6000;
const WORKSPACE_MUTATION_KEYWORDS = [
    'create',
    'update',
    'delete',
    'write',
    'mutate',
    'modify',
    'insert',
    'patch',
    'send',
    'compose',
    'draft',
    'messages.send',
    'drafts.create',
    'events.insert',
    'events.update',
    'events.patch',
    'tasks.insert',
    'tasks.update',
    'files.create',
    'files.update'
];

// ============================================================================
// 1. Connection and String Helpers
// ============================================================================

/**
 * Runs a query with a 6-second max limit so requests do not freeze.
 */
async function fetchWithTimeout(url: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), NETWORK_LIMIT_MS);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Google API returned error status: ${response.status} ${response.statusText}`);
        }
        return response;
    } finally {
        clearTimeout(timerId);
    }
}

/**
 * Reads Base64 strings safely even when formatted with web url characters.
 */
function decodeUrlSafeBase64(data?: string | null): string {
    if (!data) return '';
    try {
        const standardBase64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(standardBase64, 'base64').toString('utf-8');
    } catch {
        return '[Unable to read text structure]';
    }
}

function stringHasWorkspaceMutationIntent(value: string): boolean {
    const normalized = value.toLowerCase();
    return WORKSPACE_MUTATION_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function containsWorkspaceMutationIntent(input: unknown): boolean {
    if (!input) return false;
    if (typeof input === 'string') return stringHasWorkspaceMutationIntent(input);
    if (typeof input === 'number' || typeof input === 'boolean') return false;
    if (Array.isArray(input)) return input.some((item) => containsWorkspaceMutationIntent(item));
    if (typeof input === 'object') {
        return Object.entries(input as Record<string, unknown>).some(([key, value]) => {
            if (stringHasWorkspaceMutationIntent(key)) return true;
            return containsWorkspaceMutationIntent(value);
        });
    }
    return false;
}

// ============================================================================
// 2. Main API Queries
// ============================================================================

export async function getGmailEmails(accessToken: string): Promise<CanonicalEmail[]> {
    console.log(`${LOG_PREFIX} Loading latest emails...`);
    const listRes = await fetchWithTimeout('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', accessToken);
    const listData = await listRes.json();
    
    if (!listData.messages || listData.messages.length === 0) return [];

    // Use allSettled so one broken details block doesn't crash the whole run
    const results = await Promise.allSettled(
        listData.messages.map(async (msg: any) => {
            const detailRes = await fetchWithTimeout(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, accessToken);
            const rawMsg = await detailRes.json();
            return normalizeGmailMessage(rawMsg);
        })
    );

    return results
        .filter((result): result is PromiseFulfilledResult<CanonicalEmail | null> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter((email): email is CanonicalEmail => email !== null);
}

export async function getGmailMimeDetails(accessToken: string, query?: string): Promise<Record<string, any> | null> {
    console.log(`${LOG_PREFIX} Searching emails for keyword: ${query}...`);
    
    let url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1';
    if (query) url += `&q=${encodeURIComponent(query)}`;
    
    const listRes = await fetchWithTimeout(url, accessToken);
    const listData = await listRes.json();
    
    if (!listData.messages || listData.messages.length === 0) return null;

    const msgId = listData.messages[0].id;
    const detailRes = await fetchWithTimeout(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`, accessToken);
    
    return await detailRes.json();
}

export async function getCalendarEvents(accessToken: string): Promise<CanonicalCalendarEvent[]> {
    console.log(`${LOG_PREFIX} Loading calendar entries...`);
    const timeMin = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=8&timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`;
    
    const res = await fetchWithTimeout(url, accessToken);
    const data = await res.json();
    
    return (data.items || []).map(normalizeCalendarEvent).filter(Boolean) as CanonicalCalendarEvent[];
}

export async function getDriveFiles(accessToken: string): Promise<CanonicalDriveFile[]> {
    console.log(`${LOG_PREFIX} Loading drive documents...`);
    const fields = 'files(id,name,mimeType,size,owners,lastModifyingUser,webViewLink)';
    const url = `https://www.googleapis.com/drive/v3/files?pageSize=10&fields=${encodeURIComponent(fields)}`;
    
    const res = await fetchWithTimeout(url, accessToken);
    const data = await res.json();
    
    return (data.files || []).map(normalizeDriveFile).filter(Boolean) as CanonicalDriveFile[];
}

export async function getGoogleTasks(accessToken: string): Promise<CanonicalTask[]> {
    console.log(`${LOG_PREFIX} Loading actions and tasks list...`);
    
    const listRes = await fetchWithTimeout('https://tasks.googleapis.com/tasks/v1/users/@me/lists', accessToken);
    const listsData = await listRes.json();
    
    if (!listsData.items || listsData.items.length === 0) return [];
    
    const primaryListId = listsData.items[0].id;
    const tasksRes = await fetchWithTimeout(`https://tasks.googleapis.com/tasks/v1/lists/${primaryListId}/tasks?maxResults=10`, accessToken);
    const tasksData = await tasksRes.json();
    
    return (tasksData.items || []).map(normalizeTask).filter(Boolean) as CanonicalTask[];
}

// ============================================================================
// 3. Email Layout Parser
// ============================================================================

export function parseRawGmailToMimeData(rawMsg: any): Record<string, any> | null {
    if (!rawMsg || !rawMsg.payload) return null;
    
    const headers: any[] = rawMsg.payload.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    
    // Normal sender identifier extraction
    const fromVal = getHeader('from');
    let senderName = 'Sender';
    let senderEmail = 'email@domain.com';
    const fromMatch = fromVal.match(/^(?:"?([^"]*)"?\s)?(?:<(.+)>)$/);
    if (fromMatch) {
         senderName = fromMatch[1] || senderEmail;
         senderEmail = fromMatch[2];
    } else if (fromVal.includes('@')) {
         senderName = fromVal.split('<')[0]?.trim() || fromVal;
         senderEmail = (fromVal.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/) || [])[0] || fromVal;
    }
    
    // Safety verification check states (SPF, DKIM, DMARC)
    const authHeaders = headers.filter((h: any) => /auth|arc-auth|received-spf/i.test(h.name));
    const authResultsStr = authHeaders.map((h: any) => h.value).join(' ').toLowerCase();
    
    const resolveStatus = (key: string) => authResultsStr.includes(`${key}=pass`) ? 'pass' : authResultsStr.includes(`${key}=fail`) ? 'fail' : 'none';
    const spf = resolveStatus('spf');
    const dkim = resolveStatus('dkim');
    const dmarc = resolveStatus('dmarc');
    
    const mappedHeaders = headers.map((h: any) => {
        let category: 'Security' | 'Routing' | 'Identity' | 'Other' = 'Other';
        const nameLow = h.name.toLowerCase();
        if (/auth|dkim|spf|dmarc|arc-/i.test(nameLow)) category = 'Security';
        else if (/received|delivered-to|return-path|date/i.test(nameLow)) category = 'Routing';
        else if (/from|to|subject|message-id|cc|bcc/i.test(nameLow)) category = 'Identity';
        return { name: h.name, value: h.value, category };
    });
    
    // Reads out structural sections and attachment logs recursively
    const mapPart = (part: any): any => {
        const pMime = part.mimeType || 'application/octet-stream';
        const pHeaders: any[] = part.headers || [];
        const getPHeader = (n: string) => pHeaders.find((h: any) => h.name.toLowerCase() === n.toLowerCase())?.value || '';
        
        const sizeByte = part.body?.size || 0;
        let contentSample = '';
        let hexSample = '00 00 00 00';

        if (part.body?.data) {
             contentSample = decodeUrlSafeBase64(part.body.data);
             try {
                 const buf = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
                 const hexArr = [];
                 const len = Math.min(buf.length, 16);
                 for (let i = 0; i < len; i++) {
                     hexArr.push(buf[i].toString(16).padStart(2, '0'));
                 }
                 hexSample = hexArr.join(' ') + (buf.length > 16 ? ' ...' : '');
             } catch {
                 hexSample = '[Skipped Binary]';
             }
        }
        
        const returnObj: any = {
            id: part.partId || `part_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            name: part.filename || getPHeader('content-type')?.match(/name="?([^"\s;]+)"?/)?.[1] || pMime.split('/')[1] || 'part',
            mimeType: pMime,
            size: `${(sizeByte / 1024).toFixed(2)} KB`,
            encoding: getPHeader('content-transfer-encoding') || '7bit',
            disposition: getPHeader('content-disposition') || 'inline',
            cid: getPHeader('content-id') || 'none',
            contentSample: contentSample.substring(0, 1000),
            hexSample
        };
        
        if (part.parts && Array.isArray(part.parts)) {
            returnObj.children = part.parts.map(mapPart);
        }
        
        return returnObj;
    };
    
    const extractHtmlBody = (part: any): string => {
        if (part.mimeType === 'text/html' && part.body?.data) return decodeUrlSafeBase64(part.body.data);
        if (part.mimeType === 'text/plain' && part.body?.data) return `<pre style="white-space:pre-wrap;font-family:monospace;color:#e5e5e5;font-size:13px;">${decodeUrlSafeBase64(part.body.data)}</pre>`;
        if (part.parts) {
             for (const sub of part.parts) {
                 const html = extractHtmlBody(sub);
                 if (html) return html;
             }
        }
        return '';
    };
    
    return {
        id: rawMsg.id,
        subject: getHeader('subject') || 'Untitled Message',
        sender: { name: senderName, email: senderEmail },
        recipient: getHeader('to') || 'unknown',
        receivedAt: rawMsg.internalDate ? new Date(parseInt(rawMsg.internalDate, 10)).toISOString() : new Date().toISOString(),
        mimeVersion: getHeader('mime-version') || '1.0',
        contentType: getHeader('content-type') || 'text/html',
        spf, dkim, dmarc,
        headers: mappedHeaders,
        mimeTree: mapPart(rawMsg.payload),
        parsedHtml: extractHtmlBody(rawMsg.payload) || decodeUrlSafeBase64(rawMsg.payload.body?.data)
    };
}

// ============================================================================
// 4. Main Query routing
// ============================================================================

export async function handleWorkspaceQuery(domain: string, queryFilter?: string, accessToken?: string): Promise<AuraArtifact> {
    const safeDomain = domain?.toLowerCase().trim();
    
    if (!accessToken) {
        return {
             id: `work_unauth_${Date.now()}`,
             type: 'WORK_ARTIFACT',
             resolution_state: 'CONVERSATIONAL',
             context_summary: `### 🔒 Sign-In Required\n\nTo view and query live message entries and records, please sign in using the **Connect** button above.\n\n*Aura adheres to simple zero-simulation standards: no fake items or synthetic mock entries will be generated while unauthenticated.*`
        };
    }

    if (containsWorkspaceMutationIntent(queryFilter || '')) {
        return {
             id: `work_write_block_${Date.now()}`,
             type: 'WORK_ARTIFACT',
             resolution_state: 'GROUNDING_FAULT',
             context_summary: `### 🔐 Workspace Write Blocked\n\nWorkspace write/mutate actions are disabled in this environment. Read-only retrieval remains available.`
        };
    }

    try {
        console.log(`${LOG_PREFIX} Searching Domain [${safeDomain}]...`);
        
        if (safeDomain === 'gmail') {
             if (queryFilter) {
                 const rawEmail = await getGmailMimeDetails(accessToken, queryFilter);
                 if (rawEmail) {
                     return {
                          id: `mime_${Date.now()}`,
                          type: 'EMAIL_MIME_ARTIFACT',
                          resolution_state: 'LIVE_DATA',
                          context_summary: `### 📩 Email Details\n\nSuccessfully retrieved the email matching search criteria: **"${queryFilter}"**. Check the sections below to read parsed headers and content.`,
                          data: parseRawGmailToMimeData(rawEmail)
                     };
                 }
                 return {
                      id: `err_not_found_${Date.now()}`,
                      type: 'WORK_ARTIFACT',
                      resolution_state: 'CONVERSATIONAL',
                      context_summary: `### ⚠️ No Results\n\nNo emails matching keyword **"${queryFilter}"** found in your inbox.`
                 };
             }

             const emails = await getGmailEmails(accessToken);
             return {
                  id: `gmail_${Date.now()}`,
                  type: 'WORK_ARTIFACT',
                  resolution_state: 'LIVE_DATA',
                  context_summary: `### 📨 Recent Emails\n\nLatest messages from your mailbox:\n\n` + 
                    (emails.map(e => `**${e.sender.name}**\n\`${e.subject}\`\n*Action:* ${e.extractedEntities.action_items[0] || 'None'}`).join('\n\n---\n\n') || "No recent emails found.")
             };
             
        } else if (safeDomain === 'calendar') {
             const events = await getCalendarEvents(accessToken);
             return {
                  id: `cal_${Date.now()}`,
                  type: 'WORK_ARTIFACT',
                  resolution_state: 'LIVE_DATA',
                  context_summary: `### 📅 Upcoming Events\n\nYour immediate schedules and meetings:\n\n` +
                    (events.map(ev => `**${ev.summary}**\n\`${new Date(ev.startTime).toLocaleString([], {weekday:'short', hour:'numeric', minute:'2-digit'})}\` | ${ev.attendees.length} participants\n*Status: ${ev.status}*`).join('\n\n---\n\n') || "No scheduled meetings found.")
             };
             
        } else if (safeDomain === 'drive') {
             const files = await getDriveFiles(accessToken);
             return {
                  id: `drive_${Date.now()}`,
                  type: 'WORK_ARTIFACT',
                  resolution_state: 'LIVE_DATA',
                  context_summary: `### 🗄️ Recent Drive Files\n\nRecently edited files and items in your storage:\n\n` +
                    (files.map(f => `**[${f.name}](${f.viewUrl})**\n\`Size: ${(f.sizeBytes / 1048576).toFixed(2)} MB\` | \`Owner: ${f.owner}\``).join('\n\n') || "No files found in storage.")
             };
             
        } else if (safeDomain === 'tasks') {
             const tasks = await getGoogleTasks(accessToken);
             return {
                  id: `tasks_${Date.now()}`,
                  type: 'WORK_ARTIFACT',
                  resolution_state: 'LIVE_DATA',
                  context_summary: `### ☑️ Google Tasks\n\nCurrent task list of action items:\n\n` +
                    (tasks.map(t => `* ${t.status === 'COMPLETED' ? '~~' : ''}**${t.title}**${t.status === 'COMPLETED' ? '~~' : ''} ${t.dueDate ? `\`Due: ${t.dueDate}\`` : ''}`).join('\n\n') || "No tasks active.")
             };
             
        } else {
             return {
                  id: `err_domain_${Date.now()}`,
                  type: 'WORK_ARTIFACT',
                  resolution_state: 'GROUNDING_FAULT',
                  context_summary: `### ⚠️ Configuration Error\n\nSelected tab domain **"${domain}"** is not supported in the workspace tool.`
             };
        }
        
    } catch (err: any) {
         console.error(`${LOG_PREFIX} Loading error:`, err);
         return {
              id: `err_fatal_${Date.now()}`,
              type: 'WORK_ARTIFACT',
              resolution_state: 'GROUNDING_FAULT',
              context_summary: `### ❌ Connection Error\n\nCould not fetch workspace data from Google APIs.\n\n\`\`\`bash\nError: ${err.message}\n\`\`\``
         };
    }
}
