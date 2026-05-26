import { GoogleGenAI } from '@google/genai';
import { AuraAgent, RouteContext, AgentResponse } from '../types';

export class GeneralAgent implements AuraAgent {
  public readonly id = 'general-agent';
  public readonly name = 'general-agent';

  public async getRouteConfidence(query: string, context?: RouteContext): Promise<number> {
    // General agent is the fallback, so confidence is typically baseline unless explicitly requested
    return 0.1;
  }

  public async execute(query: string, context?: RouteContext): Promise<AgentResponse> {
    console.log(`[GENERAL-AGENT] Routing to general conversational agent for query: "${query}"`);
    
    // Play 3: Detect emotional retail bias and yield to Contrarian Agent
    if (query.match(/blow them out|lock|guarantee|everyone knows|sure thing/i)) {
      console.log(`[GeneralAgent] Emotional retail narrative detected. Handing off to Contrarian Agent.`);
      return {
        success: true,
        output: null,
        handoffTo: 'contrarian-agent',
        handoffPayload: {
          targetTeam: 'NYK', // Or dynamically extracted
          originalQuery: query,
          trigger: 'EMOTIONAL_RETAIL_BIAS'
        }
      };
    }
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not defined.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are AURA, an elite, open-world agentic virtual assistant. The user is asking a general, technical, or conversational question that falls outside the specialized domains of sports analytics, markets/Kalshi forecasting, or Google Workspace queries. Answer their question with absolute precision, high clarity, and beautiful professional formatting. Maintain a helpful and brilliant technical analytical tone.`;

      if (context?.onToken) {
        const responseStream = await ai.models.generateContentStream({
          model: "gemini-3.5-flash",
          contents: query,
          config: {
            systemInstruction,
            temperature: 0.7
          }
        });

        let fullText = "";
        for await (const chunk of responseStream) {
          if (chunk.text) {
            fullText += chunk.text;
            context.onToken(chunk.text);
          }
        }
        return {
          success: true,
          output: fullText
        };
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: query,
          config: {
            systemInstruction,
            temperature: 0.7
          }
        });
        return {
          success: true,
          output: response.text || "I processed your request, but could not produce a text response."
        };
      }
    } catch (e: any) {
      console.error("[GENERAL-AGENT] Error in general conversational agent fallback:", e);
      return {
        success: false,
        output: `System fallback failed to execute conversational fallback: ${e.message || e}`
      };
    }
  }
}
