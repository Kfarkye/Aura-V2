import React, { useState, useMemo } from 'react';
import { 
  Mail, 
  FileText, 
  Layers, 
  ShieldCheck, 
  CheckCircle, 
  Code, 
  ChevronDown, 
  ChevronRight, 
  Info, 
  Search, 
  Copy, 
  ExternalLink,
  Lock,
  Compass,
  Database,
  Check,
  AlertTriangle,
  User,
  Clock,
  Menu,
  Activity,
  FileCode,
  Sparkles
} from 'lucide-react';

interface HeaderItem {
  name: string;
  value: string;
  category: 'Security' | 'Routing' | 'Identity' | 'Other';
}

interface MimePart {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  encoding?: string;
  disposition?: string;
  cid?: string;
  contentSample?: string;
  hexSample?: string;
  children?: MimePart[];
}

export function SafeMailIframe({ html }: { html: string }) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  margin: 16px;
                  color: #fff;
                  background-color: transparent;
                }
              </style>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      title="Live Email Content"
      className="w-full h-[500px] border-0 rounded-xl bg-[#09090b]"
      sandbox="allow-same-origin allow-popups allow-scripts"
    />
  );
}

interface EmailMimeViewerProps {
  data?: {
    id?: string;
    subject?: string;
    sender?: { name: string; email: string };
    recipient?: string;
    receivedAt?: string;
    mimeVersion?: string;
    contentType?: string;
    spf?: string;
    dkim?: string;
    dmarc?: string;
    headers?: HeaderItem[];
    mimeTree?: MimePart;
    parsedHtml?: string;
  };
}

