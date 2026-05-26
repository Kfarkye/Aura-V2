export interface RouteContext {
  depth: number;
  maxDepth: number;
  visitedAgents: string[];
  originalQuery: string;
}

export interface AgentResponse {
  success: boolean;
  output: any;
  handoffTo?: string;
}

export interface AuraAgent {
  id: string;
  name: string;
  getRouteConfidence: (query: string, context?: RouteContext) => Promise<number>;
  handle: (query: string, context?: RouteContext) => Promise<AgentResponse>;
}
