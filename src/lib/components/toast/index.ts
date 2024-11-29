import { writable } from 'svelte/store';

export type ToastType = 'success' | 'warning' | 'error' | 'info' | 'primary';

interface ToastState {
    message: string;
    show: boolean;
    type: ToastType;
    duration: number | null;
    showButtons: boolean;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
}

const createToastStore = () => {
    const store = writable<ToastState>({
        message: '',
        show: false,
        type: 'info',
        duration: null,
        showButtons: false,
        onConfirm: null,
        onCancel: null
    });

    let timeoutId: number | null = null;

    const clearToastTimeout = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    const show = (
        message: string, 
        type: ToastType = 'info', 
        duration: number | null = null, 
        onConfirm: (() => void) | null = null, 
        onCancel: (() => void) | null = null
    ) => {
        clearToastTimeout();
        
        store.set({
            message,
            show: true,
            type,
            duration,
            showButtons: duration ? false : true,
            onConfirm,
            onCancel
        });
        
        if (duration !== null) {
            timeoutId = window.setTimeout(() => {
                store.update(state => ({ ...state, show: false }));
            }, duration);
        }
    };

    const hide = () => {
        clearToastTimeout();
        store.update(state => ({ ...state, show: false }));
    };

    const handleConfirm = () => {
        store.update(state => {
            if (state.onConfirm) {
                state.onConfirm();
            }
            return { ...state, show: false };
        });
        clearToastTimeout();
    };

    const handleCancel = () => {
        store.update(state => {
            if (state.onCancel) {
                state.onCancel();
            }
            return { ...state, show: false };
        });
        clearToastTimeout();
    };

    return {
        subscribe: store.subscribe,
        show,
        hide,
        handleConfirm,
        handleCancel
    };
};

export const toast = createToastStore();
