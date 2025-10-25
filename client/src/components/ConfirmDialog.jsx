import { useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmDialog.css';

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  icon: Icon = AlertTriangle
}) {
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (!open) return undefined;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div className="confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="confirm-close"
          aria-label={cancelLabel}
          onClick={onCancel}
        >
          <X size={18} />
        </button>

        <div className={`confirm-icon ${danger ? 'danger' : ''}`}>
          {Icon ? <Icon size={32} /> : null}
        </div>

        {title && (
          <h3 id="confirm-dialog-title" className="confirm-title">
            {title}
          </h3>
        )}

        {message && <p className="confirm-message">{message}</p>}

        <div className="confirm-actions">
          <button type="button" className="confirm-button cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-button confirm ${danger ? 'danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
