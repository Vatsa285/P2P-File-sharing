// TransferProgress — Progress bar with speed, ETA, and cancel support

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSecond) {
  if (bytesPerSecond > 1024 * 1024) return (bytesPerSecond / (1024 * 1024)).toFixed(1) + ' MB/s';
  if (bytesPerSecond > 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
  return bytesPerSecond.toFixed(0) + ' B/s';
}

function formatETA(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '--';
  if (seconds < 60) return Math.ceil(seconds) + 's';
  if (seconds < 3600) return Math.ceil(seconds / 60) + 'm ' + Math.ceil(seconds % 60) + 's';
  return Math.floor(seconds / 3600) + 'h ' + Math.ceil((seconds % 3600) / 60) + 'm';
}

export default function TransferProgress({ transfer, onCancel }) {
  const { transferId, fileName, fileSize, direction, progress, speed, status } = transfer;

  const isActive = status === 'transferring';
  const isComplete = status === 'completed';
  const isCancelled = status === 'cancelled';

  const remaining = speed > 0 ? ((fileSize * (100 - progress)) / 100) / speed : Infinity;

  const isUpload = direction === 'upload';

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-300 ${
        isComplete
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : isCancelled
            ? 'bg-red-500/5 border-red-500/20 opacity-60'
            : 'bg-surface-800/50 border-surface-700/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isUpload ? 'bg-primary-500/15 text-primary-400' : 'bg-accent-500/15 text-accent-400'
          }`}
        >
          {isUpload ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-surface-200 truncate">{fileName}</p>
            {isActive && onCancel && (
              <button
                id={`cancel-transfer-${transferId}`}
                onClick={() => onCancel(transferId, direction)}
                className="shrink-0 text-xs px-2 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
            <span>{formatBytes(fileSize)}</span>
            <span>•</span>
            <span className="capitalize">{isUpload ? '↑ Upload' : '↓ Download'}</span>
            {isActive && (
              <>
                <span>•</span>
                <span>{formatSpeed(speed)}</span>
                <span>•</span>
                <span>ETA {formatETA(remaining)}</span>
              </>
            )}
            {isComplete && (
              <>
                <span>•</span>
                <span className="text-emerald-400">✓ Complete</span>
              </>
            )}
            {isCancelled && (
              <>
                <span>•</span>
                <span className="text-red-400">✕ Cancelled</span>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 rounded-full bg-surface-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isComplete
                  ? 'bg-emerald-500'
                  : isCancelled
                    ? 'bg-red-500'
                    : isUpload
                      ? 'bg-gradient-to-r from-primary-500 to-primary-400'
                      : 'bg-gradient-to-r from-accent-500 to-accent-400'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <p className="mt-1 text-xs text-surface-500 text-right">{progress.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