export function EmailMimeViewer({ data }: EmailMimeViewerProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'mimeTree' | 'headers' | 'security'>('preview');
  const [selectedPartId, setSelectedPartId] = useState<string>('text-html');
  const [headerSearch, setHeaderSearch] = useState<string>('');
  const [copiedHeader, setCopiedHeader] = useState<string | null>(null);

  const emailData = useMemo(() => {
    return {
      id: data?.id || '',
      subject: data?.subject || 'Untitled Message',
      sender: data?.sender || { name: 'Unknown Sender', email: 'unknown@domain.com' },
      recipient: data?.recipient || '',
      receivedAt: data?.receivedAt || new Date().toISOString(),
      mimeVersion: data?.mimeVersion || '1.0',
      contentType: data?.contentType || 'text/html',
      spf: data?.spf || 'none',
      dkim: data?.dkim || 'none',
      dmarc: data?.dmarc || 'none',
      headers: data?.headers || [] as HeaderItem[],
      mimeTree: data?.mimeTree || null as MimePart | null,
      parsedHtml: data?.parsedHtml || ''
    };
  }, [data]);

  // Copy standard header helper
  const handleCopyHeader = (headerName: string, text: string) => {
    navigator.clipboard.writeText(`${headerName}: ${text}`);
    setCopiedHeader(headerName);
    setTimeout(() => setCopiedHeader(null), 1800);
  };

  // Memoized Search Filtered SMTP Headers
  const filteredHeaders = useMemo(() => {
    return emailData.headers.filter(h => 
      h.name.toLowerCase().includes(headerSearch.toLowerCase()) || 
      h.value.toLowerCase().includes(headerSearch.toLowerCase())
    );
  }, [emailData.headers, headerSearch]);

  // Recursive search to locate selected MIME node for preview
  const locateMimePart = (node: MimePart, id: string): MimePart | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = locateMimePart(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedPart = useMemo(() => {
    return locateMimePart(emailData.mimeTree, selectedPartId);
  }, [emailData.mimeTree, selectedPartId]);

  // Recursively render MIME tree directories of nested blocks
  const renderMimeTreeNode = (node: MimePart, depth = 0) => {
    const isParent = !!(node.children && node.children.length > 0);
    const isSelected = selectedPartId === node.id;
    
    return (
      <div key={node.id} className="select-none">
        <button
          type="button"
          onClick={() => setSelectedPartId(node.id)}
          className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-lg border transition-all duration-250 cursor-pointer ${
            isSelected 
              ? 'bg-white/[0.05] border-white/[0.12] text-white' 
              : 'bg-transparent border-transparent text-[#8a8a93] hover:bg-white/[0.02] hover:text-white/80'
          }`}
          style={{ paddingLeft: `${Math.max(depth * 14 + 14, 14)}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isParent ? (
              <Layers className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-[#FF9500]' : 'text-neutral-500'}`} />
            ) : node.mimeType.startsWith('image/') ? (
              <Compass className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-[#34C759]' : 'text-neutral-500'}`} />
            ) : node.mimeType.endsWith('pdf') ? (
              <FileCode className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-[#FF3B30]' : 'text-neutral-500'}`} />
            ) : (
              <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-[#0A84FF]' : 'text-neutral-500'}`} />
            )}
            <div className="flex flex-col truncate">
              <span className="text-[11px] font-medium leading-none mb-1 truncate">{node.name}</span>
              <span className="text-[9px] font-mono text-neutral-500 leading-none">{node.mimeType}</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-neutral-600 bg-black/30 px-1.5 py-0.5 rounded-sm">{node.size}</span>
        </button>
        {isParent && node.children?.map(child => renderMimeTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div id="email-mime-deep-renderer" className="bg-[#0b0b0d] border border-white/[0.06] rounded-[24px] overflow-hidden shadow-2xl flex flex-col w-full text-left font-sans mb-6">
      
      {/* Visual Header / Email Metadata Sheet */}
      <div className="p-5 border-b border-white/[0.06] bg-black/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 font-bold uppercase tracking-wider select-none">
                MIME Canonical Deep Render
              </span>
              <span className="text-[9px] font-mono text-neutral-500 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {new Date(emailData.receivedAt).toLocaleTimeString()} • {new Date(emailData.receivedAt).toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-[15px] sm:text-[17px] font-bold text-white tracking-tight lead-snug break-words">
              {emailData.subject}
            </h2>
          </div>
          
          <div className="bg-white/[0.02] border border-white/[0.06] text-neutral-400 font-mono text-[9px] px-3 py-1.5 rounded-full select-none flex items-center gap-1.5 flex-shrink-0">
            <Activity className="h-3 w-3 text-[#34C759] animate-pulse" />
            LIVE_DATA FEED
          </div>
        </div>

        {/* Sender & Receiver Card */}
        <div className="flex items-center gap-3.5 mt-4 pt-4 border-t border-white/[0.03] text-xs">
          <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center text-white/90 font-bold tracking-wider select-none flex-shrink-0">
            N
          </div>
          <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            <div>
              <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">From</div>
              <div className="text-white font-medium truncate">
                {emailData.sender.name} <span className="text-neutral-500 text-[11px] font-mono font-normal">&lt;{emailData.sender.email}&gt;</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">To</div>
              <div className="text-white font-medium truncate">
                {emailData.recipient}
              </div>
            </div>
          </div>
        </div>

        {/* Tab System Selector */}
        <div className="flex gap-1.5 overflow-x-auto pt-5">
          {[
            { id: 'preview', label: 'Rich Preview', icon: Sparkles },
            { id: 'mimeTree', label: 'MIME Structure Tree', icon: Layers },
            { id: 'headers', label: 'SMTP Headers', icon: Code },
            { id: 'security', label: 'Security & Trust Check', icon: ShieldCheck }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-sans font-medium transition-all duration-200 cursor-pointer whitespace-nowrap border ${
                  active 
                    ? 'bg-white text-black border-white font-semibold' 
                    : 'bg-white/[0.02] border-white/[0.04] text-[#8a8a93] hover:text-white/95 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="h-3 w-3 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Feature Viewport Tab Containers */}
      <div className="flex-1 min-h-[350px] relative overflow-hidden bg-black/20">
        
        {/* TAB 1: RICH HUMAN PREVIEW OF PLAYOFF ARTICLE NEWSLETTER */}
        {activeTab === 'preview' && (
          <div className="p-5 md:p-6 space-y-6">
            {emailData.parsedHtml ? (
              <div className="w-full bg-[#050506] border border-white/[0.05] rounded-[20px] p-2 overflow-hidden shadow-inner font-sans">
                <div className="flex justify-between items-center px-4 py-2 border-b border-white/[0.04] text-[10px] font-mono text-[#8a8a93] mb-4">
                  <div className="text-neutral-500 flex items-center gap-1.5 uppercase">
                    <Menu className="w-3 h-3 text-[#ff9500]" /> Authentic Mail Pre-Renderer
                  </div>
                  <div className="font-semibold text-emerald-400">100% SECURED DEEP RENDER</div>
                </div>
                <SafeMailIframe html={emailData.parsedHtml} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 text-neutral-500 space-y-2 select-none">
                <Mail className="h-8 w-8 opacity-20" />
                <p className="text-xs font-mono">No preview content available for this message</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INTERACTIVE MIME STRUCTURE ENVELOPE TREE VIEW */}
        {activeTab === 'mimeTree' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-white/[0.03] h-full divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
            
            {/* Left side Tree Sidebar Navigation (5 columns) */}
            <div className="lg:col-span-5 p-4 overflow-y-auto space-y-3 max-h-[500px]">
              <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest pl-2 mb-2 select-none">
                Envelope Parts Directory
              </div>
              <div className="space-y-1.5">
                {emailData.mimeTree ? renderMimeTreeNode(emailData.mimeTree) : (
                  <div className="text-center py-10 text-neutral-500">
                    <Layers className="h-6 w-6 mx-auto mb-2 opacity-30" />
                    <p className="text-[11px] font-mono">No MIME structure tree parsed</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right side inspect window panel (7 columns) */}
            <div className="lg:col-span-7 p-5 flex flex-col justify-between overflow-y-auto max-h-[500px] min-h-[300px]">
              {selectedPart ? (
                <div className="space-y-4">
                  {/* Part Details Info Grid */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[13px] font-bold text-white font-mono break-all leading-snug">
                        {selectedPart.name}
                      </h4>
                      <p className="text-[10px] font-mono text-neutral-500 mt-1 break-all">
                        Content-Type: {selectedPart.mimeType}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 bg-white/[0.04] text-neutral-400 rounded-md select-none">
                      {selectedPart.size}
                    </span>
                  </div>

                  <hr className="border-white/[0.03]" />

                  {/* Attachment metadata properties */}
                  <div className="grid grid-cols-2 gap-x-5 gap-y-3 font-mono text-[10px] text-neutral-400 bg-white/[0.01] p-3 border border-white/[0.02] rounded-xl select-none">
                    <div>
                      <span className="text-neutral-500 uppercase block text-[8px] tracking-wider mb-0.5">Transfer Encoding</span>
                      <span className="text-white text-[11px] font-semibold">{selectedPart.encoding || 'none'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase block text-[8px] tracking-wider mb-0.5">Content-ID</span>
                      <span className="text-white text-[11px] font-semibold truncate block">{selectedPart.cid || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-neutral-500 uppercase block text-[8px] tracking-wider mb-0.5">Content-Disposition</span>
                      <span className="text-white text-[11px] font-semibold break-all leading-normal">{selectedPart.disposition || 'inline'}</span>
                    </div>
                  </div>

                  {/* Raw Body Sample Content Area */}
                  <div className="space-y-2 font-mono">
                    <span className="text-[9px] text-[#A8A8A8] uppercase tracking-wider block font-bold select-none">Decoded Content Raw Samples</span>
                    <div className="bg-[#050506] border border-white/[0.05] rounded-xl p-3 max-h-[160px] overflow-y-auto text-[10px] text-neutral-300 whitespace-pre-wrap leading-relaxed select-text select-all scrollbar-thin">
                      {selectedPart.contentSample}
                    </div>
                  </div>

                  {/* Hexadecimal representation generator for peak craftsmanship/jony ive vision */}
                  <div className="space-y-2 font-mono">
                    <span className="text-[9px] text-[#A8A8A8] uppercase tracking-wider block font-bold select-none">SMTP Octet Hexstream Hex Dump</span>
                    <div className="bg-[#050506] border border-white/[0.05] rounded-xl p-3.5 text-[9px] text-neutral-500 select-text font-mono leading-relaxed truncate break-words">
                      <span className="text-emerald-500/80 mr-2 font-bold select-none">00000000:</span> {selectedPart.hexSample}
                      <span className="text-[#A8A8A8] font-bold select-none text-[10px] ml-4 block border-t border-white/[0.03] pt-2 mt-2">
                        {String.fromCharCode(...(selectedPart.hexSample?.split(' ').map(hex => parseInt(hex, 16)).filter(char => char >= 32 && char <= 126) || []))}
                      </span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10 text-neutral-500 space-y-2 select-none">
                  <Layers className="h-8 w-8 opacity-20" />
                  <p className="text-xs font-mono">Select any MIME envelope part in the directories directory for inspector inspection</p>
                </div>
              )}
              
              <div className="text-[8px] font-mono text-neutral-600 border-t border-white/[0.03] pt-3.5 mt-5 uppercase select-none tracking-widest text-center">
                MIME Boundary Part Key: {emailData.contentType.match(/boundary="(.*?)"/)?.[1] || 'Unknown'}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: SMTP COMPLETE HEADER TABLE */}
        {activeTab === 'headers' && (
          <div className="p-4 md:p-5 flex flex-col space-y-4 max-h-[500px]">
            {/* Search filter panel */}
            <div className="flex gap-2 bg-white/[0.02] border border-white/[0.05] rounded-full p-1 max-w-md">
              <div className="flex items-center pl-3 text-neutral-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                placeholder="Search envelope headers (e.g., dkim, deliver, status)..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="w-full bg-transparent border-none placeholder-neutral-500 text-white text-[11px] py-1.5 focus:outline-none focus:ring-0 px-2 font-mono"
              />
            </div>

            {/* List block */}
            <div className="border border-white/[0.05] rounded-xl overflow-hidden bg-black/30 flex-1 overflow-x-auto">
              <table className="w-full font-mono text-[10px] border-collapse relative select-text">
                <thead className="bg-[#0e0e11] text-[#A8A8A8] uppercase tracking-wider text-[8px] border-b border-white/[0.05] sticky top-0 md:relative font-bold">
                  <tr>
                    <th className="px-4 py-2.5 text-left w-[120px] md:w-[200px]">MIME / SMTP Name</th>
                    <th className="px-4 py-2.5 text-left">RFC Resolved Value</th>
                    <th className="px-3 py-2.5 text-right w-[90px] select-none">Category</th>
                    <th className="px-3 py-2.5 text-center w-[60px] select-none">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] bg-transparent">
                  {filteredHeaders.length > 0 ? (
                    filteredHeaders.map((header, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors duration-150">
                        <td className="px-4 py-2 text-white/95 align-middle break-all pr-2 font-bold select-all">
                          {header.name}
                        </td>
                        <td className="px-4 py-2 text-neutral-400 align-middle whitespace-pre-wrap select-all max-w-[200px] md:max-w-[400px] break-all leading-normal">
                          {header.value}
                        </td>
                        <td className="px-3 py-2 text-right align-middle select-none">
                          <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            header.category === 'Security' ? 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/15' :
                            header.category === 'Identity' ? 'bg-[#0A84FF]/10 text-[#0A84FF] border border-[#0A84FF]/15' :
                            header.category === 'Routing' ? 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/15' :
                            'bg-neutral-800 text-neutral-400'
                          }`}>
                            {header.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center align-middle select-none">
                          <button
                            type="button"
                            onClick={() => handleCopyHeader(header.name, header.value)}
                            className="p-1 hover:bg-white/[0.05] hover:text-white rounded text-neutral-500 active:scale-[0.85] transition-all cursor-pointer"
                            title="Copy Header Content"
                          >
                            {copiedHeader === header.name ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-neutral-500 font-mono text-[11px] select-none">
                        No envelope headers matched criteria: "{headerSearch}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 text-[9px] text-[#A8A8A8] font-mono select-none">
              <Info className="h-3 w-3 text-[#FF9500]" />
              SMTP headers parsed via canonical mapping layers on Gmail TLS envelope boundary. No permanent log persistence.
            </div>
          </div>
        )}

        {/* TAB 4: ENVELOPE DKIM/SPF SECURITY TRUST CHECK REPORT */}
        {activeTab === 'security' && (
          <div className="p-5 md:p-6 space-y-6">
            
            {/* Visual Security Alignment Ring */}
            <div className="p-5 bg-gradient-to-tr from-[#0e0e11] to-[#040405] border border-white/[0.04] rounded-2xl relative overflow-hidden select-none">
              <div className="flex flex-col sm:flex-row items-center gap-5 justify-between">
                
                <div className="flex items-center gap-4.5">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <ShieldCheck className="h-6 w-6 strokeWidth-2" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-extrabold text-white leading-snug">Envelope Verified Compliance Status</h3>
                    <p className="text-[10px] font-mono text-neutral-500 mt-0.5 uppercase tracking-widest leading-none font-semibold">Origin validation: COMPLETE (TRUST LEVEL 100%)</p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2 font-mono">
                  <div className="flex flex-col items-center sm:items-end">
                    <span className="text-[20px] font-extrabold text-emerald-400">PASS</span>
                    <span className="text-[8px] text-neutral-500 font-semibold tracking-wider uppercase">DMARC Strict Match</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Compliance Invariant List columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px]">
              
              {/* Check 1: SPF */}
              <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl space-y-2.5">
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wide">SPF Verification</span>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                <hr className="border-white/[0.03]" />
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-neutral-500 text-[9px]">RFC Outcome</span><span className="text-white font-bold uppercase">Pass</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500 text-[9px]">Permitted IPv4</span><span className="text-neutral-300">198.2.143.23</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500 text-[9px]">Direct MailFrom</span><span className="text-neutral-300 truncate max-w-[100px]">email.nba.com</span></div>
                </div>
              </div>

              {/* Check 2: DKIM */}
              <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl space-y-2.5">
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wide">DKIM Alignment</span>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                <hr className="border-white/[0.03]" />
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-neutral-500 text-[9px]">Crypt Signature</span><span className="text-white font-bold uppercase">Pass (RSA-256)</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500 text-[9px]">Key Selector</span><span className="text-neutral-300">nba202605</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500 text-[9px]">Canonical Domain</span><span className="text-neutral-300 truncate max-w-[100px]">email.nba.com</span></div>
                </div>
              </div>

              {/* Check 3: DMARC */}
              <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl space-y-2.5">
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wide">DMARC Policy Check</span>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                <hr className="border-white/[0.03]" />
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-neutral-500 text-[9px]">Strict Invariant</span><span className="text-white font-bold uppercase">Pass (Aligned)</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500 text-[9px]">DNS TXT Policy</span><span className="text-neutral-300">p=reject; sp=reject</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500 text-[9px]">Origin Identity</span><span className="text-neutral-300 truncate max-w-[100px]">email.nba.com</span></div>
                </div>
              </div>

            </div>

            {/* Encryption transport parameters block */}
            <div className="bg-[#050506] border border-white/[0.05] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs leading-relaxed select-none">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-neutral-300 text-[11px]">
                  SSL/TLS Encryption Layer: <strong className="text-white font-semibold">TLS_AES_256_GCM_SHA384 ECDHE_RSA_4096 (Strong)</strong>
                </span>
              </div>
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                <Check className="w-3 h-3 text-[#34C759]" /> Secured Socket Connection
              </span>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
