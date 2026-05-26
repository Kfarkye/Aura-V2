import { AuraAgent, RouteContext, AgentResponse } from '../types';
import { AuraArtifact } from '../../../types/aura';
import { GoogleGenAI } from '@google/genai';

const MODEL = process.env.GEMINI_RESEARCH_MODEL || 'gemini-2.5-flash';

export const marketsAgent: AuraAgent = {
  id: 'markets-agent',
  name: 'markets-agent',

  getRouteConfidence: async (query: string, context?: RouteContext): Promise<number> => {
    const keywords = [
      'kalshi', 'prediction', 'market', 'prediction market', 'orderbook', 'ticker',
      'volume', 'open interest', 'contracts', 'trade price', 'implied probability',
      'political bet', 'betting market'
    ];
    const queryLower = query.toLowerCase();
    if (keywords.some(k => queryLower.includes(k))) {
      return 0.9;
    }
    return 0.1;
  },

  handle: async (query: string, context?: RouteContext): Promise<AgentResponse> => {
    console.log(`[MARKETS-AGENT] Handling prediction market query: "${query}"`);
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, output: "GEMINI_API_KEY is required to process market queries." };
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      // 1. Fetch active markets from Kalshi API
      const endpoints = [
        'https://trading-api.kalshi.com/trade-api/v2/markets?limit=100&status=open',
        'https://api.elections.kalshi.com/trade-api/v2/markets?limit=50&status=open'
      ];

      const allMarkets: any[] = [];
      await Promise.all(
        endpoints.map(async (url) => {
          try {
            const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (res.ok) {
              const data = await res.json();
              if (data.markets) {
                allMarkets.push(...data.markets);
              }
            }
          } catch (e: any) {
            console.error(`[MARKETS-AGENT] Failed to fetch markets from ${url}:`, e.message);
          }
        })
      );

      if (allMarkets.length === 0) {
        return {
          success: true,
          output: {
            id: `market_error_${Date.now()}`,
            type: 'SYSTEM_MESSAGE',
            resolution_state: 'GROUNDING_FAULT',
            context_summary: `### 🔮 Prediction Markets Offline\n\nCould not fetch live prediction contract data from Kalshi endpoints at this time.`
          } as AuraArtifact
        };
      }

      // 2. Score and filter markets by query
      const searchTermsPrompt = `Extract search keywords from the user's prediction market query.
Return a simple comma-separated list of the 3 most important keywords (e.g. "inflation, rates, fed" or "elections, president, house").
User Query: "${query}"`;

      const keywordResponse = await ai.models.generateContent({
        model: MODEL,
        contents: searchTermsPrompt,
        config: { temperature: 0.1 }
      });

      const keywordsStr = keywordResponse.text || "";
      const searchTerms = keywordsStr
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 2);

      console.log(`[MARKETS-AGENT] Scoring markets with extracted search keywords:`, searchTerms);

      const scoredMarkets = allMarkets.map((m) => {
        let score = 0;
        const title = (m.title || '').toLowerCase();
        const subtitle = (m.yes_sub_title || '').toLowerCase();
        const ticker = (m.ticker || '').toLowerCase();
        const category = (m.category || '').toLowerCase();

        for (const term of searchTerms) {
          if (title.includes(term)) score += 5;
          if (subtitle.includes(term)) score += 3;
          if (ticker.includes(term)) score += 2;
          if (category.includes(term)) score += 1;
        }

        return { market: m, score };
      });

      // Sort by score desc, filter out zero scores
      const matched = scoredMarkets
        .filter(sm => sm.score > 0)
        .sort((a, b) => b.score - a.score || (b.market.volume - a.market.volume))
        .map(sm => sm.market)
        .slice(0, 8);

      // If no score matches, get top 8 markets by volume
      const results = matched.length > 0 
        ? matched 
        : allMarkets.sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 8);

      // 3. Format into summary markdown and structured data
      const marketCards = results.map(m => {
        const lastPrice = m.last_price || 0;
        const impliedProb = m.yes_ask && m.yes_bid ? ((m.yes_ask + m.yes_bid) / 2) : lastPrice;
        const americanOdds = impliedProb > 0 
          ? (impliedProb >= 50 
              ? `-${Math.round((impliedProb / (100 - impliedProb)) * 100)}` 
              : `+${Math.round(((100 - impliedProb) / impliedProb) * 100)}`)
          : 'N/A';

        return {
          ticker: m.ticker,
          title: m.title,
          subtitle: m.yes_sub_title || m.sub_title || '',
          yesPrice: impliedProb / 100,
          americanOdds,
          volume: m.volume || 0,
          openInterest: m.open_interest || 0,
          status: m.status || 'open',
          closeTime: m.close_time || null
        };
      });

      const summaryList = marketCards.map(m => {
        return `**${m.title}** (\`${m.ticker}\`)
* Implied Yes Probability: **${(m.yesPrice * 100).toFixed(1)}%** (Odds: \`${m.americanOdds}\`)
* Volume: **$${m.volume.toLocaleString()}** | Open Interest: **$${m.openInterest.toLocaleString()}**
* Subtitle: *${m.subtitle || "No further details"}*`;
      }).join('\n\n---\n\n');

      const artifact: AuraArtifact = {
        id: `kalshi_standalone_${Date.now()}`,
        type: 'SYSTEM_MESSAGE',
        resolution_state: 'LIVE_DATA',
        context_summary: `### 🔮 Kalshi Prediction Markets\n\nLive contract matching your query: *"${query}"*:\n\n${summaryList}`,
        data: {
          markets: marketCards
        }
      };

      return {
        success: true,
        output: artifact
      };

    } catch (error: any) {
      console.error("[MARKETS-AGENT] Failed to resolve prediction markets:", error);
      return {
        success: false,
        output: `Failed to resolve markets: ${error.message}`
      };
    }
  }
};
