import { AuraAgent, RouteContext, AgentResponse } from './types';
import { sportsAgent } from './sports/sports-agent';
import { deepResearchAgent } from './research/deep-research-agent';
import { workspaceAgent } from './workspace/workspace-agent';
import { marketsAgent } from './markets/markets-agent';

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

    console.log(`[Registry] Routing iteration ${enrichedContext.depth}. Visited so far: ${JSON.stringify(enrichedContext.visitedAgents)}`);
    
    let bestAgent: AuraAgent | null = null;
    let highestConfidence = -1;

    // 2. BIDDING WAR: Evaluate confidence scores, excluding already visited agents
    for (const [id, agent] of this.agents.entries()) {
      if (enrichedContext.visitedAgents.includes(id)) {
        continue;
      }
      try {
        const confidence = await agent.getRouteConfidence(query, enrichedContext);
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
