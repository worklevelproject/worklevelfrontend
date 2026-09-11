import { writable } from 'svelte/store';

/**
 * 프로토타입의 openSheet()/closeSheet()를 대체하는 전역 드로어 스택.
 * 컴포넌트를 동적으로 끼워 넣는다: openDrawer(MyDrawer.svelte, { propA: 1 })
 */
export const drawer = writable(/** @type {{component: any, props: any} | null} */ (null));

export function openDrawer(component, props = {}) {
	drawer.set({ component, props });
}

export function closeDrawer() {
	drawer.set(null);
}
