import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, Cpu, Terminal, Layers, RefreshCw, 
  CheckCircle2, Play, Cloud, Mail, Calendar, 
  FileText, CheckSquare, Lock, AlertTriangle, ArrowRight
} from 'lucide-react';

// ============================================================================
// Types & Interfaces
// ============================================================================
interface WorkspaceBlueprintProps {
  user?: { email?: string; name?: string };
  token?: string | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

type TabType = 'architecture' | 'normalizers' | 'mcp' | 'deploy';
type NormalizerTarget = 'GMAIL' | 'CALENDAR' | 'DRIVE' | 'TASKS';

// ============================================================================
// Primary Component
// ============================================================================
export function WorkspaceOrchestrationBlueprint({ user, token, onSignIn, onSignOut }: WorkspaceBlueprintProps) {
  const [activeTab, setActiveTab] = useState<TabType>('architecture');
  const [interactiveApproved, setInteractiveApproved] = useState<boolean>(false);
  
  // Live Mapping Execution State
  const [normalizerInput, setNormalizerInput] = useState<NormalizerTarget>('GMAIL');
  const [isNormalizing, setIsNormalizing] = useState<boolean>(false);
  const [normalizeOutput, setNormalizeOutput] = useState<any>(null);

  // Live MCP Build Pipeline State
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ============================================================================
  // Live API Execution: Normalization Layer
  // ============================================================================
  const executeLiveNormalizer = async (source: NormalizerTarget) => {
    setIsNormalizing(true);
    setNormalizeOutput(null);
    setNormalizerInput(source);
    
    try {
      const response = await fetch('/api/workspace/normalize', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ source })
      });

      if (!response.ok) {
          if (response.status === 401) throw new Error("UNAUTHORIZED: Google Workspace OAuth token required.");
          throw new Error(`Upstream Provider Fault: HTTP ${response.status}`);
      }

