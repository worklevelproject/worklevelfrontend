import { writable } from 'svelte/store';

export const toast = writable(/** @type {{message:string, undo?:() => void} | null} */ (null));

let hideTimer;

/** @param {string} message @param {{undo?: () => void}} [opt] */
export function showToast(message, opt = {}) {
	clearTimeout(hideTimer);
	toast.set({ message, undo: opt.undo });
	hideTimer = setTimeout(() => toast.set(null), opt.undo ? 5000 : 2400);
}
