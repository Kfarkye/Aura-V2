export interface RouteContext {
  depth: number;
  maxDepth: number;
  visitedAgents: string[];
  originalQuery: string;
  accessToken?: string;
  history?: any[];
  image?: string;
  imageMime?: string;
  onToken?: (token: string) => void;
  domain?: string;
  /**
   * Extensible payload carrier preserving extracted parameters, slots,
   * or parsed tokens across agent handoffs to prevent context evaporation.
   */
  payloadCarrier?: Record<string, any>;
}

export interface AgentResponse {
  success: boolean;
  output: any;
  handoffTo?: string;
  /**
   * Structured payload passed to the recipient agent during a handoff.
   */
  handoffPayload?: Record<string, any>;
}

export interface AuraAgent {
  id: string;
  name: string;
  getRouteConfidence(query: string, context: RouteContext): Promise<number>;
  execute(query: string, context: RouteContext): Promise<AgentResponse>;
}