      const data = await response.json();
      setNormalizeOutput(data);
    } catch (error: any) {
      setNormalizeOutput({
        error: "Execution Fault",
        details: error.message,
        resolution: "Ensure backend endpoint /api/workspace/normalize is provisioned and token is valid."
      });
    } finally {
      setIsNormalizing(false);
    }
  };

  // ============================================================================
  // Live API Execution: MCP Deployment Pipeline
  // ============================================================================
  const triggerLivePipeline = async () => {
    if (isCompiling) return;
    if (!interactiveApproved) {
        setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] [AURA:SECURITY] Execution aborted. Trust Gate invariant locked.`]);
        return;
    }
    
    setIsCompiling(true);
    setDeployUrl(null);
    setLogs([
        `[${new Date().toISOString().split('T')[1].split('.')[0]}] [SYS] Initiating remote GCP build sequence...`,
        `[${new Date().toISOString().split('T')[1].split('.')[0]}] [SYS] Target context: workspace-bridge`
    ]);

    try {
      const response = await fetch('/api/mcp/deploy', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ target: 'workspace-bridge', authorized: interactiveApproved })
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("UNAUTHORIZED: Google Workspace OAuth token required.");
        throw new Error(`Pipeline rejected execution request (HTTP ${response.status})`);
      }

      const data = await response.json();

      // Inject server-provided logs or fallback to a completion statement
      if (data.logs && Array.isArray(data.logs)) {
        setLogs(prev => [...prev, ...data.logs.map((l: string) => `[REMOTE] ${l}`)]);
      } else {
        setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] [SYS] Build verified. Synced with Artifact Registry.`]);
      }

      if (data.url) {
        setDeployUrl(data.url);
        setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] [SYS] Ingress routed live at ${data.url}`]);
      }

    } catch (error: any) {
      setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] [FATAL] Pipeline terminated: ${error.message}`]);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="w-full pt-4 animate-in fade-in duration-700 ease-[0.16,1,0.3,1] font-sans text-left">
      
      {/* Structural Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-white/[0.04] pb-8">
        <div>
          <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-mono tracking-widest uppercase mb-3 select-none">
            <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse shadow-[0_0_8px_rgba(52,199,89,0.5)]" />
            Live Infrastructure Blueprint
          </div>
          <h2 className="text-[24px] sm:text-[28px] font-medium text-white/95 tracking-tight leading-none mb-3">
            Workspace Orchestration
          </h2>
          <p className="text-neutral-400 text-[13px] max-w-2xl font-normal leading-relaxed">
            Immutable structural definitions for Google Workspace integration, contextual routing, and on-demand GCP container deployment.
          </p>
        </div>
        <div className="flex items-center gap-2 select-none shrink-0">
          <div className="bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 rounded-[6px] flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-neutral-500" />
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Aura Engine 2.0</span>
          </div>
        </div>
      </div>

      {/* Institutional Tab Router */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/[0.04] mb-8 pb-px select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { id: 'architecture', label: '1. Router', icon: ShieldAlert },
          { id: 'normalizers', label: '2. Normalizers', icon: Layers },
          { id: 'mcp', label: '3. Code Factory', icon: Cpu },
          { id: 'deploy', label: '4. Pipeline', icon: Cloud },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2.5 px-5 py-3 text-[11px] font-mono uppercase tracking-widest whitespace-nowrap transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/20 border-b-2 ${
                isActive 
                  ? 'border-neutral-400 text-neutral-200 bg-white/[0.02]' 
                  : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.01]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-[450px]"
        >
          {/* ============================================================================ */}
          {/* TAB 1: ARCHITECTURE */}
          {/* ============================================================================ */}
          {activeTab === 'architecture' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-[24px] p-6 lg:p-8">
                  <h3 className="text-[16px] font-medium text-white/95 mb-4 flex items-center gap-2.5">
                    <Cpu className="h-4 w-4 text-neutral-400" />
                    Agentic Workspace Routing
                  </h3>
                  <p className="text-neutral-400 text-[13px] leading-relaxed font-normal mb-8">
                    Aura resolves Google workspace interactions not by executing simple API lookups, but by spawning 
                    high-density orchestrating agents. These agents run inside sandboxed execution frames and construct 
                    strict, deterministic Server-Driven UI (SDUI) artifacts on demand.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#050505] border border-white/[0.04] rounded-[16px] p-5">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-3">Module A</div>
                      <h4 className="text-[14px] font-medium text-white/90 mb-2">Scatter-Gather Routing</h4>
                      <p className="text-[12px] text-neutral-500 leading-relaxed">Pulls metadata across threads and normalizes content to build secure context summaries.</p>
                    </div>
                    <div className="bg-[#050505] border border-white/[0.04] rounded-[16px] p-5">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-3">Module B</div>
                      <h4 className="text-[14px] font-medium text-white/90 mb-2">Intent Scheduling</h4>
                      <p className="text-[12px] text-neutral-500 leading-relaxed">Extractions temporal variables and maps them to pristine appointments with zero conflicts.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.01] border border-white/[0.04] rounded-[24px] p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert className="h-4 w-4 text-[#FF3B30]" />
                    <h3 className="text-[16px] font-medium text-white/95">Trust Gate Invariant Guard</h3>
                  </div>
                  <p className="text-neutral-400 text-[13px] leading-relaxed mb-6">
                    Mutating operations (drafting an email, creating tasks) are held in a pending execution lock until receiving interactive approval from the user.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#050505] rounded-[16px] p-5 border border-white/[0.04] select-none">
                    <div className="flex flex-col">
                      <div className="text-[13px] font-mono text-neutral-200">requireInteractiveApproval()</div>
                      <div className="text-[10px] text-neutral-500 font-mono mt-1.5 uppercase tracking-widest">
                          State: {interactiveApproved ? <span className="text-[#34C759]">UNLOCKED</span> : <span className="text-[#FF9500]">LOCKED (HOLD_FOR_INPUT)</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => setInteractiveApproved(!interactiveApproved)}
                      className={`px-5 py-2.5 rounded-[8px] text-[10px] font-mono font-bold uppercase tracking-widest transition-all duration-300 active:scale-[0.96] outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                        interactiveApproved 
                          ? 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20' 
                          : 'bg-white/[0.04] text-neutral-400 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      {interactiveApproved ? 'Lock Removed' : 'Approve Execution'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="bg-white/[0.01] border border-white/[0.04] rounded-[24px] p-6 h-fit">
                <h4 className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest mb-6">Execution Specs</h4>
                <div className="space-y-6">
                  <div>
                    <strong className="text-[12px] font-medium text-neutral-200 block mb-1.5">OAuth Integration</strong>
                    <p className="text-neutral-500 text-[11px] leading-relaxed">Standard scopes stored securely in memory. No persistence of active access tokens.</p>
                  </div>
                  <div className="h-px w-full bg-white/[0.04]" />
                  <div>
                    <strong className="text-[12px] font-medium text-neutral-200 block mb-1.5">Deterministic Normalization</strong>
                    <p className="text-neutral-500 text-[11px] leading-relaxed">Converts raw API payloads to immutable structures before LLM evaluation.</p>
                  </div>
                  <div className="h-px w-full bg-white/[0.04]" />
                  <div>
                    <strong className="text-[12px] font-medium text-neutral-200 block mb-1.5">Multi-Agent Router</strong>
                    <p className="text-neutral-500 text-[11px] leading-relaxed">Recognizes semantic intent, extracts contextual parameters, and delegates.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================================ */}
          {/* TAB 2: NORMALIZERS */}
          {/* ============================================================================ */}
          {activeTab === 'normalizers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-[24px] p-6 lg:p-8">
                  <h3 className="text-[16px] font-medium text-white/95 mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-neutral-400" />
                    Canonical Mapping Layer
                  </h3>
                  <p className="text-neutral-400 text-[13px] leading-relaxed mb-8">
                    Select an upstream provider to trigger a live execution of the <code className="text-neutral-300 bg-white/[0.05] px-1.5 py-0.5 rounded font-mono text-[11px]">/api/workspace/normalize</code> endpoint. Real data is fetched from Google APIs and structurally typed in real-time.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-8 select-none font-mono">
                    {[
                      { id: 'GMAIL', label: 'Gmail API', icon: Mail },
                      { id: 'CALENDAR', label: 'Calendar API', icon: Calendar },
                      { id: 'DRIVE', label: 'Drive API', icon: FileText },
                      { id: 'TASKS', label: 'Tasks API', icon: CheckSquare },
                    ].map(btn => {
                      const Icon = btn.icon;
                      const isSel = normalizerInput === btn.id;
                      return (
                        <button
                          key={btn.id}
                          onClick={() => executeLiveNormalizer(btn.id as NormalizerTarget)}
                          disabled={isNormalizing}
                          className={`flex items-center gap-3 px-4 py-3 rounded-[12px] text-[10px] uppercase tracking-widest transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/20 active:scale-[0.98] ${
                            isSel 
                              ? 'bg-[#050505] border-neutral-600 text-white shadow-sm' 
                              : 'bg-white/[0.01] border-white/[0.04] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03]'
                          } border disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <Icon className="h-4 w-4 opacity-70 shrink-0" />
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="bg-[#050505] border border-white/[0.04] rounded-[16px] p-5 font-mono text-[10px] tracking-wide relative overflow-hidden select-none">
                    <div className="flex items-center justify-between text-neutral-500 mb-4 pb-3 border-b border-white/[0.04] uppercase">
                      <span>Pipeline Routing</span>
                      <span className="text-neutral-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-neutral-500 rounded-full" /> Live Socket</span>
                    </div>

                    <div className="flex flex-col gap-3 relative z-10 text-neutral-400">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="bg-white/[0.02] px-2.5 py-1 border border-white/[0.04] rounded-[6px]">Raw API JSON</span>
                        <ArrowRight className="h-3 w-3 text-neutral-600 shrink-0" />
                        <span className="bg-white text-black px-2.5 py-1 rounded-[6px] font-semibold">Normalizer ACL</span>
                        <ArrowRight className="h-3 w-3 text-neutral-600 shrink-0" />
                        <span className="bg-[#050505] px-2.5 py-1 border border-white/[0.04] text-neutral-300 rounded-[6px]">CanonicalDTO</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#050505] border border-white/[0.04] rounded-[24px] overflow-hidden flex flex-col h-[520px] font-mono">
                <div className="bg-[#0A0A0A] px-6 py-4 border-b border-white/[0.04] flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-neutral-500" />
                    <span className="text-neutral-300 uppercase tracking-widest text-[10px] font-bold">Execution Output</span>
                  </div>
                  {isNormalizing ? (
                    <RefreshCw className="h-3.5 w-3.5 text-neutral-500 animate-spin" />
                  ) : (
                    <span className="text-neutral-500 text-[9px] uppercase tracking-widest">IDLE</span>
                  )}
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 text-[11px] text-neutral-400 tabular-nums lining-nums select-text [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {normalizeOutput ? (
                    <pre className={`whitespace-pre-wrap leading-relaxed break-words outline-none ${normalizeOutput.error ? 'text-[#FF3B30]' : ''}`}>
                        {JSON.stringify(normalizeOutput, null, 2)}
                    </pre>
                  ) : (
                    <div className="flex flex-col gap-4 items-center justify-center py-20 text-neutral-600 opacity-80 uppercase tracking-widest text-center px-4">
                      {isNormalizing ? (
                          <span>Executing live upstream API fetch...</span>
                      ) : (
                          <>
                              <span>Select a provider to execute mapping sequence.</span>
                              {!token && <span className="text-[#FF9500] mt-2 block">Warning: OAuth Token missing. Request will likely fail.</span>}
                          </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================================ */}
          {/* TAB 3: MCP SYNTHESIS */}
          {/* ============================================================================ */}
          {activeTab === 'mcp' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-[24px] p-6 lg:p-8 h-full">
                  <h3 className="text-[16px] font-medium text-white/95 mb-4 flex items-center gap-2.5">
                    <Cpu className="h-4 w-4 text-neutral-400" />
                    AI-Ops MCP Server Execution
                  </h3>
                  <p className="text-neutral-400 text-[13px] leading-relaxed mb-8">
                    Aura dynamically synthesizes dedicated Model Context Protocol (MCP) microservices on the fly by parsing OpenAPI spec endpoints and resolving structural bindings automatically.
                  </p>

                  <div className="bg-[#050505] border border-white/[0.04] rounded-[16px] p-6 font-mono text-[11px] tracking-wide">
                    <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-6 select-none">Static Compilation Invariants</div>
                    <ul className="space-y-6 text-neutral-300">
                      <li className="flex items-start gap-4">
                        <span className="text-[#34C759] font-bold shrink-0 mt-0.5"><CheckCircle2 className="h-4 w-4" /></span>
                        <div>
                          <strong className="text-neutral-200 block mb-1 font-semibold">tsc --noEmit Analysis</strong>
                          <span className="text-neutral-500 leading-relaxed block mt-1.5">Execution is aborted if the compiler identifies unresolved bindings or schema leaks in the generated artifact.</span>
                        </div>
                      </li>
                      <li className="flex items-start gap-4">
                        <span className="text-[#34C759] font-bold shrink-0 mt-0.5"><CheckCircle2 className="h-4 w-4" /></span>
                        <div>
                          <strong className="text-neutral-200 block mb-1 font-semibold">Port Binding Safeguards</strong>
                          <span className="text-neutral-500 leading-relaxed block mt-1.5">Auto-configures express ingress to bind securely to 0.0.0.0:3000 for standard reverse proxy routing.</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#050505] border border-white/[0.04] rounded-[24px] p-6 lg:p-10 flex flex-col items-center justify-center text-center">
                 <Cloud className="h-12 w-12 text-neutral-600 mb-6" strokeWidth={1.5} />
                 <h4 className="text-[18px] font-medium text-white/90 mb-3">Initialize Build Rig</h4>
                 <p className="text-[13px] text-neutral-500 mb-10 max-w-sm leading-relaxed">Trigger the actual backend <code className="bg-white/[0.05] border border-white/[0.1] px-1.5 py-0.5 rounded text-neutral-300 font-mono text-[11px]">/api/mcp/deploy</code> endpoint to execute real static checks and initialize Google Cloud Build.</p>
                 
                 <button
                    disabled={isCompiling}
                    onClick={() => setActiveTab('deploy')}
                    className="px-8 py-4 rounded-[12px] text-[11px] font-mono font-bold uppercase tracking-widest transition-all duration-300 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-white/20 bg-white text-black hover:bg-neutral-200"
                  >
                    Proceed to Deployment Pipeline
                  </button>
              </div>
            </div>
          )}

          {/* ============================================================================ */}
          {/* TAB 4: DEPLOY PIPELINE */}
          {/* ============================================================================ */}
          {activeTab === 'deploy' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-[24px] p-6 lg:p-8">
                  <h3 className="text-[16px] font-medium text-white/95 mb-4 flex items-center gap-2.5">
                    <Lock className="h-4 w-4 text-neutral-400" />
                    Secure GCP Secret Ledger
                  </h3>
                  <p className="text-neutral-400 text-[13px] leading-relaxed mb-8">
                    Third-party API tokens and user OAuth handles reside strictly inside secure KMS Secret Managers. <strong className="text-neutral-200 font-medium">Active client-side JavaScript is strictly forbidden from fetching or exposing these resources.</strong>
                  </p>

                  <div className="space-y-4 font-mono text-[11px] text-neutral-400 select-none tabular-nums lining-nums uppercase tracking-widest">
                    <div className="flex justify-between items-center p-3.5 bg-[#050505] border border-white/[0.04] rounded-[12px]">
                      <span>OAUTH_TOKEN</span>
                      {token ? (
                        <span className="text-[#34C759] font-bold truncate max-w-[150px] text-[10px]">
                          {user?.email || 'RESOLVED'}
                        </span>
                      ) : (
                        <button onClick={onSignIn} className="text-[#FF9500] hover:text-[#FF9500]/80 font-bold cursor-pointer transition-colors text-[10px] outline-none focus-visible:ring-1 focus-visible:ring-white/20 rounded">
                          CONNECT IDENTITY
                        </button>
                      )}
                    </div>
                    <div className="flex justify-between items-center p-3.5 bg-[#050505] border border-white/[0.04] rounded-[12px]">
                      <span>GCP_CREDENTIALS</span>
                      <span className="text-neutral-600 font-bold text-[10px]">INJECTED</span>
                    </div>
                  </div>

                  <div className="bg-[#050505] border border-white/[0.04] rounded-[16px] p-5 mt-8 flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div className="text-[12px] text-neutral-500 leading-relaxed font-sans">
                        <strong className="text-neutral-300 block mb-1">Least Privilege IAM</strong>
                        Cloud Build service accounts bind tightly to Google Artifact Registry scopes, restricting read/write capabilities dynamically at compile-time.
                      </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#050505] border border-white/[0.04] rounded-[24px] overflow-hidden flex flex-col h-[550px] font-mono">
                <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between bg-[#0A0A0A] select-none">
                  <span className="text-neutral-300 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                     <Terminal className="h-3.5 w-3.5 text-neutral-500" /> Server Execution Logs
                  </span>
                  {isCompiling && <span className="animate-pulse text-neutral-500 text-[9px] tracking-widest uppercase">Streaming</span>}
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 text-[11px] text-neutral-400 tabular-nums lining-nums leading-[1.65] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {logs.length > 0 ? (
                    logs.map((log, index) => (
                      <div key={index} className={`mb-1.5 break-words hover:text-neutral-300 transition-colors ${log.includes('FATAL') || log.includes('FAULT') ? 'text-[#FF3B30]' : log.includes('verified') || log.includes('live at') ? 'text-[#34C759]' : 'text-neutral-400'}`}>
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 text-neutral-600 uppercase tracking-widest text-[10px] select-none opacity-60">
                      Awaiting remote execution trigger...
                    </div>
                  )}
                  {deployUrl && (
                      <div className="mt-6 p-5 border border-[#34C759]/20 bg-[#34C759]/5 rounded-[12px] text-center select-none">
                          <span className="block text-[10px] text-neutral-500 uppercase tracking-widest mb-2">Ingress Provisioned</span>
                          <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="text-[#34C759] text-[11px] font-bold hover:underline break-all outline-none focus-visible:ring-2 focus-visible:ring-[#34C759]/50 rounded px-2 py-1">
                              {deployUrl}
                          </a>
                      </div>
                  )}
                  <div ref={logsEndRef} className="h-4 w-full" />
                </div>

                <div className="p-4 border-t border-white/[0.04] bg-[#0A0A0A]">
                    <button
                      disabled={isCompiling}
                      onClick={triggerLivePipeline}
                      className={`w-full py-3.5 rounded-[8px] text-[10px] font-bold uppercase tracking-widest transition-all duration-300 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-white/20 select-none ${
                        isCompiling 
                          ? 'bg-[#050505] text-neutral-600 border border-white/[0.02] cursor-not-allowed' 
                          : interactiveApproved
                            ? 'bg-white text-black border border-white hover:bg-neutral-200 cursor-pointer'
                            : 'bg-transparent text-[#FF9500] border border-[#FF9500]/30 hover:bg-[#FF9500]/10 cursor-pointer'
                      }`}
                    >
                      {isCompiling ? 'Executing...' : interactiveApproved ? 'Trigger Cloud Build' : 'Locked: Requires Trust Gate Approval'}
                    </button>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
