import { useState, useCallback, useRef } from 'react';
import { ConfirmModal } from '@/components/ConfirmModal';

export const useConfirm = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmVariant: 'danger',
    confirmText: 'Confirm',
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure?',
        confirmVariant: options.confirmVariant || 'danger',
        confirmText: options.confirmText || 'Confirm',
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Rendered as a plain JSX element (NOT an inline component). Defining the
  // dialog as a component inside the hook created a new component type on
  // every state change, forcing React to unmount/remount the modal subtree
  // and breaking react-bootstrap open/close transitions. Consumers render it
  // as {confirmDialog}.
  const confirmDialog = (
    <ConfirmModal
      show={modalState.isOpen}
      onHide={handleClose}
      onConfirm={handleConfirm}
      title={modalState.title}
      message={modalState.message}
      confirmVariant={modalState.confirmVariant}
      confirmText={modalState.confirmText}
    />
  );

  return { confirm, confirmDialog };
};
