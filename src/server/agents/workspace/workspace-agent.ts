import { handleWorkspaceQuery, handleScatterGatherQuery, handleWorkspaceMutation } from '../../workspace-handler';
import { AuraAgent, RouteContext, AgentResponse } from '../types';
import { GoogleGenAI } from '@google/genai';

const MODEL = process.env.GEMINI_RESEARCH_MODEL || 'gemini-2.5-flash';

export const workspaceAgent: AuraAgent = {
  id: 'workspace-agent',
  name: 'workspace-agent',

  getRouteConfidence: async (query: string, context?: RouteContext): Promise<number> => {
    const keywords = [
      'email', 'mail', 'gmail', 'calendar', 'meeting', 'schedule', 'drive', 'doc', 
      'tasks', 'to-do', 'agenda', 'scatter-gather', 'briefing', 'inbox', 'appointment',
      'workspace', 'document', 'draft email', 'send email'
    ];
    const queryLower = query.toLowerCase();
    if (keywords.some(k => queryLower.includes(k))) {
      return 0.9;
    }
    return 0.1;
  },

  handle: async (query: string, context?: RouteContext): Promise<AgentResponse> => {
    console.log(`[WORKSPACE-AGENT] Handling query: "${query}"`);
    const accessToken = context?.accessToken;

    if (!accessToken) {
      // Return a sign-in required message if no access token is available
      const artifact = await handleWorkspaceQuery('gmail', undefined, undefined);
      return { success: true, output: artifact };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, output: "GEMINI_API_KEY is required for workspace agent query parsing." };
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      // Use Gemini to classify the workspace intent
      const classificationPrompt = `Analyze the user's workspace query and classify it into one of the following operations:
1. SCATTER_GATHER: If the user wants a general overview of their day, email summary, calendar, and tasks all together (e.g. "summarize my day", "whats on my plate today", "general briefing").
2. QUERY: If the user is querying a specific domain: 'gmail', 'calendar', 'drive', or 'tasks' (e.g. "search my drive for pitch deck", "show recent emails", "get upcoming meetings").
3. MUTATION: If the user is proposing an action/change (e.g. "create a meeting draft with John", "schedule meeting with Mary", "draft a reply to Sarah", "add a task").

Respond in JSON format with the following fields:
{
  "operation": "SCATTER_GATHER" | "QUERY" | "MUTATION",
  "domain": "gmail" | "calendar" | "drive" | "tasks" | null,
  "queryFilter": "string representing the search criteria, email address, or topic to filter by, or null",
  "actionType": "string representing mutation type, like 'draft_email', 'schedule_meeting', 'create_task', or null",
  "payload": "stringified JSON representing the details of the mutation, or null"
}

User Query: "${query}"`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: classificationPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const decisionText = response.text || "{}";
      const decision = JSON.parse(decisionText);
      console.log(`[WORKSPACE-AGENT] Classified workspace intent:`, decision);

      let artifact;
      if (decision.operation === 'SCATTER_GATHER') {
        artifact = await handleScatterGatherQuery(decision.queryFilter || query, accessToken);
      } else if (decision.operation === 'MUTATION') {
        artifact = await handleWorkspaceMutation(
          decision.domain || 'gmail',
          decision.actionType || 'draft_email',
          decision.payload || query,
          accessToken
        );
      } else {
        // Default to QUERY
        artifact = await handleWorkspaceQuery(
          decision.domain || 'gmail',
          decision.queryFilter || undefined,
          accessToken
        );
      }

      return {
        success: true,
        output: artifact
      };

    } catch (error: any) {
      console.error("[WORKSPACE-AGENT] Execution failed:", error);
      // Fallback to basic scatter-gather query
      try {
        const artifact = await handleScatterGatherQuery(query, accessToken);
        return { success: true, output: artifact };
      } catch (innerError: any) {
        return {
          success: false,
          output: `Workspace agent failed to execute query: ${innerError.message}`
        };
      }
    }
  }
};
