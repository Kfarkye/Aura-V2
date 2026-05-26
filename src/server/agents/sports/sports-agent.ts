import { handleSportsQuery } from '../../sharp-sports-handler';
import { AuraAgent, RouteContext, AgentResponse } from '../types';

export const sportsAgent: AuraAgent = {
  id: 'sports-agent',
  name: 'sports-agent',
  getRouteConfidence: async (query: string, context?: RouteContext): Promise<number> => {
    const keywords = ['score', 'game', 'schedule', 'nba', 'nfl', 'mlb', 'odds', 'nhl'];
    if (keywords.some(k => query.toLowerCase().includes(k))) return 0.9;
    return 0.1;
  },
  handle: async (query: string, context?: RouteContext): Promise<AgentResponse> => {
      // Need to extract args from query or context - simplifying for now
      const result = await handleSportsQuery({ query });
      return { success: true, output: result };
  }
};
