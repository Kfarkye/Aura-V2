// ============================================================================
// Google Workspace API Fetching & Normalization Handler
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

/**
 * Fetches and normalizes latest emails from Google Gmail API
 */
export async function getGmailEmails(accessToken: string): Promise<CanonicalEmail[]> {
    try {
        console.log('[AURA:WORKSPACE] Fetching Gmail list from Google API...');
        
        // Step 1: List message IDs
        const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!listRes.ok) {
            throw new Error(`Gmail List API returned ${listRes.status} ${listRes.statusText}`);
        }

        const listData = await listRes.json();
        const messages = listData.messages || [];

        if (messages.length === 0) {
            return [];
        }

        // Step 2: Fetch individual message details in parallel
        const canonicalEmails = await Promise.all(
            messages.map(async (msg: any) => {
                try {
                    const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (!detailRes.ok) return null;
                    const rawMsg = await detailRes.json();
                    return normalizeGmailMessage(rawMsg);
                } catch (err) {
                    console.error(`Error fetching detail for message ${msg.id}:`, err);
                    return null;
                }
            })
        );

        return canonicalEmails.filter((email): email is CanonicalEmail => email !== null);
    } catch (error: any) {
        console.error('[AURA:WORKSPACE_ERR] Gmail Integration Fault:', error.message);
        throw error;
    }
}

/**
 * Searches and retrieves a detailed raw Gmail message matching keyword query via full RFC2822 format
 */
export async function getGmailMimeDetails(accessToken: string, query?: string): Promise<any> {
    try {
        console.log(`[AURA:WORKSPACE] Searching Gmail messages for query: ${query}...`);
        
        let url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1';
        if (query) {
            url += `&q=${encodeURIComponent(query)}`;
        }
        
        const listRes = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!listRes.ok) {
            throw new Error(`Gmail Search API returned ${listRes.status} ${listRes.statusText}`);
        }

        const listData = await listRes.json();
        const messages = listData.messages || [];

        if (messages.length === 0) {
            return null;
        }

        const msgId = messages[0].id;
        console.log(`[AURA:WORKSPACE] Fetching detailed email payload for ID: ${msgId}`);
        
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!detailRes.ok) {
            throw new Error(`Gmail Detail API returned ${detailRes.status} ${detailRes.statusText}`);
        }
        
        const rawMsg = await detailRes.json();
        return rawMsg;
    } catch (err: any) {
        console.error('[AURA:WORKSPACE] getGmailMimeDetails failure:', err);
        return null;
    }
}

/**
 * Parses raw Gmail message payload into canonical MIME tree and header collection
 */
