<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authReady } from '$lib/stores/authReady.js';
	import { session, isOwner } from '$lib/stores/session.js';
	import { getAccessToken } from '$lib/api/token.js';
	import { get } from 'svelte/store';

	$effect(() => {
		if (!$authReady) return;
		route();
	});

	async function route() {
		if (!getAccessToken()) {
			await goto('/login');
			return;
		}
		await session.loadFromStorage();
		const s = get(session);
		if (!s.storeId) {
			await goto('/onboarding');
		} else {
			await goto(get(isOwner) ? '/owner/today' : '/staff/today');
		}
	}
</script>

<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:var(--pewter)">
	불러오는 중…
</div>
