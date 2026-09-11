import { writable } from 'svelte/store';

/** 프로토타입의 confirmBox()를 대체하는 전역 확인 모달. */
export const confirmState = writable(
	/** @type {{title:string, message:string, okLabel:string, danger?:boolean, onConfirm:() => void} | null} */ (null)
);

export function confirmBox(title, message, okLabel, onConfirm, danger = false) {
	confirmState.set({ title, message, okLabel, danger, onConfirm });
}

export function closeConfirm() {
	confirmState.set(null);
}
