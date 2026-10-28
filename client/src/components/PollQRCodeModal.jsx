import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, ExternalLink, QrCode as QrIcon } from 'lucide-react';

export default function PollQRCodeModal({ poll, isOpen, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const joinUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/p/${poll?.code}`
    : `https://ask.urspace.com/p/${poll?.code}`;

  useEffect(() => {
    if (poll && isOpen) {
      QRCode.toDataURL(joinUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('[QR Generation Error]', err));
    }
  }, [poll, isOpen, joinUrl]);

  if (!isOpen || !poll) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mb-3">
            <QrIcon className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Join Live Poll</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            Scan with any phone camera or visit <strong className="text-slate-700">ask.urspace.com/p</strong>
          </p>
        </div>

        {/* QR Code Container */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code to join poll ${poll.code}`} className="w-56 h-56 rounded-lg" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-sm">
                Generating QR Code...
              </div>
            )}
          </div>

          {/* Participant PIN Code Badge */}
          <div className="mt-4 flex flex-col items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Participant PIN Code
            </span>
            <span className="text-3xl sm:text-4xl font-black text-brand-600 tracking-wider font-mono mt-0.5">
              #{poll.code}
            </span>
          </div>
        </div>

        {/* Copy Link & Action buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition active:scale-98"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Link Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Participant Link</span>
              </>
            )}
          </button>

          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <span>Open Participant View in New Tab</span>
          </a>
        </div>
      </div>
    </div>
  );
}
