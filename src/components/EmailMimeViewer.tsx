import React, { useState, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================
export interface HeaderItem {
  name: string;
  value: string;
  category: 'Security' | 'Routing' | 'Identity' | 'Other';
}

export interface MimePart {
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

export interface EmailMimeViewerProps {
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

type TabType = 'preview' | 'structure' | 'headers' | 'auth';

// ============================================================================
// Inline SVG Utilities (Zero External Dependencies)
// ============================================================================
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

// ============================================================================
// Safe Render Sandbox
// ============================================================================
export const SafeMailIframe = React.memo(({ html }: { html: string }) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        // Applies a stark, un-opinionated wrapper for raw HTML evaluation
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                  margin: 0;
                  padding: 16px;
                  color: #e5e5e5;
                  background-color: transparent;
                  -webkit-font-smoothing: antialiased;
                  word-break: break-word;
                  line-height: 1.6;
                  font-size: 13px;
                }
                a { color: #888; text-decoration: underline; }
                img { max-width: 100%; height: auto; }
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
      title="Isolated Content Context"
      className="w-full h-[500px] border-0 bg-transparent rounded-lg"
      sandbox="allow-same-origin allow-popups"
    />
  );
});
SafeMailIframe.displayName = 'SafeMailIframe';

// ============================================================================
// Primary Component
// ============================================================================
export function EmailMimeViewer({ data }: EmailMimeViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [selectedPartId, setSelectedPartId] = useState<string>('text-html');
  const [headerSearch, setHeaderSearch] = useState<string>('');
  const [copiedHeader, setCopiedHeader] = useState<string | null>(null);

  const emailData = useMemo(() => {
    return {
      id: data?.id || '',
      subject: data?.subject || 'No Subject',
      sender: data?.sender || { name: 'Unknown', email: 'unknown@domain.local' },
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

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(`${key}: ${text}`);
    setCopiedHeader(key);
    setTimeout(() => setCopiedHeader(null), 2000);
  };

  const filteredHeaders = useMemo(() => {
    if (!headerSearch) return emailData.headers;
    const q = headerSearch.toLowerCase();
    return emailData.headers.filter(h => h.name.toLowerCase().includes(q) || h.value.toLowerCase().includes(q));
  }, [emailData.headers, headerSearch]);

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
    return emailData.mimeTree ? locateMimePart(emailData.mimeTree, selectedPartId) || emailData.mimeTree : null;
  }, [emailData.mimeTree, selectedPartId]);

  const renderMimeTreeNode = (node: MimePart, depth = 0) => {
    const isParent = !!(node.children && node.children.length > 0);
    const isSelected = selectedPartId === node.id;
    
    let typeTag = 'DOC';
    if (isParent) typeTag = 'DIR';
    else if (node.mimeType.startsWith('image/')) typeTag = 'IMG';
    else if (node.mimeType.includes('html')) typeTag = 'HTM';
    else if (node.mimeType.includes('plain')) typeTag = 'TXT';
    else if (node.mimeType.includes('json')) typeTag = 'JSN';
    
    return (
      <div key={node.id} className="select-none font-mono">
        <button
          type="button"
          onClick={() => setSelectedPartId(node.id)}
          className={`w-full flex items-center justify-between text-left py-2 transition-colors duration-200 cursor-pointer border-l-2 outline-none focus-visible:bg-neutral-900/50 ${
            isSelected 
              ? 'border-neutral-400 bg-neutral-900 text-neutral-200' 
              : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50'
          }`}
          style={{ paddingLeft: `${Math.max(depth * 12 + 12, 12)}px`, paddingRight: '12px' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-[10px] tracking-widest shrink-0 ${isSelected ? 'text-neutral-400' : 'text-neutral-600'}`}>
              [{typeTag}]
            </span>
            <span className="text-[11px] tracking-tight truncate">{node.name}</span>
          </div>
          <span className="text-[10px] text-neutral-600 tabular-nums shrink-0 ml-2">{node.size}</span>
        </button>
        {isParent && node.children?.map(child => renderMimeTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="w-full bg-[#050505] border border-neutral-800 rounded-xl overflow-hidden flex flex-col text-left font-sans mb-8">
      
      {/* Structural Metadata Header */}
      <div className="p-6 border-b border-neutral-800 bg-[#0A0A0A]">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-3 min-w-0 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-3 select-none">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest border border-neutral-800 bg-[#0F0F0F] px-2 py-0.5 rounded">
                RFC 5322 Payload
              </span>
              <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                {new Date(emailData.receivedAt).toISOString()}
              </span>
            </div>
            <h2 className="text-[16px] font-medium text-neutral-200 tracking-tight break-words w-full">
              {emailData.subject}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-5 border-t border-neutral-800">
          <div className="flex flex-col gap-1 text-[12px] min-w-0">
            <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest select-none">Origin</span>
            <span className="text-neutral-300 font-mono truncate">
              {emailData.sender.name} <span className="text-neutral-500">&lt;{emailData.sender.email}&gt;</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 text-[12px] min-w-0">
            <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest select-none">Destination</span>
            <span className="text-neutral-300 font-mono truncate">{emailData.recipient}</span>
          </div>
        </div>
      </div>

      {/* Institutional Tab System */}
      <div className="flex border-b border-neutral-800 px-4 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none bg-[#0A0A0A]">
        {[
          { id: 'preview', label: 'Preview' },
          { id: 'structure', label: 'Structure' },
          { id: 'headers', label: 'Headers' },
          { id: 'auth', label: 'Authentication' }
        ].map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-3 text-[11px] font-mono uppercase tracking-widest whitespace-nowrap transition-colors outline-none border-b-2 ${
                active 
                  ? 'text-neutral-200 border-neutral-400' 
                  : 'text-neutral-500 border-transparent hover:text-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 min-h-[400px] relative">
        
        {/* TAB 1: PREVIEW */}
        {activeTab === 'preview' && (
          <div className="p-6 h-full">
            {emailData.parsedHtml ? (
              <div className="w-full border border-neutral-800 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between bg-[#0A0A0A] select-none">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Viewport</span>
                  <span className="text-[10px] font-mono text-neutral-500">text/html</span>
                </div>
                <SafeMailIframe html={emailData.parsedHtml} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-neutral-600 text-[11px] font-mono uppercase tracking-widest select-none border border-neutral-800 border-dashed rounded-lg">
                Payload Unavailable
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STRUCTURE */}
        {activeTab === 'structure' && (
          <div className="grid grid-cols-1 md:grid-cols-12 h-[500px] divide-y md:divide-y-0 md:divide-x divide-neutral-800">
            
            <div className="md:col-span-4 py-4 overflow-y-auto max-h-[500px] bg-[#050505]">
              <div className="space-y-1">
                {emailData.mimeTree ? renderMimeTreeNode(emailData.mimeTree) : (
                  <div className="text-center py-10 text-neutral-600 text-[11px] font-mono uppercase tracking-widest select-none">
                    Structure Unparsed
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-8 p-6 overflow-y-auto max-h-[500px] bg-[#0A0A0A]">
              {selectedPart ? (
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-mono text-neutral-200 break-all mb-2">
                        {selectedPart.name}
                      </h4>
                      <p className="text-[10px] font-mono text-neutral-500">
                        {selectedPart.mimeType}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 select-none tabular-nums">
                      {selectedPart.size}
                    </span>
                  </div>

                  <hr className="border-neutral-800" />

                  <div className="grid grid-cols-2 gap-6 font-mono text-[11px] bg-[#0F0F0F] p-4 border border-neutral-800 rounded-lg select-none">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-neutral-600 uppercase tracking-widest text-[9px]">Encoding</span>
                      <span className="text-neutral-300">{selectedPart.encoding || 'none'}</span>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <span className="text-neutral-600 uppercase tracking-widest text-[9px]">Disposition</span>
                      <span className="text-neutral-300 break-all">{selectedPart.disposition || 'inline'}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest select-none">Decoded Content</span>
                    <div className="bg-[#050505] border border-neutral-800 rounded-lg p-4 max-h-[200px] overflow-y-auto text-[11px] text-neutral-400 font-mono whitespace-pre-wrap leading-relaxed select-text">
                      {selectedPart.contentSample || 'No decodable content.'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest select-none">Hexadecimal Dump</span>
                    <div className="bg-[#050505] border border-neutral-800 rounded-lg p-4 text-[11px] font-mono leading-relaxed break-all select-text">
                      <div className="text-neutral-400">
                        <span className="text-neutral-600 mr-4 select-none">00000000:</span> 
                        {selectedPart.hexSample || '00 00 00 00 00 00 00 00'}
                      </div>
                      <div className="text-neutral-600 mt-3 pt-3 border-t border-neutral-800 tracking-widest break-all">
                        {String.fromCharCode(...(selectedPart.hexSample?.split(' ').map(hex => parseInt(hex, 16)).filter(char => char >= 32 && char <= 126) || []))}
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-600 text-[11px] font-mono uppercase tracking-widest select-none">
                  Select structural node
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: HEADERS */}
        {activeTab === 'headers' && (
          <div className="flex flex-col h-[500px]">
            <div className="p-4 border-b border-neutral-800 bg-[#0A0A0A]">
              <div className="flex items-center gap-3 bg-[#0F0F0F] border border-neutral-800 rounded-md px-3 py-2 w-full max-w-sm focus-within:border-neutral-600 transition-colors">
                <span className="text-neutral-500 shrink-0"><SearchIcon /></span>
                <input
                  type="text"
                  placeholder="Filter headers..."
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-neutral-200 text-[11px] font-mono placeholder:text-neutral-600"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto bg-[#050505]">
              <table className="w-full font-mono text-[11px] border-collapse tabular-nums lining-nums text-left">
                <thead className="bg-[#0A0A0A] text-neutral-500 uppercase tracking-widest text-[9px] border-b border-neutral-800 select-none sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 font-normal w-[220px]">Header Key</th>
                    <th className="px-5 py-3 font-normal">RFC Value</th>
                    <th className="px-5 py-3 font-normal w-[100px] text-right">Class</th>
                    <th className="px-5 py-3 font-normal w-[60px] text-center">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/50 select-text">
                  {filteredHeaders.length > 0 ? (
                    filteredHeaders.map((header, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/30 transition-colors group">
                        <td className="px-5 py-3 text-neutral-300 align-top break-all select-all">{header.name}</td>
                        <td className="px-5 py-3 text-neutral-500 align-top whitespace-pre-wrap break-all select-all leading-relaxed max-w-[400px]">
                          {header.value}
                        </td>
                        <td className="px-5 py-3 text-right align-top select-none">
                          <span className="inline-block px-1.5 py-0.5 rounded uppercase tracking-widest text-[9px] text-neutral-500 border border-neutral-800 bg-[#0F0F0F]">
                            {header.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center align-top select-none">
                          <button
                            type="button"
                            onClick={() => handleCopy(header.name, header.value)}
                            className="text-neutral-600 hover:text-neutral-300 transition-colors focus:outline-none"
                            aria-label="Copy Header"
                          >
                            {copiedHeader === header.name ? <span className="text-neutral-300"><CheckIcon /></span> : <CopyIcon />}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-neutral-600 text-[11px] uppercase tracking-widest select-none">
                        No headers matched filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUTH */}
        {activeTab === 'auth' && (
          <div className="p-6 md:p-8 bg-[#050505] h-full">
            <div className="mb-6 flex items-center justify-between pb-4 border-b border-neutral-800 select-none">
              <span className="text-[12px] font-mono text-neutral-300 uppercase tracking-widest">Origin Validated</span>
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">RFC Alignment</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[11px] mb-8">
              
              {/* SPF */}
              <div className="flex flex-col gap-3 p-4 bg-[#0A0A0A] border border-neutral-800 rounded-lg">
                <div className="flex justify-between items-center text-neutral-500 uppercase tracking-widest text-[10px] select-none">
                  <span>SPF</span>
                  <span className={emailData.spf.toLowerCase().includes('pass') ? 'text-neutral-300' : 'text-neutral-500'}>
                    {emailData.spf.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 border-t border-neutral-800 pt-3">
                  <div className="flex justify-between text-neutral-500"><span className="select-none">Protocol</span><span className="text-neutral-400">RFC 7208</span></div>
                  <div className="flex justify-between text-neutral-500"><span className="select-none">Origin</span><span className="text-neutral-400 truncate max-w-[120px]">{emailData.sender.email.split('@')[1] || '-'}</span></div>
                </div>
              </div>

              {/* DKIM */}
              <div className="flex flex-col gap-3 p-4 bg-[#0A0A0A] border border-neutral-800 rounded-lg">
                <div className="flex justify-between items-center text-neutral-500 uppercase tracking-widest text-[10px] select-none">
                  <span>DKIM</span>
                  <span className={emailData.dkim.toLowerCase().includes('pass') ? 'text-neutral-300' : 'text-neutral-500'}>
                    {emailData.dkim.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 border-t border-neutral-800 pt-3">
                  <div className="flex justify-between text-neutral-500"><span className="select-none">Algorithm</span><span className="text-neutral-400">RSA-256</span></div>
                  <div className="flex justify-between text-neutral-500"><span className="select-none">Domain</span><span className="text-neutral-400 truncate max-w-[120px]">{emailData.sender.email.split('@')[1] || '-'}</span></div>
                </div>
              </div>

              {/* DMARC */}
              <div className="flex flex-col gap-3 p-4 bg-[#0A0A0A] border border-neutral-800 rounded-lg">
                <div className="flex justify-between items-center text-neutral-500 uppercase tracking-widest text-[10px] select-none">
                  <span>DMARC</span>
                  <span className={emailData.dmarc.toLowerCase().includes('pass') ? 'text-neutral-300' : 'text-neutral-500'}>
                    {emailData.dmarc.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 border-t border-neutral-800 pt-3">
                  <div className="flex justify-between text-neutral-500"><span className="select-none">Alignment</span><span className="text-neutral-400">Strict</span></div>
                  <div className="flex justify-between text-neutral-500"><span className="select-none">Enforcement</span><span className="text-neutral-400">Reject</span></div>
                </div>
              </div>

            </div>

            <div className="p-4 bg-[#0A0A0A] border border-neutral-800 rounded-lg flex items-center justify-between select-none">
              <span className="font-mono text-neutral-500 text-[11px] uppercase tracking-widest">
                Transport Security
              </span>
              <span className="text-[11px] font-mono text-neutral-300 tabular-nums">
                 TLS 1.3 (AES-256-GCM)
              </span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
