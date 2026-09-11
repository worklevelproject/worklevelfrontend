<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authReady } from '$lib/stores/authReady.js';
	import { session, isOwner } from '$lib/stores/session.js';
	import { getAccessToken } from '$lib/api/token.js';
	import { startPolling, stopPolling } from '$lib/stores/notifications.js';
	import { titleFor } from '$lib/utils/titles.js';
	import Shell from './Shell.svelte';

	/** @type {{owner: boolean, children?: import('svelte').Snippet}} */
	let { owner, children } = $props();

	let checked = $state(false);

	$effect(() => {
		if (!$authReady) return;
		guard();
	});

	async function guard() {
		if (!getAccessToken()) {
			await goto('/login');
			return;
		}
		if (!$session.ready) {
			try {
				await session.loadFromStorage();
			} catch {
				/* selectStore가 실패로 이미 세션을 비웠음 */
			}
		}
		if (!$session.storeId) {
			await goto('/onboarding');
			return;
		}
		const actuallyOwner = get_isOwner();
		if (owner !== actuallyOwner) {
			await goto(actuallyOwner ? '/owner/today' : '/staff/today');
			return;
		}
		checked = true;
		startPolling();
	}

	function get_isOwner() {
		let v = false;
		const unsub = isOwner.subscribe((x) => (v = x));
		unsub();
		return v;
	}

	onDestroy(stopPolling);

	const title = $derived(titleFor(page.url.pathname));
</script>

{#if checked}
	<Shell {owner} {title}>
		{@render children?.()}
	</Shell>
{/if}
