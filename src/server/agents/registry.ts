import { AuraAgent, RouteContext, AgentResponse } from './types';

export class RegistryRouter {
  private agents: Map<string, AuraAgent> = new Map();
  private defaultAgentId: string = 'general-agent';

  constructor(agents: AuraAgent[], defaultAgentId?: string) {
    for (const agent of agents) {
      this.agents.set(agent.id, agent);
    }
    if (defaultAgentId) {
      this.defaultAgentId = defaultAgentId;
    }
  }

  public async route(
    query: string,
    context: RouteContext,
    onToken?: (token: string) => void
  ): Promise<AgentResponse> {
    const depth = context.depth || 0;
    const maxDepth = context.maxDepth || 3;

    if (depth >= maxDepth) {
      console.warn(`[RegistryRouter] Max routing depth (${maxDepth}) exceeded. Falling back to default.`);
      return this.executeDefault(query, context, onToken);
    }

    const enrichedContext: RouteContext = {
      ...context,
      depth,
      maxDepth,
      visitedAgents: context.visitedAgents || [],
      originalQuery: context.originalQuery || query,
      onToken: onToken || context.onToken,
      payloadCarrier: context.payloadCarrier || {}
    };

    const eligibleAgents = Array.from(this.agents.entries())
      .filter(([id]) => !enrichedContext.visitedAgents.includes(id));

    if (eligibleAgents.length === 0) {
      console.warn('[RegistryRouter] No eligible agents remaining. Executing fallback.');
      return this.executeDefault(query, enrichedContext, onToken);
    }

    console.log(`[RegistryRouter] Executing parallelized bidding across ${eligibleAgents.length} agents...`);
    const biddingResults = await Promise.all(
      eligibleAgents.map(async ([id, agent]) => {
        try {
          const confidence = await agent.getRouteConfidence(query, enrichedContext);
          return { id, agent, confidence };
        } catch (err) {
          console.error(`[RegistryRouter] Confidence evaluation failed for agent [${id}]:`, err);
          return { id, agent, confidence: -1 };
        }
      })
    );

    let bestAgent: AuraAgent | null = null;
    let highestConfidence = -1;

    for (const result of biddingResults) {
      if (result.confidence > highestConfidence) {
        highestConfidence = result.confidence;
        bestAgent = result.agent;
      } else if (result.confidence === highestConfidence && highestConfidence > 0) {
        if (enrichedContext.domain && result.id.includes(enrichedContext.domain)) {
          bestAgent = result.agent;
        }
      }
    }

    if (!bestAgent || highestConfidence <= 0.1) {
      console.log(`[RegistryRouter] Low confidence match (${highestConfidence}). Routing to default.`);
      const defaultAgent = this.agents.get(this.defaultAgentId);
      if (defaultAgent && !enrichedContext.visitedAgents.includes(this.defaultAgentId)) {
        bestAgent = defaultAgent;
      } else {
        return this.executeDefault(query, enrichedContext, onToken);
      }
    }

    console.log(`[RegistryRouter] Routing to [${bestAgent.id}] with confidence ${highestConfidence}`);
    enrichedContext.visitedAgents.push(bestAgent.id);

    let response: AgentResponse;
    try {
      response = await Promise.race([
        bestAgent.execute(query, enrichedContext),
        new Promise<AgentResponse>((_, reject) => 
           setTimeout(() => reject(new Error(`Agent [${bestAgent!.id}] execution timed out`)), 15000)
        )
      ]);
    } catch (err) {
      console.error(`[RegistryRouter] Execution crashed on agent [${bestAgent.id}]:`, err);
      return this.handleExecutionFailure(query, enrichedContext, bestAgent.id, onToken);
    }

    if (response.handoffTo) {
      const targetAgentId = response.handoffTo;
      if (enrichedContext.visitedAgents.includes(targetAgentId)) {
        console.warn(`[RegistryRouter] Circular handoff detected to [${targetAgentId}]. Breaking loop.`);
        return response;
      }

      console.log(`[RegistryRouter] Handing off execution from [${bestAgent.id}] -> [${targetAgentId}]`);
      const handoffContext: RouteContext = {
        ...enrichedContext,
        depth: enrichedContext.depth + 1,
        payloadCarrier: {
          ...enrichedContext.payloadCarrier,
          ...response.handoffPayload
        }
      };
      return this.route(query, handoffContext, onToken);
    }

    return response;
  }

  private async executeDefault(query: string, context: RouteContext, onToken?: (token: string) => void): Promise<AgentResponse> {
    const defaultAgent = this.agents.get(this.defaultAgentId);
    if (!defaultAgent) throw new Error(`[RegistryRouter] Fatal: Default agent [${this.defaultAgentId}] is not registered.`);
    return defaultAgent.execute(query, context);
  }

  private async handleExecutionFailure(query: string, context: RouteContext, failedAgentId: string, onToken?: (token: string) => void): Promise<AgentResponse> {
    if (failedAgentId !== 'deep-research-agent' && this.agents.has('deep-research-agent')) {
      console.log(`[RegistryRouter] Execution failed for [${failedAgentId}]. Initiating Deep Research fallback.`);
      const fallbackContext: RouteContext = {
        ...context,
        depth: context.depth + 1,
        visitedAgents: [...(context.visitedAgents || []), failedAgentId]
      };
      return this.route(query, fallbackContext, onToken);
    }
    return this.executeDefault(query, context, onToken);
  }
}
