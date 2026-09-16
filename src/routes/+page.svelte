<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authReady } from '$lib/stores/authReady.js';
	import { resolveEntryPath } from '$lib/stores/session.js';
	import { getAccessToken } from '$lib/api/token.js';

	$effect(() => {
		if (!$authReady) return;
		route();
	});

	async function route() {
		if (!getAccessToken()) {
			await goto('/login');
			return;
		}
		await goto(await resolveEntryPath());
	}
</script>

<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:var(--pewter)">
	불러오는 중…
</div>
