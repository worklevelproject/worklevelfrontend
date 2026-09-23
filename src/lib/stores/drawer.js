import { writable } from 'svelte/store';

/**
 * 프로토타입의 openSheet()/closeSheet()를 대체하는 전역 드로어 스택.
 * 컴포넌트를 동적으로 끼워 넣는다: openDrawer(MyDrawer.svelte, { propA: 1 })
 *
 * 닫을 때 props를 null로 비우지 않고 open만 끈다. 드로어는 보통 closeDrawer() 직후 onDone()을
 * 부르는데, DrawerHost가 props를 $drawer.props에서 펼쳐 넘기므로 비워 버리면 그 시점에 onDone을
 * 못 읽어(TypeError) 목록이 새로고침 전까지 갱신되지 않는다.
 */
export const drawer = writable(
	/** @type {{component: any, props: any, open: boolean}} */ ({ component: null, props: {}, open: false })
);

export function openDrawer(component, props = {}) {
	drawer.set({ component, props, open: true });
}

export function closeDrawer() {
	drawer.update((d) => ({ ...d, open: false }));
}
