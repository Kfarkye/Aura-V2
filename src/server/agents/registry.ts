import { AuraAgent, RouteContext, AgentResponse } from './types';

export class RegistryRouter {
  private agents: Map<string, AuraAgent> = new Map();
  private defaultAgentId: string = 'sports-agent'; // Using sports as default for now

  public registerAgent(agent: AuraAgent) {
    this.agents.set(agent.id, agent);
    console.log(`[AURA:REGISTRY] Agent registered: ${agent.name} (ID: ${agent.id})`);
  }

  public async route(
    query: string, 
    context: RouteContext = { depth: 0, maxDepth: 3, visitedAgents: [], originalQuery: query }
  ): Promise<AgentResponse> {
    
    // 1. CIRCUIT BREAKER: Prevent infinite recursion
    if (context.depth >= context.maxDepth) {
      console.warn(`[Registry] Circuit breaker tripped! Max routing depth (${context.maxDepth}) reached for query: "${query}"`);
      return this.fallbackRoute(query, "Max routing depth exceeded. System prevented a routing loop.");
    }

    console.log(`[Registry] Routing iteration ${context.depth}. Visited so far: ${JSON.stringify(context.visitedAgents)}`);

    let bestAgent: AuraAgent | null = null;
    let highestConfidence = -1;

    // 2. BIDDING WAR: Evaluate confidence scores, excluding already visited agents
    for (const [id, agent] of this.agents.entries()) {
      if (context.visitedAgents.includes(id)) {
        continue; 
      }

      try {
        const confidence = await agent.getRouteConfidence(query, context);
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
      return this.fallbackRoute(query, "No agent met the confidence threshold.");
    }

    // 4. EXECUTION
    const updatedContext: RouteContext = {
      ...context,
      depth: context.depth + 1,
      visitedAgents: [...context.visitedAgents, bestAgent.id]
    };

    try {
      console.log(`[Registry] Dispatching to Agent: ${bestAgent.name} (Confidence: ${highestConfidence})`);
      const response = await bestAgent.handle(query, updatedContext);

      // 5. HANDOFF HANDLING
      if (response.handoffTo && !updatedContext.visitedAgents.includes(response.handoffTo)) {
        console.log(`[Registry] Agent ${bestAgent.id} requested handoff to ${response.handoffTo}`);
        return this.route(query, {
          ...updatedContext,
          visitedAgents: [...updatedContext.visitedAgents, bestAgent.id]
        });
      }

      return response;
    } catch (error) {
      console.error(`[Registry] Execution failed on agent ${bestAgent.id}. Attempting next best agent...`);
      return this.route(query, updatedContext);
    }
  }

  private async fallbackRoute(query: string, reason: string): Promise<AgentResponse> {
    const generalist = this.agents.get(this.defaultAgentId);
    if (generalist) {
      return generalist.handle(query);
    }
    return {
      success: false,
      output: `System Error: Unable to process query. ${reason}`
    };
  }
}
