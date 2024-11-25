import type { DeviceType } from '$lib/types';
import { writable } from 'svelte/store';

export const navigationDirection = writable(0);

export const loadingViewStore = writable(false);

export const loadingRequestStore = writable(false);

export const isAccessError = writable(false);

export const deviceTypeStore = writable<DeviceType>();

export const paramsSortStore = writable<'sell' | 'buy'>('sell');
