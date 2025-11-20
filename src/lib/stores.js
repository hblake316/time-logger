import { writable } from 'svelte/store';

export const activities = writable([]);
export const logs = writable([]);
export const runningActivity = writable(null);

