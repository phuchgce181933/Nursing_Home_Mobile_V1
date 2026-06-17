import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar } from 'react-native-paper';

type ToastType = 'success' | 'error' | 'warning';
type ToastFn = (message: string, type?: ToastType, action?: { label: string; onPress: () => void }) => void;

const ToastContext = createContext<ToastFn>(() => {});

export const useToast = () => useContext(ToastContext);

const BG: Record<ToastType, string> = {
  success: '#065F46',
  error: '#991B1B',
  warning: '#92400E',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [action, setAction] = useState<{ label: string; onPress: () => void } | undefined>();

  const show: ToastFn = useCallback((message, t = 'success', a) => {
    setMsg(message);
    setType(t);
    setAction(a);
    setVisible(true);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={type === 'error' ? 5000 : 3000}
        style={{ backgroundColor: BG[type] }}
        action={action}
      >
        {msg}
      </Snackbar>
    </ToastContext.Provider>
  );
};