export function parseRawGmailToMimeData(rawMsg: any): any {
    if (!rawMsg) return null;
    
    const headers: any[] = rawMsg.payload?.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    
    // Parse From Header: "Name" <email@domain.com>
    const fromVal = getHeader('from');
    let senderName = 'Unknown Sender';
    let senderEmail = 'unknown@domain.com';
    const fromMatch = fromVal.match(/^(?:"?([^"]*)"?\s)?(?:<(.+)>)$/);
    if (fromMatch) {
        senderName = fromMatch[1] || 'Unknown Sender';
        senderEmail = fromMatch[2];
    } else if (fromVal.includes('@')) {
        senderName = fromVal.split('<')[0]?.trim() || fromVal;
        senderEmail = (fromVal.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/) || [])[0] || fromVal;
    }
    
    const subject = getHeader('subject') || 'No Subject';
    const recipient = getHeader('to') || 'recipient@domain.com';
    const internalDate = rawMsg.internalDate ? new Date(parseInt(rawMsg.internalDate)).toISOString() : new Date().toISOString();
    const mimeVersion = getHeader('mime-version') || '1.0';
    const contentType = getHeader('content-type') || 'text/html';
    
    // Determine security SPF/DKIM/DMARC from authentication-results
    const authHeaders = headers.filter(h => h.name.toLowerCase().includes('auth') || h.name.toLowerCase().includes('arc-auth') || h.name.toLowerCase().includes('received-spf'));
    const authResultsStr = authHeaders.map(h => h.value).join(' ');
    
    const spf = authResultsStr.toLowerCase().includes('spf=pass') ? 'pass' : (authResultsStr.toLowerCase().includes('spf=fail') ? 'fail' : 'pass');
    const dkimVal = authResultsStr.toLowerCase().includes('dkim=pass') ? 'pass' : (authResultsStr.toLowerCase().includes('dkim=fail') ? 'fail' : 'pass');
    const dmarc = authResultsStr.toLowerCase().includes('dmarc=pass') ? 'pass' : (authResultsStr.toLowerCase().includes('dmarc=fail') ? 'fail' : 'pass');
    
    // Map headers array
    const mappedHeaders = headers.map(h => {
        let category: 'Security' | 'Routing' | 'Identity' | 'Other' = 'Other';
        const nameLow = h.name.toLowerCase();
        if (nameLow.includes('auth') || nameLow.includes('dkim') || nameLow.includes('spf') || nameLow.includes('dmarc') || nameLow.includes('received-spf') || nameLow.includes('arc-')) {
            category = 'Security';
        } else if (nameLow.includes('received') || nameLow.includes('delivered-to') || nameLow.includes('return-path') || nameLow.includes('date')) {
            category = 'Routing';
        } else if (nameLow === 'from' || nameLow === 'to' || nameLow === 'subject' || nameLow === 'message-id' || nameLow === 'cc' || nameLow === 'bcc') {
            category = 'Identity';
        }
        return { name: h.name, value: h.value, category };
    });
    
    // Helper to map and nest payload parts recursively
    const mapPart = (part: any): any => {
        const pMime = part.mimeType || 'unknown';
        const pHeaders: any[] = part.headers || [];
        const getPHeader = (n: string) => pHeaders.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
        
        const filename = part.filename || '';
        const name = filename || getPHeader('content-type')?.match(/name="?([^"\s;]+)"?/)?.[1] || pMime.split('/')[1] || 'part';
        const sizeByte = part.body?.size || 0;
        const size = `${(sizeByte / 1024).toFixed(1)} KB`;
        const id = part.partId || `part-${Math.random().toString(36).substr(2, 9)}`;
        const encoding = getPHeader('content-transfer-encoding') || '7bit';
        const disposition = getPHeader('content-disposition') || 'inline';
        const cid = getPHeader('content-id') || undefined;
        
        let contentSample = '';
        if (part.body?.data) {
            try {
                const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                contentSample = Buffer.from(base64, 'base64').toString('utf-8');
            } catch {
                contentSample = '[Binary Stream]';
            }
        }
        
        // Generate hex sequence sample
        let hexSample = '00 00 00 ...';
        if (part.body?.data) {
            try {
                const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                const buf = Buffer.from(base64, 'base64');
                const hexArr = [];
                const len = Math.min(buf.length, 16);
                for (let i = 0; i < len; i++) {
                    hexArr.push(buf[i].toString(16).padStart(2, '0'));
                }
                hexSample = hexArr.join(' ');
                if (buf.length > 16) hexSample += ' ...';
            } catch {}
        }
        
        const returnObj: any = {
            id,
            name,
            mimeType: pMime,
            size,
            encoding,
            disposition,
            cid,
            contentSample,
            hexSample
        };
        
        if (part.parts && part.parts.length > 0) {
            returnObj.children = part.parts.map((p: any) => mapPart(p));
        }
        
        return returnObj;
    };
    
    // Build recursive MIMETree
    const mimeTree = mapPart(rawMsg.payload);
    
    // Extract HTML or Text Body
    const extractBody = (part: any): string => {
        if (part.mimeType === 'text/html' && part.body?.data) {
            try {
                const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                return Buffer.from(base64, 'base64').toString('utf-8');
            } catch {
                return '';
            }
        }
        if (part.mimeType === 'text/plain' && part.body?.data) {
            try {
                const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                const text = Buffer.from(base64, 'base64').toString('utf-8');
                return `<pre style="white-space: pre-wrap; font-family: monospace; color: #fff;">${text}</pre>`;
            } catch {
                return '';
            }
        }
        if (part.parts) {
            for (const sub of part.parts) {
                const html = extractBody(sub);
                if (html) return html;
            }
        }
        
        // Final fallback: just stringify the part
        if (part.body?.data) {
             try {
                const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                const text = Buffer.from(base64, 'base64').toString('utf-8');
                return `<pre style="white-space: pre-wrap; font-family: monospace; color: #fff; padding: 20px;">${text}</pre>`;
             } catch {}
        }
        return '';
    };
    
    const parsedHtmlRaw = extractBody(rawMsg.payload);
    
    return {
        id: rawMsg.id,
        subject,
        sender: { name: senderName, email: senderEmail },
        recipient,
        receivedAt: internalDate,
        mimeVersion,
        contentType,
        spf,
        dkim: dkimVal,
        dmarc,
        headers: mappedHeaders,
        mimeTree,
        parsedHtml: parsedHtmlRaw
    };
}

/**
 * Fetches and normalizes upcoming events from Google Calendar API
 */
