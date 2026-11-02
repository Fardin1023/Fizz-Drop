import React from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCheck,
} from 'lucide-react';

export interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileName?: string | null;
  fileType?: string | null;
  fileData?: string | null;
}

export const getDocCategory = (fileType?: string | null, fileName?: string | null, fileData?: string | null): 'IMAGE' | 'PDF' | 'EXCEL' | 'OTHER' => {
  const typeLower = (fileType || '').toLowerCase();
  const nameLower = (fileName || '').toLowerCase();
  const dataLower = (fileData || '').toLowerCase();

  if (
    typeLower.startsWith('image/') ||
    dataLower.startsWith('data:image/') ||
    nameLower.match(/\.(png|jpe?g|webp|svg|gif|bmp)$/)
  ) {
    return 'IMAGE';
  }

  if (
    typeLower.includes('pdf') ||
    dataLower.startsWith('data:application/pdf') ||
    nameLower.endsWith('.pdf')
  ) {
    return 'PDF';
  }

  if (
    typeLower.includes('sheet') ||
    typeLower.includes('excel') ||
    typeLower.includes('csv') ||
    nameLower.match(/\.(xlsx|xls|csv)$/)
  ) {
    return 'EXCEL';
  }

  return 'OTHER';
};

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  fileName,
  fileType,
  fileData,
}) => {
  if (!isOpen || !fileData) return null;

  const category = getDocCategory(fileType, fileName, fileData);
  const resolvedFileName = fileName || `${title.replace(/\s+/g, '_')}_document`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = resolvedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    if (category === 'IMAGE' || category === 'PDF') {
      const win = window.open();
      if (win) {
        if (category === 'PDF') {
          win.document.write(
            `<iframe src="${fileData}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
          );
        } else {
          win.document.write(
            `<body style="margin:0; background:#0f172a; display:flex; align-items:center; justify-content:center; height:100vh;"><img src="${fileData}" style="max-width:95vw; max-height:95vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5);" /></body>`
          );
        }
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              {category === 'PDF' && <FileText className="w-5 h-5 text-rose-400" />}
              {category === 'IMAGE' && <ImageIcon className="w-5 h-5 text-sky-400" />}
              {category === 'EXCEL' && <FileSpreadsheet className="w-5 h-5 text-emerald-400" />}
              {category === 'OTHER' && <FileCheck className="w-5 h-5 text-indigo-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-oswald uppercase tracking-wider">{title}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                    category === 'PDF'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                      : category === 'IMAGE'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                      : category === 'EXCEL'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                  }`}
                >
                  {category} ATTACHMENT
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-md">{resolvedFileName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Download file to device"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            {(category === 'IMAGE' || category === 'PDF') && (
              <button
                onClick={handleOpenInNewTab}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Expand</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="p-4 sm:p-6 bg-slate-50 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[350px]">
          {category === 'IMAGE' && (
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-full">
              <img
                src={fileData}
                alt={title}
                className="max-h-[65vh] max-w-full object-contain rounded-xl mx-auto shadow-inner"
              />
            </div>
          )}

          {category === 'PDF' && (
            <div className="w-full h-[65vh] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <iframe
                src={fileData}
                title={title}
                className="w-full h-full border-0"
              />
            </div>
          )}

          {category === 'EXCEL' && (
            <div className="text-center p-8 bg-white rounded-3xl border border-emerald-100 shadow-md max-w-md w-full space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                <FileSpreadsheet className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{resolvedFileName}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Spreadsheet document (Excel / CSV) submitted for compliance verification.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleDownload}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Spreadsheet ({resolvedFileName.split('.').pop()?.toUpperCase() || 'XLSX'})</span>
                </button>
              </div>
            </div>
          )}

          {category === 'OTHER' && (
            <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-md max-w-md w-full space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto shadow-sm">
                <FileCheck className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{resolvedFileName}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Attached compliance document ready for inspection.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleDownload}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">Format: {fileType || category}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
