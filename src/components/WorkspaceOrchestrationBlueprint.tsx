import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, ShieldAlert, Cpu, Terminal, Layers, RefreshCw, Key, 
  Settings, CheckCircle2, AlertTriangle, Play, HelpCircle, HardDrive, 
  Mail, Calendar, FileText, CheckSquare, Cloud, ArrowRight, GitCommit, FileCode
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================
interface NormalizerLog {
  api: 'Gmail' | 'Calendar' | 'Drive' | 'Tasks';
  rawSize: string;
  normalizedEntity: string;
  status: 'SUCCESS' | 'RESOLVED' | 'WARNING';
}

interface SimulatedStep {
  id: string;
  state: 'pending' | 'running' | 'success' | 'failed';
  title: string;
  desc: string;
  output?: string;
}

interface WorkspaceOrchestrationBlueprintProps {
  user?: any;
  token?: string | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export function WorkspaceOrchestrationBlueprint({ user, token, onSignIn, onSignOut }: WorkspaceOrchestrationBlueprintProps = {}) {
  const [activeTab, setActiveTab] = useState<'architecture' | 'normalizers' | 'mcp' | 'deploy'>('architecture');
  
  // Normalizer Simulator State
  const [selectedEntity, setSelectedEntity] = useState<string>('LAL_game');
  const [normalizerInput, setNormalizerInput] = useState<string>('GMAIL');
  const [isNormalizing, setIsNormalizing] = useState<boolean>(false);
  const [normalizeOutput, setNormalizeOutput] = useState<any>(null);

  // MCP Build & Deploy Simulator State
  const [mcpStep, setMcpStep] = useState<number>(0);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [buildSteps, setBuildSteps] = useState<SimulatedStep[]>([
    { id: 'docker', state: 'pending', title: 'Dockerfile Generation', desc: 'Synthesizing production-ready multi-stage Node runtime.' },
    { id: 'compile', state: 'pending', title: 'tsc Verification', desc: 'Validating generated code using tsc --noEmit static analysis.' },
    { id: 'gcb', state: 'pending', title: 'Google Cloud Build Submission', desc: 'Pushing build context to ggs://aura-build-cache bucket.' },
    { id: 'gcr', state: 'pending', title: 'Artifact Registry Synthesis', desc: 'Tagging and pushing container image to pkg.dev.' },
    { id: 'run', state: 'pending', title: 'Cloud Run Provisioning', desc: 'Orchestrating serverless deployment at gcp-run.app.' },
  ]);

  // Auth/Sign in credentials status
  const tokenCached = !!token;
  const [interactiveApproved, setInteractiveApproved] = useState<boolean>(false);

  // Normalizer Lookup Map
  const runNormalizer = (source: string) => {
    setIsNormalizing(true);
    setTimeout(() => {
      if (source === 'GMAIL') {
        setNormalizeOutput({
          metadata: {
            resolvedSender: "kofi.farkye@gmail.com",
            confidence_score: 1.0,
            api_version: "gmail.v1.normalizer"
          },
          canonical: {
            id: "msg_2481093x8",
            subject: "RE: AURA Investment & Partnership Prospectus",
            sender: {
              name: "Kofi Farkye",
              email: "kofi.farkye@gmail.com"
            },
            body: "Let's align next Tuesday regarding the scatter-gather normalizer layer deployment on Google Cloud Run...",
            receivedAt: "2026-05-24T15:02:44Z",
            importance: "HIGH",
            extractedEntities: {
              resolved_names: ["AURA", "GCP", "Google Cloud Run"],
              action_items: ["Align Tuesday regarding scatter-gather layer"]
            }
          }
        });
      } else if (source === 'CALENDAR') {
        setNormalizeOutput({
          metadata: {
            resolvedEvent: "aura-meeting-resolve",
            confidence_score: 0.98,
            api_version: "calendar.v3.normalizer"
          },
          canonical: {
            id: "evt_9023412",
            summary: "Aura Series A Architecture Sync",
            startTime: "2026-05-26T14:00:00Z",
            endTime: "2026-05-26T15:00:00Z",
            organizer: "kofi.farkye@gmail.com",
            attendees: ["kofi.farkye@gmail.com", "chief.architect@aura.ai"],
            location: "Google Meet (meet.google.com/aur-sync-sdui)",
            description: "Deep dive sync regarding security receipt gates and trust checking invariants."
          }
        });
      } else if (source === 'DRIVE') {
        setNormalizeOutput({
          metadata: {
            resolvedFile: "pdf-prospectus",
            confidence_score: 1.0,
            api_version: "drive.v3.normalizer"
          },
          canonical: {
            id: "file_8923419",
            name: "Aura_Enterprise_Pitch_v2.pdf",
            mimeType: "application/pdf",
            sizeBytes: 4194304,
            owner: "co-founder@aura.ai",
            lastModifiedBy: "Kofi Farkye",
            viewUrl: "https://drive.google.com/file/d/8923419/view"
          }
        });
      } else {
        setNormalizeOutput({
          metadata: {
            resolvedTask: "high-priority-action",
            confidence_score: 0.95,
            api_version: "tasks.v1.normalizer"
          },
          canonical: {
            id: "task_110293",
            title: "Configure GCP credentials securely inside Cloud Run env variables",
            dueDate: "2026-05-28",
            status: "NEEDS_ACTION",
            notes: "Declare in .env.example, never commit secrets to source git tree!"
          }
        });
      }
      setIsNormalizing(false);
    }, 550);
  };

  // Launch simulated Cloud Run build
  const triggerGcpBuild = () => {
    setIsCompiling(true);
    setMcpStep(0);
    setLogs([]);
    
    // Reset steps
    setBuildSteps(prev => prev.map(s => ({ ...s, state: 'pending', output: undefined })));

    const stepsToRun = [...buildSteps];
    let currentIdx = 0;

    const logMessages = [
      "[AURA:DEV] Generating context payload for custom MCP Server: 'gmail-sheets-bridge'...",
      "[AURA:DEV] Emitting Dockerfile using serverless multi-stage template...",
      "[AURA:COMPILER] Initiating code compilation verification check...",
      "[AURA:COMPILER] Executing static analysis: tsc --noEmit",
      "[AURA:COMPILER] Compilation verified successfully. 0 type leaks identified.",
      "[AURA:CLOUD_BUILD] Opening connection to Google Cloud Build api client...",
      "[AURA:CLOUD_BUILD] Submitting build cache payload bundle (Size: 4.8MB)...",
      "[AURA:CLOUD_BUILD] [Build Job: #1172] Compiling base container layer using Node 22-alpine...",
      "[AURA:CLOUD_BUILD] Pushing built layers onto us-east1-docker.pkg.dev/aura-hq/mcp-registry...",
      "[AURA:REGISTRY] Synthesized image: aura-hq/mcp-gmail-sheets-bridge:v1.0.0-rc2 (SHA256: e87f10b...)",
      "[AURA:CLOUD_RUN] Initiating serverless provisioning pipeline...",
      "[AURA:CLOUD_RUN] Allocating 1.0 CPU, 512MB RAM, Auto-scaling config [0-10] instance limits...",
      "[AURA:CLOUD_RUN] Injecting environment variables: GOOGLE_APPLICATION_CREDENTIALS, MONGO_DB_URI...",
      "[AURA:SECURITY] Invocation validated against Trust Gate Invariants. verified=true",
      "[AURA:DEPLOY] Routing revision live at https://mcp-gmail-sheets-bridge-iqyu4.run.app"
    ];

    const runNextStep = () => {
      if (currentIdx >= stepsToRun.length) {
        // Complete live call from generator
        fetch('/api/mcp/deploy', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.logs) {
              setLogs(prev => [...prev, ...data.logs.map((l: string) => `[LIVE_GENERATOR] ${l}`)]);
              if (data.url) {
                setBuildSteps(prev => prev.map((s, i) => {
                  if (i === 4) return { ...s, state: 'success', output: data.url };
                  return s;
                }));
              }
            }
          })
          .catch(err => {
            console.error("Live compilation sync fault:", err);
            setLogs(prev => [...prev, "[AURA:COMPILER_FAULT] Connection to live sandbox pipeline suspended."]);
          })
          .finally(() => {
            setIsCompiling(false);
            setMcpStep(5);
          });
        return;
      }

      setBuildSteps(prev => prev.map((s, i) => {
        if (i === currentIdx) return { ...s, state: 'running' };
        return s;
      }));

      // Append mock logs based on current index
      let stepLogs: string[] = [];
      if (currentIdx === 0) {
        stepLogs = logMessages.slice(0, 2);
      } else if (currentIdx === 1) {
        stepLogs = logMessages.slice(2, 5);
      } else if (currentIdx === 2) {
        stepLogs = logMessages.slice(5, 8);
      } else if (currentIdx === 3) {
        stepLogs = logMessages.slice(8, 10);
      } else if (currentIdx === 4) {
        stepLogs = logMessages.slice(10, 15);
      }

      setTimeout(() => {
        setLogs(prev => [...prev, ...stepLogs]);
        setBuildSteps(prev => prev.map((s, i) => {
          if (i === currentIdx) return { 
            ...s, 
            state: 'success', 
            output: currentIdx === 4 ? 'https://mcp-gmail-sheets-bridge-iqyu4.run.app' : 'verified' 
          };
          return s;
        }));
        
        currentIdx++;
        setMcpStep(currentIdx);
        runNextStep();
      }, 1000);
    };

