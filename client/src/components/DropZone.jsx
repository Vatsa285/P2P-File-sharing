// DropZone — Drag & drop + click-to-browse file selector

import { useState, useRef } from 'react';

export default function DropZone({ onFilesSelected, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0 && !disabled) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleInputChange = (e) => {
    if (e.target.files?.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div
      id="drop-zone"
      onClick={handleClick}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed p-10
        transition-all duration-300 ease-out text-center
        ${disabled
          ? 'border-surface-700 bg-surface-900/30 opacity-50 cursor-not-allowed'
          : isDragging
            ? 'border-accent-500 bg-accent-500/10 scale-[1.02] shadow-lg shadow-accent-500/20'
            : 'border-surface-700 bg-surface-900/50 hover:border-primary-400 hover:bg-surface-800/60'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Icon */}
      <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-accent-500/20' : 'bg-primary-500/10'}`}>
        <svg className={`w-8 h-8 ${isDragging ? 'text-accent-400' : 'text-primary-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>

      <p className="text-lg font-semibold text-surface-200">
        {isDragging ? 'Drop files here' : 'Drag & drop files here'}
      </p>
      <p className="mt-1 text-sm text-surface-500">
        or <span className="text-primary-400 underline underline-offset-2">browse files</span>
      </p>
      <p className="mt-3 text-xs text-surface-600">
        All file types supported • Transferred directly peer-to-peer
      </p>
    </div>
  );
}
