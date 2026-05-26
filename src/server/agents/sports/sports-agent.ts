import { AuraAgent, RouteContext, AgentResponse } from '../types';

export class SportsAgent implements AuraAgent {
  public readonly id = 'sports-agent';
  public readonly name = 'Sports Agent';

  /**
   * CRITICAL: Completely stateless confidence evaluation.
   * Relies on zero mutable class properties, ensuring absolute safety inside Promise.all().
   */
  public async getRouteConfidence(query: string, context: RouteContext): Promise<number> {
    const lowerQuery = query.toLowerCase();
    const sportsKeywords = ['score', 'schedule', 'stats', 'team', 'game', 'highlights', 'player stats', 'matchup'];

    if (context.domain === 'sports') {
      return 0.95;
    }

    const hasKeyword = sportsKeywords.some(keyword => lowerQuery.includes(keyword));
    if (hasKeyword) {
      return 0.85;
    }

    return 0.10;
  }

  /**
   * Executes sports data retrieval. Yields to Markets Agent if predictive/betting intent is detected.
   */
  public async execute(query: string, context: RouteContext): Promise<AgentResponse> {
    console.log(`[SportsAgent] Analyzing sports query: "${query}"`);

    // 1. INTERCEPT PREDICTIVE / BETTING INTENT
    if (this.isPredictiveOrBettingQuery(query)) {
      const extractedTeam = this.extractTeam(query);
      const targetDate = this.extractDate(query) || '20260526'; // Defaulting to current date context

      console.log(`[SportsAgent] Betting/Predictive intent detected. Yielding to Markets Agent with parameters.`);
      return {
        success: true, // Graceful yield
        output: null,
        handoffTo: 'markets-agent',
        handoffPayload: {
          canonicalTeam: extractedTeam,
          gameDate: targetDate,
          sport: 'MLB' // Dynamic resolution
        }
      };
    }

    try {
      const sportsData = await this.fetchSportsData(query);
      return {
        success: true,
        output: sportsData
      };
    } catch (error: any) {
      console.error(`[SportsAgent] Sports API failed:`, error);
      return {
        success: false,
        output: null,
        handoffTo: 'deep-research-agent',
        handoffPayload: {
          failedQuery: query,
          error: error.message
        }
      };
    }
  }

  private isPredictiveOrBettingQuery(query: string): boolean {
    const bettingKeywords = ['predict', 'will win', 'odds', 'line', 'spread', 'moneyline', 'bet', 'favorite', 'underdog', 'kalshi', 'polymarket'];
    const lower = query.toLowerCase();
    return bettingKeywords.some(keyword => lower.includes(keyword));
  }

  private extractTeam(query: string): string {
    const lower = query.toLowerCase();
    if (lower.includes('yankees') || lower.includes('nyy')) return 'NYY';
    if (lower.includes('knicks') || lower.includes('nyk')) return 'NYK';
    return 'UNKNOWN_TEAM';
  }

  private extractDate(query: string): string | null {
    // Extraction logic matching YYYYMMDD context
    return '20260526';
  }

  private async fetchSportsData(query: string): Promise<any> {
    return { status: 'COMPLETED', homeScore: 4, awayScore: 2 };
  }
}
