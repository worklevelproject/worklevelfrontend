import { writable } from 'svelte/store';

export const toast = writable(/** @type {{message:string, undo?:() => void, onClick?:() => void} | null} */ (null));

let hideTimer;

/** @param {string} message @param {{undo?: () => void, onClick?: () => void}} [opt]
 * onClick이 있으면 토스트 전체가 클릭 가능해진다(예: 푸시 알림 토스트 클릭 시 해당 알람으로
 * 이동) — undo와 동시에 쓰지 않는다는 전제. */
export function showToast(message, opt = {}) {
	clearTimeout(hideTimer);
	toast.set({ message, undo: opt.undo, onClick: opt.onClick });
	hideTimer = setTimeout(() => toast.set(null), opt.undo || opt.onClick ? 5000 : 2400);
}
