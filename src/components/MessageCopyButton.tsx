import React from 'react';
import { Copy, Check } from 'lucide-react';

export function MessageCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="p-1.5 rounded-full hover:bg-white/[0.08] text-neutral-500 hover:text-white transition-colors outline-none"
      title="Copy message"
      aria-label="Copy message"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
