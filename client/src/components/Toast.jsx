import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const TOAST_DURATION = 5000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const normalizeArgs = useCallback((durationOrOptions, maybeOptions) => {
    if (typeof durationOrOptions === 'object' && durationOrOptions !== null) {
      const { duration, ...rest } = durationOrOptions;
      return {
        duration: typeof duration === 'number' ? duration : TOAST_DURATION,
        options: rest
      };
    }

    if (typeof maybeOptions === 'object' && maybeOptions !== null) {
      const { duration, ...rest } = maybeOptions;
      const resolvedDuration = typeof durationOrOptions === 'number'
        ? durationOrOptions
        : (typeof duration === 'number' ? duration : TOAST_DURATION);
      return {
        duration: resolvedDuration,
        options: rest
      };
    }

    return {
      duration: typeof durationOrOptions === 'number' ? durationOrOptions : TOAST_DURATION,
      options: {}
    };
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = TOAST_DURATION, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration, ...options };
    
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message, durationOrOptions, maybeOptions) => {
    const { duration, options } = normalizeArgs(durationOrOptions, maybeOptions);
    return addToast(message, 'success', duration, options);
  }, [addToast, normalizeArgs]);

  const error = useCallback((message, durationOrOptions, maybeOptions) => {
    const { duration, options } = normalizeArgs(durationOrOptions, maybeOptions);
    return addToast(message, 'error', duration, options);
  }, [addToast, normalizeArgs]);

  const warning = useCallback((message, durationOrOptions, maybeOptions) => {
    const { duration, options } = normalizeArgs(durationOrOptions, maybeOptions);
    return addToast(message, 'warning', duration, options);
  }, [addToast, normalizeArgs]);

  const info = useCallback((message, durationOrOptions, maybeOptions) => {
    const { duration, options } = normalizeArgs(durationOrOptions, maybeOptions);
    return addToast(message, 'info', duration, options);
  }, [addToast, normalizeArgs]);

  const value = {
    success,
    error,
    warning,
    info,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

const Toast = ({ message, type, onClose, actionLabel, onAction }) => {
  const icons = {
    success: <CheckCircle2 size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">
        {icons[type]}
      </div>
      <div className="toast-content">
        <div className="toast-message">{message}</div>
        {actionLabel && typeof onAction === 'function' && (
          <button
            className="toast-action"
            onClick={() => onAction()}
            aria-label={actionLabel}
          >
            {actionLabel}
          </button>
        )}
      </div>
      <button 
        className="toast-close" 
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default ToastProvider;
