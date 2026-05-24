import React, { Component, ReactNode, ErrorInfo } from 'react';
import Markdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'motion/react';
import { BettingAnglesCarousel } from './BettingAnglesCarousel';

// ============================================================================
// Type Definitions
// ============================================================================
export interface ChartLine {
  dataKey: string;
  color?: string;
}

export interface ChartConfig {
  title: string;
  data: Record<string, any>[];
  lines: ChartLine[];
  type?: 'bar' | 'line';
}

export interface ConsensusSplit {
  betType: string;
  selectionHome: string;
  selectionAway: string;
  homeTickets: number | string;
  homeMoney: number | string;
  awayTickets: number | string;
  awayMoney: number | string;
  sharpSignal?: string;
}

export interface ConsensusData {
  game_name: string;
  splits: ConsensusSplit[];
}

export interface AnalysisData {
  analysis_markdown: string;
  angles?: any[];
  chart?: ChartConfig;
  consensus?: ConsensusData;
  groundingLinks?: { uri: string; title: string }[];
}

// ============================================================================
// Utilities
// ============================================================================
const parseNumeric = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
      // Strips currency, percentages, and plus signs, keeps negatives and decimals
      const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ""));
      return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// ============================================================================
// Static Markdown Configuration (Prevents Re-render Cascades)
// ============================================================================
const REMARK_PLUGINS = [remarkGfm];

const MARKDOWN_COMPONENTS: Components = {
  p: ({ node, ...props }) => <p className="mb-6 last:mb-0" {...props} />,
  h1: ({ node, ...props }) => <h1 className="text-[20px] font-medium tracking-tight text-neutral-100 mt-12 mb-5" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-[17px] font-medium tracking-tight text-neutral-200 mt-10 mb-4" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-[15px] font-medium tracking-tight text-neutral-300 mt-8 mb-3" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-none space-y-3 mt-4 mb-8 text-neutral-400" {...props} />,
  li: ({ node, ...props }) => (
    <li className="relative pl-5 before:absolute before:left-0 before:top-[0.6em] before:w-2 before:h-px before:bg-neutral-600" {...props} />
  ),
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mt-4 mb-8 space-y-3 text-neutral-400 marker:text-neutral-600 tabular-nums" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-medium text-neutral-200" {...props} />,
  a: ({ node, ...props }) => (
    <a 
        className="text-neutral-200 hover:text-neutral-400 underline underline-offset-4 decoration-neutral-700 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-sm" 
        target="_blank" 
        rel="noopener noreferrer" 
        {...props} 
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l border-neutral-700 pl-5 py-1 my-7 text-neutral-500 italic font-serif text-[16px] leading-relaxed" {...props} />
  )
};

// ============================================================================
// Internal Error Boundary (Protects UI from LLM Hallucinations)
// ============================================================================
interface BoundaryProps { children: ReactNode; }
interface BoundaryState { hasError: boolean; }

class MasterclassErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  public state: BoundaryState = { hasError: false };

  public static getDerivedStateFromError(_: Error): BoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AURA:UI:FAULT] Masterclass render failure:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full my-8 bg-white/[0.01] border border-white/[0.04] rounded-[16px] p-6 text-left backdrop-blur-md">
            <h4 className="text-[13px] font-medium text-neutral-400 tracking-widest uppercase">
                Visualization Fault
            </h4>
            <p className="text-[13px] text-neutral-500 mt-2 leading-relaxed">
                The intelligence engine returned an irregular structural payload. Data visualization has been suppressed to maintain application stability.
            </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// Sub-Components
