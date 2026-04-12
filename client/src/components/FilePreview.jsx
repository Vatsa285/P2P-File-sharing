// FilePreview — Preview images and text files after transfer

import { useState, useEffect } from 'react';

function isImageType(type) {
  return type && type.startsWith('image/');
}

function isTextType(type) {
  return (
    type &&
    (type.startsWith('text/') ||
      type === 'application/json' ||
      type === 'application/xml' ||
      type === 'application/javascript')
  );
}

export default function FilePreview({ file, onClose }) {
  const [textContent, setTextContent] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (!file || !file.blob) return;

    if (isImageType(file.fileType)) {
      const url = URL.createObjectURL(file.blob);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    if (isTextType(file.fileType)) {
      const reader = new FileReader();
      reader.onload = (e) => setTextContent(e.target.result);
      reader.readAsText(file.blob);
    }
  }, [file]);

  if (!file) return null;

  const canPreview = isImageType(file.fileType) || isTextType(file.fileType);

  if (!canPreview) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-900 border border-surface-700 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-800">
          <h3 className="text-sm font-medium text-surface-200 truncate">{file.fileName}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-auto max-h-[calc(85vh-56px)]">
          {imageUrl && (
            <img src={imageUrl} alt={file.fileName} className="max-w-full h-auto rounded-lg mx-auto" />
          )}
          {textContent !== null && (
            <pre className="text-sm text-surface-300 bg-surface-950 rounded-lg p-4 overflow-auto whitespace-pre-wrap font-mono">
              {textContent}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
