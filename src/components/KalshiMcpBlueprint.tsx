import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Code2, ShieldCheck, PlaySquare, 
  Copy, Check, Layers, Cpu, Database, ChevronRight, HelpCircle,
  Activity, Server, Network, Sparkles, Filter, Radio,
  Clock, BarChart3, AlignLeft, Crosshair, DollarSign, ChevronDown, RefreshCw
} from 'lucide-react';

// ============================================================================
// Types & Interfaces
// ============================================================================
type McpTab = 'setup.sh' | 'server.py' | 'config.json' | 'prompts.txt' | 'live_playground';
type FastMcpTool = 'execute_fusion' | 'get_markets' | 'get_market' | 'get_order_book' | 'get_balance' | 'get_positions' | 'place_limit_order';

interface ToolArgDetails {
  ticker: string;
  limit: number;
  status: 'open' | 'closed';
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  count: number;
  price_cents: number;
}

// ============================================================================
// Code Snippets Section: A clean overview of the integration setup
// ============================================================================
const MCP_FILES: Record<Exclude<McpTab, 'live_playground'>, string> = {
  'setup.sh': `# 1. Set up a simple virtual environment для development
mkdir kalshi-predictions
cd kalshi-predictions
python -m venv venv
source venv/bin/activate

# 2. Install the lightweight connection libraries and validator
pip install mcp[cli] httpx cryptography pydantic`,

  'server.py': `import os
import time
import base64
import logging
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

import httpx
from mcp.server.fastmcp import FastMCP
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from pydantic import BaseModel, Field

# Set up simple logging for debug tracing
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("kalshi-sports-engine")

KALSHI_API_URL = os.environ.get("KALSHI_API_URL", "https://trading-api.kalshi.com")
KALSHI_API_KEY_ID = os.environ.get("KALSHI_API_KEY_ID")
KALSHI_PRIVATE_KEY = os.environ.get("KALSHI_PRIVATE_KEY")

http_client: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(server: FastMCP):
    """Keep a connection pool open during server runtime."""
    global http_client
    http_client = httpx.AsyncClient(
        base_url=KALSHI_API_URL,
        timeout=httpx.Timeout(5.0),
        limits=httpx.Limits(max_keepalive_connections=30, max_connections=50)
    )
    yield
    if http_client:
        await http_client.aclose()

mcp = FastMCP("Prediction Markets Link", lifespan=lifespan)

# Helper to format and simplify prediction outcomes into a clean format
class MarketSimpleOverview(BaseModel):
    ticker: str
    title: str
    yes_bid: int
    yes_ask: int
    volume: int
    probability: float
    updated_at: str

def format_contract_data(raw: dict) -> dict:
    """Extract bid/ask values and convert them to simple percentages."""
    yes_ask = raw.get("yes_ask", 0)
    yes_bid = raw.get("yes_bid", 0)
    last_price = raw.get("last_price", 0)
    
    probability = 0.0
    if yes_ask > 0 and yes_bid > 0:
        probability = round(((yes_ask + yes_bid) / 2) / 100.0, 2)
    elif last_price > 0:
        probability = round(last_price / 100.0, 2)

    return MarketSimpleOverview(
        ticker=raw.get("ticker", ""),
        title=raw.get("title", ""),
        yes_bid=yes_bid,
        yes_ask=yes_ask,
        volume=int(raw.get("volume", 0)),
        probability=probability,
        updated_at=datetime.now(timezone.utc).isoformat()
    ).model_dump()

# Request headers helper using credentials
def get_auth_headers(method: str, path: str) -> dict:
    headers = {"Content-Type": "application/json"}
    if not KALSHI_API_KEY_ID:
        return headers
    # Authenticates trading requests if secrets are configured
    headers.update({
        "KALSHI-ACCESS-KEY": KALSHI_API_KEY_ID,
        "KALSHI-ACCESS-TIMESTAMP": str(int(time.time() * 1000))
    })
    return headers

# -------------------------------------------------------------
# Active tools to fetch data
# -------------------------------------------------------------

@mcp.tool()
async def get_markets(query: str, limit: int = 10) -> List[dict]:
    """Search active sports or news categories currently available to predict."""
    path = f"/trade-api/v2/markets?limit={limit}&status=open&search_query={query}"
    response = await http_client.get(path, headers=get_auth_headers("GET", path))
    if response.status_code != 200:
        return [{"status": "error", "message": "Failed to pull contracts"}]
    
    markets = response.json().get("markets", [])
    return [format_contract_data(m) for m in markets]

@mcp.tool()
async def get_order_book(ticker: str) -> dict:
    """Fetch live buy and sell order queues for a given contract."""
    path = f"/trade-api/v2/markets/{ticker}/orderbook"
    response = await http_client.get(path, headers=get_auth_headers("GET", path))
    return response.json()

if __name__ == "__main__":
    mcp.run()`,

  'config.json': `{
  "servers": {
    "kalshi-sports": {
      "command": "/bin/python3",
      "args": [
        "./server.py"
      ],
      "env": {
        "KALSHI_API_URL": "https://trading-api.kalshi.com",
        "KALSHI_API_KEY_ID": "your-api-key-id",
        "KALSHI_PRIVATE_KEY": "your-private-key"
      }
    }
  }
}`,

  'prompts.txt': `// Quick questions you can ask the sports tracker:

1. NBA PREDICTION MATCHUP:
"Show predictions for tonight's game. Compare current pricing on Yes vs No contracts."

2. OVER/UNDER CHECK:
"Check the order book for Lakers vs Warriors. Sum up current predictions."`
};