// ============================================================================
const ConsensusTracker = React.memo(({ consensus }: { consensus: ConsensusData }) => {
  if (!consensus || !consensus.splits || consensus.splits.length === 0) return null;

  return (
    <div className="mt-14 mb-16" role="region" aria-label="Market Distribution">
      <div className="border-b border-white/5 pb-4 mb-8 text-left">
        <h4 className="text-[15px] font-medium text-neutral-200 tracking-tight">
          Market Distribution
        </h4>
        <p className="text-[13px] text-neutral-500 mt-1.5 font-normal">
          Index volume compared with capital splits for {consensus.game_name || 'active matchup'}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {consensus.splits.map((split, index) => {
          const homeT = parseNumeric(split.homeTickets);
          const awayT = parseNumeric(split.awayTickets);
          const homeM = parseNumeric(split.homeMoney);
          const awayM = parseNumeric(split.awayMoney);

          const totalT = Math.max(homeT + awayT, 1);
          const totalM = Math.max(homeM + awayM, 1);

          const hTPercent = Math.round((homeT / totalT) * 100);
          const aTPercent = 100 - hTPercent;

          const hMPercent = Math.round((homeM / totalM) * 100);
          const aMPercent = 100 - hMPercent;

          const dispHome = hMPercent - hTPercent;
          const dispAway = aMPercent - aTPercent;
          const maxDisp = Math.max(Math.abs(dispHome), Math.abs(dispAway));

          // Institutional definition of sharp divergence (>12% variance)
          const hasDeviation = maxDisp >= 12;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[16px] p-6 bg-white/[0.02] border border-white/[0.04] backdrop-blur-md flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-medium text-neutral-500 tracking-widest uppercase select-none">
                    {split.betType}
                  </span>
                  {hasDeviation && (
                    <span className="text-[10px] font-medium text-neutral-300 bg-white/[0.04] px-2 py-0.5 rounded uppercase tracking-widest select-none">
                      Divergence
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[13px] font-medium text-neutral-200 mb-6 border-b border-white/[0.04] pb-4">
                  <span className="truncate max-w-[44%]">{split.selectionHome || 'Home'}</span>
                  <span className="text-neutral-600 text-[9px] font-medium uppercase tracking-widest select-none">vs</span>
                  <span className="truncate max-w-[44%] text-right">{split.selectionAway || 'Away'}</span>
                </div>

                <div className="space-y-6">
                  {/* Tickets */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-2.5 font-mono select-none tracking-wide tabular-nums">
                      <span className="text-neutral-500 font-sans">Tickets</span>
                      <span className="text-neutral-400">{hTPercent}% / {aTPercent}%</span>
                    </div>
                    <div className="w-full h-[3px] bg-white/[0.03] rounded-full overflow-hidden flex" role="progressbar" aria-valuenow={hTPercent} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full bg-white/20 transition-all duration-700 ease-out" style={{ width: `${hTPercent}%` }} />
                      <div className="h-full bg-white/5 transition-all duration-700 ease-out" style={{ width: `${aTPercent}%` }} />
                    </div>
                  </div>

                  {/* Capital */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-2.5 font-mono select-none tracking-wide tabular-nums">
                      <span className="text-neutral-500 font-sans">Capital</span>
                      <span className="text-neutral-200">{hMPercent}% / {aMPercent}%</span>
                    </div>
                    <div className="w-full h-[3px] bg-white/[0.03] rounded-full overflow-hidden flex" role="progressbar" aria-valuenow={hMPercent} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full bg-white/60 transition-all duration-700 ease-out" style={{ width: `${hMPercent}%` }} />
                      <div className="h-full bg-white/10 transition-all duration-700 ease-out" style={{ width: `${aMPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {split.sharpSignal && (
                <div className="mt-7 pt-5 border-t border-white/[0.04]">
                  <p className="text-[12px] leading-relaxed text-neutral-400 font-normal">
                    {split.sharpSignal}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});
ConsensusTracker.displayName = 'ConsensusTracker';


const StatisticalTable = React.memo(({ chart }: { chart: ChartConfig }) => {
  if (!chart?.data || !chart?.lines || !Array.isArray(chart.data) || !Array.isArray(chart.lines) || chart.data.length === 0 || chart.lines.length === 0) {
    return null;
  }

  return (
    <div className="mt-14 mb-8 bg-white/[0.02] border border-white/[0.04] rounded-[20px] overflow-hidden p-8 backdrop-blur-sm">
      <div className="mb-8 pb-5 border-b border-white/[0.04]">
          <h4 className="text-[15px] font-medium text-neutral-200 tracking-tight">
              {chart.title || 'Statistical Baseline'}
          </h4>
      </div>
      
      <div className="w-full overflow-x-auto">
         <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                  <tr>
                      <th className="py-2 px-4 font-medium text-neutral-500 text-[11px] tracking-widest uppercase border-b border-white/[0.04] select-none"></th>
                      {chart.lines.map((line, idx) => (
                          <th key={idx} className="py-2 px-4 font-medium text-neutral-500 text-[11px] tracking-widest uppercase border-b border-white/[0.04] whitespace-nowrap text-right select-none">
                              {line.dataKey}
                          </th>
                      ))}
                  </tr>
              </thead>
              <tbody>
                  {chart.data.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors">
                          <td className="py-3.5 px-4 text-neutral-400 text-[13px] font-medium whitespace-nowrap font-sans">
                              {row.name || `Row ${rowIdx + 1}`}
                          </td>
                          {chart.lines.map((line, colIdx) => {
                              const rawVal = row[line.dataKey];
                              const numVal = parseNumeric(rawVal);
                              
                              const values = chart.data
                                  .map(d => parseNumeric(d[line.dataKey]))
                                  .filter(n => !isNaN(n));
                              
                              const min = values.length > 0 ? Math.min(...values) : 0;
                              const max = values.length > 0 ? Math.max(...values) : 0;
                              
                              let opacity = 0;
                              if (!isNaN(numVal) && max > min) {
                                  opacity = 0.02 + ((numVal - min) / (max - min)) * 0.12;
                              } else if (values.length > 0 && !isNaN(numVal)) {
                                  opacity = 0.05; 
                              }

                              return (
                                  <td key={colIdx} className="py-2 px-2 relative font-mono text-[13px] text-neutral-200 text-right tabular-nums lining-nums">
                                      <div 
                                          className="absolute inset-[4px] rounded-md pointer-events-none transition-opacity duration-500" 
                                          style={{ backgroundColor: 'rgba(255, 255, 255, 1)', opacity }}
                                      />
                                      <div className="relative px-3 py-1.5 z-10">
                                          {rawVal ?? '-'}
                                      </div>
                                  </td>
                              );
                          })}
                      </tr>
                  ))}
              </tbody>
         </table>
      </div>
    </div>
  );
});
StatisticalTable.displayName = 'StatisticalTable';

// ============================================================================
// Primary Renderer
// ============================================================================
function MasterclassContent({ data }: { data: AnalysisData }) {
  if (!data || !data.analysis_markdown) return null;

  return (
    <div className="w-full mb-8 font-sans animate-in fade-in slide-in-from-bottom-4 duration-1000 relative text-left">
      
      <div className="text-[10px] font-medium text-neutral-500 tracking-widest uppercase mb-8 select-none">
          Quantitative Baseline
      </div>

      <div className="text-[15px] text-neutral-300 leading-[1.75] font-normal tracking-[-0.01em]">
          <Markdown
            remarkPlugins={REMARK_PLUGINS}
            components={MARKDOWN_COMPONENTS}
          >
             {data.analysis_markdown}
          </Markdown>
      </div>

      <ConsensusTracker consensus={data.consensus as ConsensusData} />

      {data.angles && Array.isArray(data.angles) && data.angles.length > 0 && (
          <div className="my-10">
              <BettingAnglesCarousel data={JSON.stringify(data.angles)} />
          </div>
      )}

      <StatisticalTable chart={data.chart as ChartConfig} />
    </div>
  );
}

// ============================================================================
// Default Export (Wrapped in Error Boundary)
// ============================================================================
export function AnalyticalMasterclass({ data }: { data: AnalysisData }) {
    return (
        <MasterclassErrorBoundary>
            <MasterclassContent data={data} />
        </MasterclassErrorBoundary>
    );
}