export async function getCalendarEvents(accessToken: string): Promise<CanonicalCalendarEvent[]> {
    try {
        console.log('[AURA:WORKSPACE] Fetching Google Calendar events list...');
        const timeMin = new Date().toISOString();
        
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=8&timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!res.ok) {
            throw new Error(`Calendar API returned ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        const rawEvents = data.items || [];
        return rawEvents.map(normalizeCalendarEvent);
    } catch (error: any) {
        console.error('[AURA:WORKSPACE_ERR] Calendar Integration Fault:', error.message);
        throw error;
    }
}

/**
 * Fetches and normalizes files from Google Drive API
 */
export async function getDriveFiles(accessToken: string): Promise<CanonicalDriveFile[]> {
    try {
        console.log('[AURA:WORKSPACE] Fetching Google Drive files list...');
        const fields = 'files(id,name,mimeType,size,owners,lastModifyingUser,webViewLink)';
        const url = `https://www.googleapis.com/drive/v3/files?pageSize=10&fields=${encodeURIComponent(fields)}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!res.ok) {
            throw new Error(`Drive API returned ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        const rawFiles = data.files || [];
        return rawFiles.map(normalizeDriveFile);
    } catch (error: any) {
        console.error('[AURA:WORKSPACE_ERR] Drive Integration Fault:', error.message);
        throw error;
    }
}

/**
 * Fetches and normalizes tasks from Google Tasks API
 */
export async function getGoogleTasks(accessToken: string): Promise<CanonicalTask[]> {
    try {
        console.log('[AURA:WORKSPACE] Fetching Google Tasks lists...');
        
        // Step 1: Fetch list of task lists
        const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!listRes.ok) {
            throw new Error(`Tasks Lists API returned ${listRes.status} ${listRes.statusText}`);
        }

        const listsData = await listRes.json();
        const lists = listsData.items || [];

        if (lists.length === 0) {
            return [];
        }

        // Use primary list (usually first list)
        const primaryListId = lists[0].id;
        console.log(`[AURA:WORKSPACE] Using task list: ${primaryListId}`);

        // Step 2: Fetch tasks within that primary task list
        const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${primaryListId}/tasks?maxResults=10`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!tasksRes.ok) {
            throw new Error(`Tasks Content API returned ${tasksRes.status} ${tasksRes.statusText}`);
        }

        const tasksData = await tasksRes.json();
        const rawTasks = tasksData.items || [];
        return rawTasks.map(normalizeTask);
    } catch (error: any) {
        console.error('[AURA:WORKSPACE_ERR] Google Tasks Integration Fault:', error.message);
        throw error;
    }
}

import { AuraArtifact } from '../types/aura';

/**
 * Handles LLM incoming workspace queries, resolves APIs if accessToken is present,
 * or drops back to high-fidelity, descriptive sandbox preview.
 */
export async function handleWorkspaceQuery(domain: string, queryFilter?: string, accessToken?: string): Promise<AuraArtifact> {
    const safeDomain = domain?.toLowerCase().trim();
    const isLive = !!accessToken;
    
    if (!isLive) {
        return {
            id: `work_unauth_${Date.now()}`,
            type: 'WORK_ARTIFACT',
            resolution_state: 'CONVERSATIONAL',
            context_summary: `### 🔒 Google Workspace Authorization Required\n\nTo view and query your live workspace data (Gmail, Calendar, Drive, and Tasks) on the Aura platform, please authenticate using the **Workspace Sign-In** button on the interface.\n\n*Aura adheres to absolute strict zero-simulation standards: no simulated details, mock lists, or synthetic mock records will be compiled in an offline or unauthenticated context.*`
        };
    }

    try {
        console.log(`[AURA:MAIN_ROUTER] Executing LIVE Google Workspace Fetch on Domain: ${safeDomain}...`);
        if (safeDomain === 'gmail') {
            const isSpecificSearch = !!queryFilter;

            if (isSpecificSearch) {
                const rawEmail = await getGmailMimeDetails(accessToken!, queryFilter);
                if (rawEmail) {
                    const parsedData = parseRawGmailToMimeData(rawEmail);
                    return {
                        id: `work_email_mime_${Date.now()}`,
                        type: 'EMAIL_MIME_ARTIFACT' as any,
                        resolution_state: 'LIVE_DATA',
                        context_summary: `### 🎯 Gmail Detailed Message View\n\nI have retrieved the specific Gmail message matching your filter **"${queryFilter}"** and parsed its transfer envelope. You can inspect its structure and live content via the interactive tabs.`,
                        data: parsedData
                    };
                } else {
                    return {
                        id: `work_email_mime_not_found_${Date.now()}`,
                        type: 'WORK_ARTIFACT',
                        resolution_state: 'CONVERSATIONAL',
                        context_summary: `### ❌ No Matching Emails Found\n\nNo Gmail messages matching **"${queryFilter}"** were identified in your primary mailbox. Please verify the keyword or sender query.`
                    };
                }
            }

            const emails = await getGmailEmails(accessToken!);
            return {
                id: `work_gmail_${Date.now()}`,
                type: 'WORK_ARTIFACT',
                resolution_state: 'LIVE_DATA',
                context_summary: `### 🎯 Gmail Live Inbox Scan\n\nI have successfully pulled and mapped your live Gmail workspace emails using our secure **Canonical Normalizer Layer**:\n\n` + 
                  (emails.map(e => `* **${e.sender.name}** (${e.sender.email}) - *${e.subject}* (${new Date(e.receivedAt).toLocaleDateString()})\n\n  *Action Items:* ${e.extractedEntities.action_items.join(', ') || 'No immediate action items identified.'}`).join('\n\n') || "No recent messages found in your primary inbox.")
            };
        } else if (safeDomain === 'calendar') {
            const events = await getCalendarEvents(accessToken!);
            return {
                id: `work_cal_${Date.now()}`,
                type: 'WORK_ARTIFACT',
                resolution_state: 'LIVE_DATA',
                context_summary: `### 🎯 Google Calendar Live Availability\n\nI have retrieved your immediate upcoming schedule from Google Calendar:\n\n` +
                  (events.map(ev => `* **${ev.summary}**\n\n  *Schedule:* ${new Date(ev.startTime).toLocaleTimeString()} - ${new Date(ev.endTime).toLocaleTimeString()} (${new Date(ev.startTime).toLocaleDateString()})\n\n  *Attendees:* ${ev.attendees.slice(0, 3).join(', ') || 'No other attendees listed.'}`).join('\n\n') || "No upcoming meetings found in your calendar for this week.")
            };
        } else if (safeDomain === 'drive') {
            const files = await getDriveFiles(accessToken!);
            return {
                id: `work_drive_${Date.now()}`,
                type: 'WORK_ARTIFACT',
                resolution_state: 'LIVE_DATA',
                context_summary: `### 🎯 Google Drive Directory View\n\nRetrieved your top primary collaboration assets directly from Google Drive:\n\n` +
                  (files.map(f => `* **${f.name}** (${(f.sizeBytes / (1024 * 1024)).toFixed(2)} MB)\n\n  *Owner:* ${f.owner} | *Last Modified By:* ${f.lastModifiedBy}\n\n  *Access URL:* [Open File](${f.viewUrl})`).join('\n\n') || "No documents were found in your primary workspace folder.")
            };
        } else if (safeDomain === 'tasks') {
            const tasks = await getGoogleTasks(accessToken!);
            return {
                id: `work_tasks_${Date.now()}`,
                type: 'WORK_ARTIFACT',
                resolution_state: 'LIVE_DATA',
                context_summary: `### 🎯 Google Tasks Live Agenda\n\nSuccessfully retrieved progress items directly from your primary Task list:\n\n` +
                  (tasks.map(t => `* [${t.status === 'COMPLETED' ? '✔' : ' '}] **${t.title}** ${t.dueDate ? `(Due: ${t.dueDate})` : ''}\n\n  *Description:* ${t.notes || 'No description notes provided.'}`).join('\n\n') || "You have zero outstanding tasks on your list.")
            };
        } else {
            return {
                id: `work_unknown_domain_${Date.now()}`,
                type: 'WORK_ARTIFACT',
                resolution_state: 'CONVERSATIONAL',
                context_summary: `### ⚠️ Domain Not Supported\n\nWorkspace domain **"${domain}"** is not currently mapped in our normalizer library. Available domains include Gmail, calendar, drive, and tasks.`
            };
        }
    } catch (realApiErr: any) {
        console.error(`[AURA:WORKSPACE_RESOLVER_FAULT] Live fetch failed:`, realApiErr);
        return {
            id: `work_error_${Date.now()}`,
            type: 'WORK_ARTIFACT',
            resolution_state: 'CONVERSATIONAL',
            context_summary: `### ❌ Google Workspace Integration Failure\n\nAn error occurred while communicating with the Google Workspace APIs on domain **"${domain}"**:\n\n* **Error Message:** ${realApiErr.message || 'Unknown integration channel breach'}\n* **Code:** ${realApiErr.status || realApiErr.code || 'API_CONN_ERR'}\n\nPlease verify that your login session has not expired and your credentials authorize this workspace access.`
        };
    }
}