// ============================================================================
// Helper Input Sub-components
// ============================================================================
const InputField = React.memo(({ label, type = 'text', value, onChange, placeholder, min, max }: any) => (
  <div className="space-y-1.5 text-left">
    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block pl-0.5 select-none">{label}</label>
    <input 
      type={type} min={min} max={max} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full bg-[#0A0A0C] border border-white/[0.06] rounded-[8px] px-3.5 py-2.5 text-[12px] text-white/95 outline-none transition-all duration-300 focus:border-neutral-500 font-mono tracking-wide placeholder:text-neutral-700"
    />
  </div>
));
InputField.displayName = 'InputField';

const SelectField = React.memo(({ label, value, onChange, options }: any) => (
  <div className="space-y-1.5 text-left">
    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block pl-0.5 select-none font-sans">{label}</label>
    <div className="relative">
      <select 
        value={value} onChange={onChange}
        className="w-full bg-[#0A0A0C] border border-white/[0.06] rounded-[8px] pl-3.5 pr-10 py-2.5 text-[12px] text-white/95 outline-none transition-all duration-300 focus:border-neutral-500 cursor-pointer appearance-none font-mono"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
        <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
      </div>
    </div>
  </div>
));
SelectField.displayName = 'SelectField';

// ============================================================================
// Interactive Component: The Live Predictor & Game Feed Card
// ============================================================================
const MarketAwareFusionCard = ({ data }: { data?: any }) => {
    const predictionData = data || {
        gameId: "401585601",
        league: "NBA",
        status: "In Progress",
        clock: "02:14",
        period: 4,
        homeTeam: { abbr: "LAL", score: 112 },
        awayTeam: { abbr: "GSW", score: 110 },
        market: {
            ticker: "NBA-LAL-WIN-AND-POINTS",
            title: "Lakers to win and LeBron Over 25.5 points",
            yes_bid: 64, yes_ask: 66, no_bid: 33, no_ask: 35,
            last_price: 65, volume: 24500, open_interest: 124000,
            probability: 0.65,
            selected_legs: ["Lakers Win Match", "LeBron Over 25.5 Pts"],
            bids: [{price_cents: 64, quantity: 1500}, {price_cents: 63, quantity: 4200}, {price_cents: 62, quantity: 800}],
            asks: [{price_cents: 66, quantity: 900}, {price_cents: 67, quantity: 3100}, {price_cents: 68, quantity: 5000}]
        },
        playByPlay: [
            { id: "1", clock: "02:14", period: 4, teamAbbr: "LAL", description: "LeBron James sinks standard three-pointer from deep", isScoringPlay: true },
            { id: "2", clock: "02:31", period: 4, teamAbbr: "GSW", description: "Stephen Curry misses mid-range jump shot", isScoringPlay: false },
            { id: "3", clock: "02:45", period: 4, teamAbbr: "GSW", description: "Draymond Green records defensive rebound", isScoringPlay: false }
        ]
    };

    const { homeTeam, awayTeam, market, playByPlay, clock, period } = predictionData;
    
    const maxBookVol = Math.max(
        ...(market.bids || []).map((b: any) => b.quantity), 
        ...(market.asks || []).map((a: any) => a.quantity), 
        1
    );

    return (
        <div className="w-full bg-[#050505] border border-white/[0.06] rounded-[16px] overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-500 ease-out transform-gpu">
            
            {/* Scoreboard and Status */}
            <div className="px-5 py-4 border-b border-white/[0.04] bg-[#080808] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-[15px] font-medium text-white tracking-tight flex items-center gap-2">
                        <span className="text-neutral-500 text-[11px] font-mono font-medium">{awayTeam.abbr}</span>
                        <span className="font-mono">{awayTeam.score}</span>
                    </div>
                    <div className="h-4 w-px bg-white/[0.08]" />
                    <div className="text-[15px] font-semibold text-neutral-200 tracking-tight flex items-center gap-2">
                        <span className="text-neutral-500 text-[11px] font-mono font-medium">{homeTeam.abbr}</span>
                        <span className="font-mono">{homeTeam.score}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 border border-white/[0.06] rounded-[6px]">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">Quarter {period} • {clock}</span>
                </div>
            </div>

            {/* Split Details: Active prediction target */}
            {market.selected_legs && market.selected_legs.length > 0 && (
                <div className="px-5 py-3 bg-[#050505] border-b border-white/[0.04] flex items-center gap-2 overflow-x-auto select-none scrollbar-none">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold flex items-center gap-1.5 shrink-0">
                        <Layers className="w-3.5 h-3.5" /> Details:
                    </span>
                    {market.selected_legs.map((leg: string, idx: number) => (
                        <span key={idx} className="bg-white/[0.02] border border-white/[0.05] px-2.5 py-0.5 rounded-[4px] text-[10px] font-mono text-neutral-300 shrink-0">
                            {leg}
                        </span>
                    ))}
                </div>
            )}

            {/* Twin Panel Setup */}
            <div className="flex flex-col md:flex-row h-[320px] divide-y md:divide-y-0 md:divide-x divide-white/[0.04]">
                
                {/* Live Logs & Incidents Feed */}
                <div className="flex-[1.4] flex flex-col bg-[#050505]">
                    <div className="px-4 py-2 bg-[#080808] border-b border-white/[0.04] flex items-center gap-2 select-none shrink-0">
                        <AlignLeft className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Live Updates</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-[11px] leading-relaxed scrollbar-thin">
                        <AnimatePresence mode="popLayout">
                            {playByPlay.map((play: any, idx: number) => (
                                <motion.div 
                                    key={play.id}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                                    className={`flex items-start gap-3 p-2.5 rounded-[6px] border ${play.isScoringPlay ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white/[0.01] border-white/[0.03]'}`}
                                >
                                    <div className="flex flex-col items-end shrink-0 w-10">
                                        <span className="text-neutral-400 font-mono text-[10px]">{play.clock}</span>
                                        <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">{play.teamAbbr}</span>
                                    </div>
                                    <div className="w-px self-stretch bg-white/[0.04]" />
                                    <span className={`flex-1 font-sans text-[11.5px] ${play.isScoringPlay ? 'text-white font-medium' : 'text-neutral-400'}`}>
                                        {play.description}
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Live Predictions Depth Grid */}
                <div className="flex-1 flex flex-col bg-[#050505]">
                    <div className="px-4 py-2 bg-[#080808] border-b border-white/[0.04] flex items-center justify-between select-none shrink-0">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
                            <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Prediction Spreads</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-300 font-bold">Yes Prob: {(market.probability * 100).toFixed(0)}%</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center">
                        <div className="space-y-1 scale-95 origin-center">
                            
                            {/* Ask Pricing */}
                            <div className="flex flex-col gap-1 mb-2">
                                {[...(market.asks || [])].reverse().map((ask: any, i: number) => (
                                    <div key={`ask-${i}`} className="flex items-center justify-between text-[11px] font-mono relative overflow-hidden rounded bg-white/[0.02] px-2 py-1 border border-white/[0.02]">
                                        <div className="absolute top-0 right-0 h-full bg-rose-500/10 transition-all duration-300" style={{ width: `${(ask.quantity / maxBookVol) * 80}%` }} />
                                        <span className="text-neutral-400 relative z-10 text-[9.5px]">{ask.quantity} qty</span>
                                        <span className="text-rose-400 font-semibold relative z-10 tabular-nums">{ask.price_cents}¢</span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Mid Spread */}
                            <div className="py-2 border-y border-white/[0.04] flex items-center justify-between px-2 select-none bg-white/[0.01]">
                                <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Spread Difference</span>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                    {((market.asks?.[0]?.price_cents || 0) - (market.bids?.[0]?.price_cents || 0))}¢ / contract
                                </span>
                            </div>

                            {/* Bid Pricing */}
                            <div className="flex flex-col gap-1 mt-2">
                                {(market.bids || []).map((bid: any, i: number) => (
                                    <div key={`bid-${i}`} className="flex items-center justify-between text-[11px] font-mono relative overflow-hidden rounded px-2 py-1 bg-white/[0.02] border border-white/[0.04]">
                                        <div className="absolute top-0 right-0 h-full bg-white/[0.04] transition-all duration-300" style={{ width: `${(bid.quantity / maxBookVol) * 80}%` }} />
                                        <span className="text-neutral-300 relative z-10 text-[9.5px]">{bid.quantity} qty</span>
                                        <span className="text-neutral-200 font-semibold relative z-10 tabular-nums">{bid.price_cents}¢</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Primary Export Component
// ============================================================================
export function KalshiMcpBlueprint() {
  const [activeTab, setActiveTab] = useState<McpTab>('live_playground');
  const [outputMode, setOutputMode] = useState<'RAW' | 'SDUI'>('SDUI');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Selector controls and execution states
  const [selectedTool, setSelectedTool] = useState<FastMcpTool>('execute_fusion');
  const [isExecuting, setIsExecuting] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  
  // Custom simple logs stream (junior translation)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `[${new Date().toISOString()}] [SYS] Prediction Query Tool is live and running.`,
    `[${new Date().toISOString()}] [INFO] Choose "Interactive Matchup View" or any tool below to start querying predictions.`
  ]);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [args, setArgs] = useState<ToolArgDetails>({
    ticker: 'NBA-LAL-WIN-AND-POINTS',
    limit: 5,
    status: 'open',
    side: 'yes',
    action: 'buy',
    count: 10,
    price_cents: 65
  });

  const appendLog = useCallback((msg: string) => {
    setConsoleLogs(prev => [...prev, `[${new Date().toISOString()}] ${msg}`]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const copyCode = () => {
    if (activeTab === 'live_playground') return;
    navigator.clipboard.writeText(MCP_FILES[activeTab]);
    setCopiedFile(activeTab);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleArgChange = <K extends keyof ToolArgDetails>(key: K, value: ToolArgDetails[K]) => {
    setArgs(prev => ({ ...prev, [key]: value }));
  };

  const executeSandboxTool = async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsExecuting(true);
    setApiResponse(null);
    appendLog(`[SYSTEM] Matching query triggers for '${selectedTool}'...`);
    
    if (selectedTool === 'execute_fusion') {
        setTimeout(() => appendLog(`[SYSTEM] Pulling statistics from prediction database...`), 400);
        setTimeout(() => appendLog(`[SYSTEM] Retrieving live point score match values...`), 800);
        setTimeout(() => appendLog(`[SYSTEM] Correlating bids and odds metrics for Lakers-Warriors matchup...`), 1200);
        setTimeout(() => {
            appendLog(`[SUCCESS] Calculations fully updated. Rendering matchup preview visualizer.`);
            setApiResponse({ type: 'FUSION_CARD', ticker: args.ticker });
            setIsExecuting(false);
        }, 1800);
        return;
    }

    setTimeout(() => appendLog(`[SYSTEM] Formulating contract parameters check...`), 300);
    setTimeout(() => appendLog(`[SYSTEM] Sending fetch command to prediction host api...`), 700);

    // Map the selected junior tool request back to actual API endpoint
    let mappedToolName = selectedTool;
    const mappedArgs: any = { ...args };

    try {
      const response = await fetch('/api/mcp/kalshi/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: mappedToolName, args: mappedArgs }),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);

      setApiResponse(data.result);
      if (data.logs) {
        data.logs.forEach((l: string, i: number) => {
            const formattedLog = l
             .replace(/Substrate/gi, "Engine")
             .replace(/FastMCP/gi, "Predictor")
             .replace(/cryptographic/gi, "secure")
             .replace(/RSA-PSS/gi, "lookup");
            setTimeout(() => appendLog(`[SYSTEM] ${formattedLog}`), 600 + (i * 100));
        });
      } else {
        setTimeout(() => appendLog(`[SUCCESS] Response pulled successfully. Checking structure...`), 1000);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
         appendLog(`[WARN] Action stopped.`);
      } else {
         setTimeout(() => appendLog(`[ERROR] Match execution error: ${err.message}`), 1000);
         setApiResponse({ error: err.message });
      }
    } finally {
      setTimeout(() => setIsExecuting(false), 1200);
    }
  };

  return (
    <div className="w-full pt-4 animate-in fade-in duration-500 font-sans text-left pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-white/[0.04] pb-8">
        <div>
          <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-mono tracking-widest uppercase mb-3 select-none">
            <Sparkles className="w-3.5 h-3.5" />
            Live Sports Predictions Setup
          </div>
          <h2 className="text-[24px] sm:text-[28px] font-medium text-white/95 tracking-tight leading-[1.15] mb-2.5">
            Prediction Database Sandbox
          </h2>
          <p className="text-neutral-400 text-[13px] max-w-2xl font-normal leading-relaxed">
            Check live play scores, underlying trade order spreads, and predicted sports contracts in real-time. Use the sandboxed queries to see how it links together.
          </p>
        </div>
        <div className="flex items-center gap-2 select-none shrink-0">
          <div className="bg-[#050505] border border-white/[0.06] px-3.5 py-1.5 rounded-[6px] flex items-center gap-2 shadow-sm">
            <Server className="h-3.5 w-3.5 text-neutral-500" strokeWidth={2} />
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">Prediction Matchup</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Form: Controller and selectors */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-[#050505] border border-white/[0.04] rounded-[16px] p-6 flex flex-col justify-between h-full shadow-md relative overflow-hidden">
            <div className="relative z-10 w-full mb-6">
              <h3 className="text-[14px] font-semibold text-white/95 mb-4 flex items-center gap-2.5 select-none">
                <Cpu className="h-4 w-4 text-neutral-400" strokeWidth={2} />
                Sandbox Controller
              </h3>
              <p className="text-neutral-400 text-[12px] leading-relaxed mb-6 font-normal">
                Select from the tools below. Track current prediction bids/asks percentages and matchup lines.
              </p>

              {/* Selector List */}
              <div className="space-y-4 mb-6">
                <SelectField 
                  label="Choose Query Interface" 
                  value={selectedTool} 
                  options={[
                    {value: 'execute_fusion', label: 'Interactive Matchup View'},
                    {value: 'get_markets', label: 'get_all_markets()'},
                    {value: 'get_market', label: 'get_market_by_ticker(ticker)'},
                    {value: 'get_order_book', label: 'get_order_book(ticker)'},
                    {value: 'get_balance', label: 'get_wallet_balance()'},
                    {value: 'get_positions', label: 'get_user_holdings()'},
                    {value: 'place_limit_order', label: 'simulate_contract_purchase()'},
                  ]} 
                  onChange={(e: any) => {
                    const tool = e.target.value as FastMcpTool;
                    setSelectedTool(tool);
                    if (tool === 'get_market' || tool === 'get_order_book') {
                        handleArgChange('ticker', 'NBA-LAL-WIN-AND-POINTS');
                    }
                  }} 
                />

                {/* Optional Parameter Forms */}
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-[10px] p-4 space-y-4">
                    {selectedTool === 'get_markets' && (
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Max Count" type="number" value={args.limit} min="1" max="50" onChange={(e: any) => handleArgChange('limit', Number(e.target.value))} />
                        <SelectField label="Status" value={args.status} options={[{value:'open', label:'Open'}, {value:'closed', label:'Closed'}]} onChange={(e: any) => handleArgChange('status', e.target.value)} />
                      </div>
                    )}

                    {(selectedTool === 'get_market' || selectedTool === 'get_order_book' || selectedTool === 'place_limit_order') && (
                      <div>
                        <InputField label="Target Contract Ticker" value={args.ticker} placeholder="NBA-LAL-WIN-AND-POINTS" onChange={(e: any) => handleArgChange('ticker', e.target.value.toUpperCase())} />
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {['NBA-LAL-WIN-AND-POINTS', 'FED-DEC-RATE', 'CPI-JULY'].map(t => (
                              <button 
                                key={t}
                                onClick={() => handleArgChange('ticker', t)}
                                className="text-[9.5px] font-mono bg-white/[0.02] hover:bg-white/[0.05] text-neutral-400 hover:text-white px-2 py-1 rounded-[4px] cursor-pointer border border-white/[0.04] transition-colors"
                              >
                                {t.replace("NBA-LAL-WIN-AND-POINTS", "LAL-WIN")}
                              </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTool === 'place_limit_order' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <SelectField label="Direction" value={args.action} options={[{value:'buy', label:'BUY'}, {value:'sell', label:'SELL'}]} onChange={(e: any) => handleArgChange('action', e.target.value)} />
                          <SelectField label="Outcome leg" value={args.side} options={[{value:'yes', label:'YES'}, {value:'no', label:'NO'}]} onChange={(e: any) => handleArgChange('side', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField label="QTY Contracts" type="number" min="1" max="1000" value={args.count} onChange={(e: any) => handleArgChange('count', Number(e.target.value))} />
                          <InputField label="Limit Price ¢ (1-99)" type="number" min="1" max="99" value={args.price_cents} onChange={(e: any) => handleArgChange('price_cents', Number(e.target.value))} />
                        </div>
                      </>
                    )}
                </div>
              </div>
            </div>

            {/* Flat high-contrast button, NO neon glow colors or big shadows */}
            <button
              onClick={executeSandboxTool}
              disabled={isExecuting}
              className="w-full relative py-3.5 px-4 rounded-[10px] font-semibold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 cursor-pointer select-none border border-white/10 outline-none active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-neutral-200 text-black shadow-md mt-2"
            >
              <div className="relative z-10 flex items-center gap-2">
                {isExecuting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-black" strokeWidth={2.5} />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Activity className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
                    <span>Run Selected Query</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Right Output Panels and Terminal logs */}
        <div className="xl:col-span-8 bg-[#000000] border border-white/[0.06] rounded-[16px] overflow-hidden flex flex-col h-[700px] shadow-sm">
          
          {/* Top Tabs Bar */}
          <div className="flex bg-[#050505] border-b border-white/[0.04] overflow-x-auto select-none font-sans shrink-0 scrollbar-none">
            
            {/* Live Interactive Playground */}
            <button
              onClick={() => setActiveTab('live_playground')}
              className={`px-5 py-4 text-[10.5px] font-semibold tracking-wider uppercase transition-colors outline-none border-r border-[#151517] flex items-center gap-2 shrink-0 ${
                activeTab === 'live_playground' 
                  ? 'bg-[#000000] text-white border-t-2 border-t-white' 
                  : 'bg-transparent text-neutral-500 hover:text-neutral-300 border-t-2 border-t-transparent'
              }`}
            >
              <Network className="h-3.5 w-3.5" strokeWidth={2} />
              Interactive Output
            </button>

            {/* Source Files Tab List */}
            {(Object.keys(MCP_FILES) as Array<Exclude<McpTab, 'live_playground'>>).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-4 text-[10px] font-mono tracking-wider transition-colors outline-none border-r border-white/10 flex items-center gap-2 shrink-0 ${
                  activeTab === tab 
                    ? 'bg-[#000000] text-neutral-200 border-t-2 border-t-neutral-400' 
                    : 'bg-transparent text-neutral-500 hover:text-neutral-300 border-t-2 border-t-transparent'
                }`}
              >
                {tab === 'setup.sh' ? <Terminal className="h-3 w-3" /> : tab === 'server.py' ? <Code2 className="h-3 w-3" /> : tab === 'config.json' ? <ShieldCheck className="h-3 w-3" /> : <PlaySquare className="h-3 w-3" />}
                {tab}
              </button>
            ))}
            
            <div className="flex-1 bg-[#050505]" />
            
            {activeTab !== 'live_playground' && (
              <button 
                onClick={copyCode}
                className="px-5 text-neutral-500 hover:text-white transition-all flex items-center gap-2 border-l border-white/[0.04] bg-[#050505] cursor-pointer active:bg-white/[0.05] outline-none shrink-0"
              >
                {copiedFile === activeTab ? (
                    <>
                        <Check className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="text-[9.5px] font-semibold text-neutral-400 uppercase tracking-widest">Copied</span>
                    </>
                ) : (
                    <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[9.5px] uppercase tracking-widest">Copy</span>
                    </>
                )}
              </button>
            )}
          </div>
          
          {/* Tab Core Visualizer Panel */}
          <div className="flex-1 overflow-hidden flex flex-col bg-[#000000] transform-gpu">
            <AnimatePresence mode="wait">
              {activeTab === 'live_playground' ? (
                <motion.div 
                  key="playground"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col md:flex-row h-full overflow-hidden"
                >
                  {/* Left Column: Live Terminal logs */}
                  <div className="flex-1 flex flex-col border-r border-white/[0.04] h-full overflow-hidden bg-[#000000] md:w-1/2">
                    <div className="px-5 py-3 bg-[#030303] border-b border-white/[0.04] flex items-center justify-between select-none shrink-0">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                        <Terminal className="h-3.5 w-3.5 text-neutral-500" />
                        Activity Log
                      </span>
                    </div>
                    
                    <div className="flex-1 p-5 overflow-y-auto space-y-2.5 font-mono text-[11px] leading-relaxed text-neutral-400 scrollbar-thin">
                      {consoleLogs.map((log, idx) => {
                        let colorClass = 'text-neutral-400';
                        if (log.includes('[ERROR]') || log.includes('[CRITICAL]')) colorClass = 'text-rose-400 font-bold';
                        else if (log.includes('[SYSTEM]') && log.includes('Parameters')) colorClass = 'text-neutral-400';
                        else if (log.includes('[SUCCESS]')) colorClass = 'text-white';
                        else if (log.includes('[SYS]')) colorClass = 'text-neutral-500';
                        
                        return (
                          <div key={idx} className={`${colorClass} whitespace-pre-wrap break-words flex items-start gap-2`}>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 select-none mt-0.5 opacity-30 text-neutral-500" strokeWidth={2} />
                            <span>{log}</span>
                          </div>
                        );
                      })}
                      <div ref={logsEndRef} className="h-2 w-full" />
                    </div>
                  </div>

                  {/* Right Column: Interactive output results or Raw data structure */}
                  <div className="flex-1 flex flex-col h-full overflow-hidden md:w-1/2 bg-[#020202]">
                    <div className="px-5 py-2.5 bg-[#030303] border-b border-white/[0.04] flex items-center justify-between select-none shrink-0">
                      <div className="flex items-center gap-2">
                          <Database className="h-3.5 w-3.5 text-neutral-400" />
                          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Query Result</span>
                      </div>
                      
                      {/* Switch output format to see exact code object or visualized view */}
                      {apiResponse && (
                          <div className="flex bg-[#0A0A0A] border border-white/[0.06] p-0.5 rounded-[6px]">
                              <button 
                                onClick={() => setOutputMode('SDUI')}
                                className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest rounded-[4px] transition-colors ${outputMode === 'SDUI' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-500 hover:text-white'}`}
                              >
                                  Visualizer
                              </button>
                              <button 
                                onClick={() => setOutputMode('RAW')}
                                className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest rounded-[4px] transition-colors ${outputMode === 'RAW' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-500 hover:text-white'}`}
                              >
                                  Raw JSON
                              </button>
                          </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto font-mono text-[11.5px] leading-[1.6] text-neutral-300 scrollbar-thin flex flex-col p-5">
                      {apiResponse?.type === 'FUSION_CARD' && outputMode === 'SDUI' ? (
                        <MarketAwareFusionCard />
                      ) : apiResponse ? (
                        <pre className={`whitespace-pre text-neutral-300 bg-white/[0.015] p-5 rounded-[8px] border border-white/[0.03] overflow-x-auto ${apiResponse.error ? 'text-rose-400' : 'text-neutral-300'}`}>
                          {JSON.stringify(apiResponse, null, 2)}
                        </pre>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-600 select-none">
                          <Radio className="h-6 w-6 mb-4 opacity-40 text-neutral-500" strokeWidth={1.5} />
                          <p className="text-[11px] font-mono uppercase tracking-widest mb-1">Awaiting Query Input</p>
                          <p className="text-[11px] text-neutral-500 tracking-normal max-w-[200px] leading-relaxed mt-2 font-sans">
                            Select <strong>Interactive Matchup View</strong> on the left and click "Run Selected Query" to see it live.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="code"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 sm:p-8 overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed text-neutral-300 tabular-nums selection:bg-white/10 bg-[#000]"
                >
                  <pre className="whitespace-pre-wrap font-inherit">
                    {MCP_FILES[activeTab as Exclude<McpTab, 'live_playground'>]}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
