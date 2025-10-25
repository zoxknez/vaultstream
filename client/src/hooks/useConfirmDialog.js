import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

function useConfirmDialog() {
  const [options, setOptions] = useState(null);
  const pendingRef = useRef(null);

  const closeDialog = useCallback(() => {
    setOptions(null);
  }, []);

  const confirm = useCallback((dialogOptions = {}) => {
    return new Promise((resolve) => {
      pendingRef.current = { resolve, dialogOptions };
      setOptions(dialogOptions);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) {
      closeDialog();
      return;
    }

    pendingRef.current = null;
    pending.dialogOptions?.onConfirm?.();
    pending.resolve(true);
    closeDialog();
  }, [closeDialog]);

  const handleCancel = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) {
      closeDialog();
      return;
    }

    pendingRef.current = null;
    pending.dialogOptions?.onCancel?.();
    pending.resolve(false);
    closeDialog();
  }, [closeDialog]);

  const dialog = options ? (
    <ConfirmDialog
      open
      title={options.title}
      message={options.message}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      danger={options.danger}
      icon={options.icon}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return [confirm, dialog];
}

export default useConfirmDialog;
