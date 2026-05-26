import { AuraAgent, RouteContext, AgentResponse } from './types';
import { sportsAgent } from './sports/sports-agent';
import { deepResearchAgent } from './research/deep-research-agent';
import { workspaceAgent } from './workspace/workspace-agent';
import { marketsAgent } from './markets/markets-agent';

const CONVERSATIONAL_REGEX = /^(hello|hi|hey|yo|good\s+morning|good\s+afternoon|good\s+evening|greetings|howdy)\b[\s?!.,]*$/i;
const STRUCTURAL_CODE_REGEX = /```[\s\S]*?```|\b(import\s+.*\s+from\s+['"].*['"]|const\s+.*\s+=\s+.*=>|function\s+\w+\s*\(|class\s+\w+|export\s+(default\s+)?(class|const|function|interface|type))\b/;

export function preProcessAndRoute(query: string): {
  type: 'conversational' | 'code_audit' | 'semantic_fallback';
  sanitizedInput: string;
} {
  const trimmed = query.trim();
  
  if (CONVERSATIONAL_REGEX.test(trimmed)) {
    return { type: 'conversational', sanitizedInput: trimmed };
  }
  
  if (STRUCTURAL_CODE_REGEX.test(trimmed)) {
    let sanitized = trimmed;
    let index = 0;
    sanitized = sanitized.replace(/```[\s\S]*?```/g, () => {
      const placeholder = `[CODE_BLOCK_PLACEHOLDER_${index}]`;
      index++;
      return placeholder;
    });
    return { type: 'code_audit', sanitizedInput: sanitized };
  }
  
  let sanitized = trimmed;
  let index = 0;
  sanitized = sanitized.replace(/```[\s\S]*?```/g, () => {
    const placeholder = `[CODE_BLOCK_PLACEHOLDER_${index}]`;
    index++;
    return placeholder;
  });
  return { type: 'semantic_fallback', sanitizedInput: sanitized };
}

export class RegistryRouter {
  private agents: Map<string, AuraAgent> = new Map();
  private defaultAgentId: string = 'sports-agent';

  constructor() {
    this.registerAgent(sportsAgent);
    this.registerAgent(deepResearchAgent);
    this.registerAgent(workspaceAgent);
    this.registerAgent(marketsAgent);
  }

  public registerAgent(agent: AuraAgent) {
    this.agents.set(agent.id, agent);
    console.log(`[AURA:REGISTRY] Agent registered: ${agent.name} (ID: ${agent.id})`);
  }

  public async route(
    query: string,
    context: RouteContext = { depth: 0, maxDepth: 3, visitedAgents: [], originalQuery: query },
    onToken?: (token: string) => void
  ): Promise<AgentResponse> {
    const originalOnToken = onToken || context.onToken;
    let hasStreamed = false;
    let fallbackTimer: NodeJS.Timeout | null = null;
    let wrappedOnToken = originalOnToken;

    if (originalOnToken && (!context.depth || context.depth === 0)) {
      wrappedOnToken = (token: string) => {
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        hasStreamed = true;
        originalOnToken(token);
      };

      fallbackTimer = setTimeout(() => {
        if (!hasStreamed) {
          hasStreamed = true;
          originalOnToken("Analyzing your request...");
        }
      }, 250);
    }

    const enrichedContext: RouteContext = {
      ...context,
      onToken: wrappedOnToken
    };

    const cleanupTimer = () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    // 1. CIRCUIT BREAKER: Prevent infinite recursion
    if (enrichedContext.depth >= enrichedContext.maxDepth) {
      console.warn(`[Registry] Circuit breaker tripped! Max routing depth (${enrichedContext.maxDepth}) reached.`);
      cleanupTimer();
      return this.fallbackRoute(query, "Max routing depth exceeded. System prevented a routing loop.", enrichedContext);
    }

    // 1.5 PRE-PROCESS & DIRECT ROUTE
    const decision = enrichedContext.depth === 0 ? preProcessAndRoute(query) : { type: 'semantic_fallback' as const, sanitizedInput: query };

    if (enrichedContext.depth === 0) {
      if (decision.type === 'conversational') {
        cleanupTimer();
        return {
          success: true,
          output: "Hello! I am Aura, your agentic workspace and research assistant. How can I help you today?"
        };
      } else if (decision.type === 'code_audit') {
        console.log(`[Registry] Pre-processing identified code_audit. Routing directly to deep-research-agent.`);
        const targetAgent = this.agents.get('deep-research-agent');
        if (targetAgent) {
          cleanupTimer();
          const updatedContext: RouteContext = {
            ...enrichedContext,
            depth: enrichedContext.depth + 1,
            visitedAgents: [...enrichedContext.visitedAgents, 'deep-research-agent']
          };
          return targetAgent.handle(query, updatedContext);
        }
      }
    }

    console.log(`[Registry] Routing iteration ${enrichedContext.depth}. Visited so far: ${JSON.stringify(enrichedContext.visitedAgents)}`);
    
    let bestAgent: AuraAgent | null = null;
    let highestConfidence = -1;
    const biddingQuery = decision.sanitizedInput;

    // 2. BIDDING WAR: Evaluate confidence scores, excluding already visited agents
    for (const [id, agent] of this.agents.entries()) {
      if (enrichedContext.visitedAgents.includes(id)) {
        continue;
      }
      try {
        const confidence = await agent.getRouteConfidence(biddingQuery, enrichedContext);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestAgent = agent;
        }
      } catch (err) {
        console.error(`[Registry] Error getting confidence from agent ${id}:`, err);
      }
    }

    // 3. NO CONFIDENT AGENT FOUND: Fallback
    const CONFIDENCE_THRESHOLD = 0.4;
    if (!bestAgent || highestConfidence < CONFIDENCE_THRESHOLD) {
      console.log(`[Registry] Low confidence score (${highestConfidence || 'N/A'}). Routing to fallback.`);
      cleanupTimer();
      return this.fallbackRoute(query, "No agent met the confidence threshold.", enrichedContext);
    }

    // 4. EXECUTION
    const updatedContext: RouteContext = {
      ...enrichedContext,
      depth: enrichedContext.depth + 1,
      visitedAgents: [...enrichedContext.visitedAgents, bestAgent.id]
    };

    try {
      console.log(`[Registry] Dispatching to Agent: ${bestAgent.name} (Confidence: ${highestConfidence})`);
      const response = await bestAgent.handle(query, updatedContext);

      // 5. HANDOFF HANDLING
      if (response.handoffTo && !updatedContext.visitedAgents.includes(response.handoffTo)) {
        console.log(`[Registry] Agent ${bestAgent.id} requested handoff to ${response.handoffTo}`);
        cleanupTimer();
        return this.route(query, updatedContext, wrappedOnToken);
      }

      cleanupTimer();
      return response;
    } catch (error) {
      console.error(`[Registry] Execution failed on agent ${bestAgent.id}. Attempting next best agent...`);
      cleanupTimer();
      return this.route(query, updatedContext, wrappedOnToken);
    }
  }

  private fallbackRoute(query: string, reason: string, context: RouteContext): AgentResponse {
    return {
      success: false,
      output: `System fallback triggered: ${reason}`
    };
  }
}
