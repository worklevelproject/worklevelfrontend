import { writable } from 'svelte/store';

/** 새로고침 직후 accessToken 복구(tryRestoreSession) 시도가 끝났는지 여부. */
export const authReady = writable(false);
