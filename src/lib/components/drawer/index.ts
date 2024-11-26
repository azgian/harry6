import { writable } from 'svelte/store';

export type DrawerPosition = 'left' | 'right' | 'bottom' | 'top';

interface DrawerState
{
    componentName: string;
    isOpen: boolean;
    position: DrawerPosition;
}

const createDrawerStore = () => {
    const store = writable<DrawerState>({
        componentName: 'MyInfo',
        isOpen: false,
        position: 'right',
    });

    const showDrawer = (
        componentName: string,
        position: DrawerPosition = 'right',
    ) => {
        
        store.set({
            componentName,
            isOpen: true,
            position,
        });
    };

    const hideDrawer = () => {
        store.update(state => ({ ...state, isOpen: false }));
    };

    return {
        subscribe: store.subscribe,
        showDrawer,
        hideDrawer
    };
};

export const drawer = createDrawerStore();