    runNextStep();
  };

  useEffect(() => {
    runNormalizer(normalizerInput);
  }, [normalizerInput]);

  return (
    <div id="workspace-blueprint-container" className="pt-2 animate-in fade-in duration-700 ease-[0.16,1,0.3,1]">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#34C759] text-[10px] font-semibold tracking-wider uppercase mb-1.5 font-mono">
            <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-ping" />
            V1 Expansion Blueprint
          </div>
          <h2 className="text-[24px] sm:text-[28px] font-medium text-white tracking-tight leading-none">
            Enterprise Workspace Orchestration
          </h2>
          <p className="text-neutral-400 text-sm mt-1 sm:mt-2 max-w-2xl font-normal leading-relaxed">
            The &quot;Chief of Staff&quot; orchestration architecture combining Google Workspace, real-time contextual LLM prompts, and sandboxed AI-Ops code factories.
          </p>
        </div>
        <div className="flex items-center gap-2 select-none">
          <div className="bg-[#151517] border border-white/[0.06] px-3.5 py-1.5 rounded-full flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-[11px] font-mono text-neutral-300 font-semibold uppercase tracking-wider">AURA Engine 2.0</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 border-b border-white/[0.04] mb-8 pb-px select-none hide-scrollbars">
        {[
          { id: 'architecture', label: '1. Architecture & Router', icon: Briefcase },
          { id: 'normalizers', label: '2. Canonical Mapping Layer', icon: Layers },
          { id: 'mcp', label: '3. AI-Ops MCP Factory', icon: Cpu },
          { id: 'deploy', label: '4. GCP Serverless Pipeline', icon: Cloud },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-5 py-3 text-[12px] font-semibold uppercase tracking-widest border-b-2 whitespace-nowrap transition-all duration-300 ${
                isActive 
                  ? 'border-[#34C759] text-white bg-white/[0.02]' 
                  : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.01]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#34C759]' : 'text-neutral-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-[400px]"
        >
          {/* ARCHITECTURE SUMMARY */}
          {activeTab === 'architecture' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Pillar Cards */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Core Concept Block */}
                <div className="bg-[#151517]/40 backdrop-blur-3xl border border-white/[0.06] rounded-[24px] p-6 lg:p-8">
                  <h3 className="text-[17px] font-medium text-white mb-4 flex items-center gap-2.5">
                    <Cpu className="h-4.5 w-4.5 text-[#34C759]" />
                    Context-Aware Workspace Synthesis & SDUI Contracts
                  </h3>
                  <p className="text-neutral-300 text-[14px] leading-relaxed font-normal mb-6">
                    Aura resolves Google workspace interactions not by executing simple API lookups, but by spawning 
                    <strong> high-density orchestrating agents</strong>. These agents run inside sandboxed execution frames, pull contextual streams from your Google calendar, drive docs, and inbox with explicit permission, and construct strict, deterministic Server-Driven UI (SDUI) artifacts on demand.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 flex gap-4">
                      <div className="p-3.5 bg-white/[0.03] rounded-lg h-fit">
                        <Mail className="h-5 w-5 text-[#34C759]" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-semibold text-white uppercase tracking-wider mb-1">Scatter-Gather Email</h4>
                        <p className="text-[11px] text-neutral-400">Pulls metadata across threads and normalizes content to build secure context summaries.</p>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 flex gap-4">
                      <div className="p-3.5 bg-white/[0.03] rounded-lg h-fit">
                        <Calendar className="h-5 w-5 text-[#FF9500]" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-semibold text-white uppercase tracking-wider mb-1">Intent Scheduling</h4>
                        <p className="text-[11px] text-neutral-400">Extracts temporal variables and maps them to clean appointments with zero conflicts.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secure Trust Gate Invariant Guard */}
                <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/15 rounded-[24px] p-6 lg:p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                    <ShieldAlert className="h-32 w-32 text-[#FF3B30]" />
                  </div>
                  <h3 className="text-[17px] font-medium text-white mb-3 flex items-center gap-2.5">
                    <ShieldAlert className="h-4.5 w-4.5 text-[#FF3B30] animate-pulse" />
                    Programmatic Governance: Trust Gate Invariant Checks
                  </h3>
                  <p className="text-neutral-300 text-[14px] leading-relaxed mb-6">
                    Any operation modifying user data (e.g. drafting an email response, creating a task, or submitting a file delete write) 
                    is governed by a strict **Trust Gate**. Mutating operations are held in a pending lock until receiving interactive approval from the user.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/40 rounded-[16px] p-5 border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center font-mono text-[11px] text-[#FF9500]">INV</div>
                      <div>
                        <div className="text-[12px] font-semibold text-neutral-100">requireInteractiveApproval</div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-1">Status: {interactiveApproved ? 'APPROVED' : 'LOCKED - HOLD_FOR_INPUT'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setInteractiveApproved(!interactiveApproved)}
                      className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 select-none ${
                        interactiveApproved 
                          ? 'bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/30' 
                          : 'bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/30 hover:bg-[#FF9500]/30 cursor-pointer'
                      }`}
                    >
                      {interactiveApproved ? 'Approved & Unlocked' : 'Approve Mutate Operation'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Sidebar Checklist */}
              <div className="space-y-6">
                <div className="bg-[#151517] border border-white/[0.06] rounded-[24px] p-6">
                  <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Enterprise Specs</h4>
                  
                  <div className="space-y-4 font-normal text-xs text-neutral-300">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">Full Oauth Integration</strong>
                        <p className="text-neutral-500 mt-1">Standard OAuth scopes stored securely in memory caching layers. No storage persistence of active access tokens.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">Deterministic Normalizing</strong>
                        <p className="text-neutral-500 mt-1">Converts raw third party API payloads instantly to immutable canonical models before any LLM processing.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">Multi-Agent Router (router.ts)</strong>
                        <p className="text-neutral-500 mt-1">Recognizes semantic intent, extracts contextual parameters, and delegates to domain specialists via strict tool calls.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Try It Live hint */}
                <div className="bg-gradient-to-br from-[#1c1c1e] to-[#0c0c0e] border border-white/[0.04] rounded-[24px] p-5 text-center text-xs">
                  <HelpCircle className="h-5 w-5 text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-300 leading-relaxed font-semibold">Try querying Workspace in the chat!</p>
                  <p className="text-neutral-500 mt-1 leading-normal">Type &quot;mock workspace status&quot; or &quot;workspace specs&quot; to see real-time UI components.</p>
                </div>
              </div>

            </div>
          )}

          {/* NORMALIZERS & FUSION LAYER */}
          {activeTab === 'normalizers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Simulation Selector */}
              <div className="space-y-6">
                <div className="bg-[#151517]/40 backdrop-blur-3xl border border-white/[0.06] rounded-[24px] p-6">
                  <h3 className="text-[16px] font-medium text-white mb-3 flex items-center gap-2">
                    <Layers className="h-4.5 w-4.5 text-[#34C759]" />
                    Canonical Mapping Normalizer (Step 3)
                  </h3>
                  <p className="text-neutral-400 text-xs mb-6 max-w-lg leading-relaxed">
                    By mapping arbitrary, raw API responses to strict immutable TypeScript structures (`CanonicalEmail`, `CanonicalCalendarEvent`), we prevent hallucination. 
                    Select a third-party source below to witness the real-time deterministic transformation layer.
                  </p>

                  <div className="flex flex-wrap gap-2.5 mb-6 select-none font-mono">
                    {[
                      { id: 'GMAIL', label: 'Gmail API Normalizer', icon: Mail },
                      { id: 'CALENDAR', label: 'Google Calendar API', icon: Calendar },
                      { id: 'DRIVE', label: 'Google Drive API', icon: FileText },
                      { id: 'TASKS', label: 'Google Tasks API', icon: CheckSquare },
                    ].map(btn => {
                      const Icon = btn.icon;
                      const isSel = normalizerInput === btn.id;
                      return (
                        <button
                          key={btn.id}
                          onClick={() => setNormalizerInput(btn.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-semibold border transition-all duration-300 cursor-pointer ${
                            isSel 
                              ? 'bg-white/10 border-white/20 text-white shadow-md' 
                              : 'bg-white/[0.01] border-white/[0.04] text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Flow chart illustration */}
                  <div className="bg-black/40 border border-white/[0.04] rounded-xl p-4 p-5 font-mono text-[11px] tracking-wide relative overflow-hidden">
                    <div className="flex items-center justify-between text-neutral-400 mb-4 pb-2 border-b border-white/[0.04]">
                      <span>FUSION ROUTE PIPELINE</span>
                      <span className="text-xs text-[#34C759]">Live Execution</span>
                    </div>

                    <div className="flex flex-col gap-3 relative z-10 text-neutral-300">
                      <div className="flex items-center gap-3">
                        <span className="bg-white/[0.04] px-2 py-0.5 border border-white/[0.06] text-white rounded">Raw JSON payload</span>
                        <ArrowRight className="h-3 w-3 text-neutral-500" />
                        <span className="bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20 px-2 py-0.5 rounded font-bold">API Normalizer Fn</span>
                        <ArrowRight className="h-3 w-3 text-neutral-500" />
                        <span className="bg-white/10 text-neutral-100 px-2 py-0.5 border border-white/10 rounded">CanonicalDataModel</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 leading-normal pl-1.5 mt-2">
                        Normalizers ensure 0% factual hallucination. All parameters extracted are verified directly against the underlying system APIs.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* JSON code blocks */}
              <div className="space-y-4">
                <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-[24px] overflow-hidden shadow-xl flex flex-col h-full font-mono text-xs">
                  <div className="bg-[#151517] px-6 py-4 border-b border-white/[0.06] flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4.5 w-4.5 text-[#34C759]" />
                      <span className="text-white font-medium uppercase font-sans tracking-wide text-xs">Canonical Payload Output ({normalizerInput})</span>
                    </div>
                    {isNormalizing ? (
                      <RefreshCw className="h-4 w-4 text-neutral-400 animate-spin" />
                    ) : (
                      <span className="text-[#34C759] text-[9px] font-bold bg-[#34C759]/10 px-2.5 py-0.5 rounded-full border border-[#34C759]/20">SYNCHRONIZED</span>
                    )}
                  </div>
                  
                  <div className="p-6 overflow-y-auto max-h-[360px] leading-relaxed text-neutral-300 select-all selection:bg-white/10">
                    {normalizeOutput ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(normalizeOutput, null, 2)}</pre>
                    ) : (
                      <div className="text-center py-10 text-neutral-600 font-sans text-xs">Awaiting data normalizer trigger...</div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* MCP GENERATION FACTORY */}
          {activeTab === 'mcp' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Pillar spec */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#151517]/40 backdrop-blur-3xl border border-white/[0.06] rounded-[24px] p-6 lg:p-8">
                  <h3 className="text-[17px] font-medium text-white mb-4 flex items-center gap-2.5">
                    <FileCode className="h-4.5 w-4.5 text-[#34C759]" />
                    AI-Ops MCP Server Code Factory
                  </h3>
                  <p className="text-neutral-300 text-[14px] leading-relaxed mb-6 font-normal">
                    One of Aura&apos;s groundbreaking pillars is **dynamic MCP server generation** (`mcp-generator.ts`). 
                    Instead of maintaining complex API bridges that rot, Aura&apos;s backend synthesizes dedicated Model Context Protocol (MCP) microservices 
                    on the fly by parsing OpenAPI specification endpoints and resolving structural bindings automatically.
                  </p>

                  <div className="bg-black/30 border border-white/[0.04] rounded-[16px] p-5 font-mono text-[11px] tracking-wide">
                    <div className="text-[11px] font-bold text-neutral-400 mb-3 select-none">CODE GEN GUARD INVARIANTS:</div>
                    <ul className="space-y-3.5 text-neutral-300">
                      <li className="flex items-start gap-2.5">
                        <span className="text-[#34C759] font-bold shrink-0">✔</span>
                        <div>
                          <strong>tsc --noEmit static checks</strong>
                          <p className="text-neutral-500 mt-1">Never executes or packages compiled bundle if tsc identifies code-gen or schema leaks.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-[#34C759] font-bold shrink-0">✔</span>
                        <div>
                          <strong>Strict Port Binding Safeguards</strong>
                          <p className="text-neutral-500 mt-1">Auto configures ingress to bind securely to port 3000 over host 0.0.0.0 for seamless reverse proxying.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-[#34C759] font-bold shrink-0">✔</span>
                        <div>
                          <strong>Secure Multi-Stage Docker builds</strong>
                          <p className="text-neutral-500 mt-1">Prunes build caching layers, leaving node_modules isolated in staging cache to maintain a pristine, minimal size footprint.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Visual compiler box */}
              <div className="space-y-6">
                <div className="bg-[#151517] border border-white/[0.06] rounded-[24px] p-6">
                  <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span>MCP Build Rig</span>
                    {isCompiling && <RefreshCw className="h-3.5 w-3.5 text-neutral-400 animate-spin" />}
                  </h4>

                  <p className="text-neutral-400 text-xs mb-5 font-normal leading-relaxed">
                    Trigger a compiled verification check of the workspace bridge. Emulates static checks, compilation, package building, and secure deployment routing.
                  </p>

                  <button
                    disabled={isCompiling}
                    onClick={triggerGcpBuild}
                    className={`w-full py-3 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 select-none flex items-center justify-center gap-2 cursor-pointer ${
                      isCompiling 
                        ? 'bg-neutral-800 text-neutral-500 border border-neutral-700' 
                        : 'bg-[#34C759] text-black hover:bg-neutral-200'
                    }`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    {isCompiling ? 'Synthesizing...' : 'Launch MCP Build Rig'}
                  </button>

                  {/* Progress Step Bar */}
                  <div className="mt-8 space-y-4">
                    {buildSteps.map((step, idx) => (
                      <div key={step.id} className="flex gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center border text-[9px] font-mono select-none ${
                            step.state === 'success' 
                              ? 'bg-[#34C759]/10 border-[#34C759]/30 text-[#34C759] font-bold' 
                              : step.state === 'running' 
                                ? 'bg-white/10 border-white/20 text-white animate-pulse' 
                                : 'bg-transparent border-white/[0.06] text-neutral-500'
                          }`}>
                            {step.state === 'success' ? '✔' : idx + 1}
                          </div>
                          {idx !== buildSteps.length - 1 && (
                            <div className={`w-px h-6 my-1 ${
                              step.state === 'success' ? 'bg-[#34C759]/30' : 'bg-white/[0.04]'
                            }`} />
                          )}
                        </div>
                        <div>
                          <div className={`font-semibold ${step.state === 'success' ? 'text-white' : 'text-neutral-400'}`}>{step.title}</div>
                          <div className="text-[10px] text-neutral-500 mt-0.5 leading-normal">{step.desc}</div>
                          {step.output && (
                            <div className="text-[9px] font-mono text-[#34C759] mt-1.5 break-all font-semibold select-all">URL: {step.output}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* DEPLOYMENT PIPELINE */}
          {activeTab === 'deploy' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Technical Specifications */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#151517]/40 backdrop-blur-3xl border border-white/[0.06] rounded-[24px] p-6 lg:p-8">
                  <h3 className="text-[17px] font-medium text-white mb-4 flex items-center gap-2.5">
                    <Cloud className="h-4.5 w-4.5 text-[#34C759]" />
                    Secure Google Cloud Platform Deployment Infrastructure
                  </h3>
                  <p className="text-neutral-300 text-[14px] leading-relaxed mb-6 font-normal">
                    Transitioning from simulated deployments to actual GCP integrations represents the true Series A readiness standard. 
                    Using Google&apos;s Node SDKs for Cloud Build (`@google-cloud/cloudbuild`) and Cloud Run (`@google-cloud/run`), 
                    our deployment pipeline establishes secure containerization pipelines with zero static API credentials exposed.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
                      <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center font-mono text-[10px] font-bold text-[#34C759] mb-3">01</div>
                      <h4 className="text-[13px] font-semibold text-white tracking-wide uppercase mb-1">Least Privilege IAM</h4>
                      <p className="text-[11px] text-neutral-400 leading-normal">Cloud Build service accounts bind tightly to Google Artifact Registry scopes, restricting read/write capabilities dynamically at compile-time.</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
                      <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center font-mono text-[10px] font-bold text-[#FF9500] mb-3">02</div>
                      <h4 className="text-[13px] font-semibold text-white tracking-wide uppercase mb-1">GCP Secret Manager</h4>
                      <p className="text-[11px] text-neutral-400 leading-normal">Third party tokens, user OAuth refresh handles, and private keys reside inside secure, auditable KMS Secret Managers resolved dynamically.</p>
                    </div>
                  </div>
                </div>

                {/* Simulated Console Output */}
                <div className="bg-[#0a0a0c] border border-white/[0.06] rounded-[24px] p-6 font-mono text-xs overflow-hidden h-[240px] flex flex-col">
                  <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3 select-none">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-[#34C759]" />
                      <span className="text-neutral-100 font-sans font-semibold uppercase tracking-wide text-[10px]">Real-Time GCP Deploy Console Logs</span>
                    </div>
                    {isCompiling && <span className="text-neutral-400 text-[10px] tracking-widest uppercase animate-pulse">STREAMING</span>}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-1.5 select-all pr-2 text-neutral-400 max-h-[160px] scrolling-touch">
                    {logs.length > 0 ? (
                      logs.map((log, index) => (
                        <div key={index} className="leading-relaxed hover:text-white transition-colors">
                          <span className="text-neutral-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-neutral-600 py-12 text-center text-xs">
                        No active deployments running. Click &quot;Launch MCP Build Rig&quot; to initiate compilation logs.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Secure Credentials check */}
              <div className="space-y-6">
                <div className="bg-[#151517] border border-white/[0.06] rounded-[24px] p-6 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4">IAM Secret Ledger</h4>
                    <p className="text-neutral-400 text-xs mb-6 font-normal leading-relaxed">
                      Aura leverages fine-grained Google Service Accounts. Secure variables are checked in memory statically upon app bootstrap:
                    </p>

                    <div className="space-y-4 font-mono text-[10px] text-neutral-300 select-none">
                      <div className="flex justify-between items-center p-2.5 bg-white/[0.01] border border-white/[0.04] rounded-lg">
                        <span>WORKSPACE_USER_OAUTH</span>
                        {token ? (
                          <span className="text-[#34C759] font-bold uppercase truncate max-w-[150px]">
                            {user?.email || 'CONNECTED'}
                          </span>
                        ) : (
                          <button 
                            type="button"
                            onClick={onSignIn} 
                            className="text-[#FF9500] hover:text-[#FF9500]/80 font-bold uppercase cursor-pointer transition-colors text-[9px] tracking-wider"
                          >
                            CLICK TO CONNECT
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-white/[0.01] border border-white/[0.04] rounded-lg">
                        <span>GOOGLE_APPLICATION_CREDENTIALS</span>
                        <span className="text-[#34C759] font-bold">CONFIGURED</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-white/[0.01] border border-white/[0.04] rounded-lg">
                        <span>GEMINI_API_KEY</span>
                        <span className="text-[#34C759] font-bold">DECLARED</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-white/[0.01] border border-white/[0.04] rounded-lg">
                        <span>FIREBASE_APPLET_CONFIG</span>
                        <span className="text-[#34C759] font-bold font-semibold">PROVISIONED</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FF9500]/5 border border-[#FF9500]/15 rounded-xl p-4 mt-6">
                    <div className="flex gap-2 p-1.5">
                      <AlertTriangle className="h-4 w-4 text-[#FF9500] shrink-0 mt-0.5" />
                      <div className="text-[10px] text-neutral-300 leading-normal">
                        <strong>Security Invariant Check:</strong> Active client-side JS is strictly forbidden from fetching or exposing key resources. 
                        All compilation variables are loaded server-side by modern container engines.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
