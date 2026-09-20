<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authReady } from '$lib/stores/authReady.js';
	import { session, isOwner } from '$lib/stores/session.js';
	import { getAccessToken } from '$lib/api/token.js';
	import { startPolling, stopPolling } from '$lib/stores/notifications.js';
	import { titleFor } from '$lib/utils/titles.js';
	import { counterpartPath } from '$lib/utils/viewMap.js';
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
			// 점주↔테스트 멤버 전환으로 역할이 바뀐 경우 같은 종류의 화면으로 보낸다
			await goto(counterpartPath(page.url.pathname, actuallyOwner ? 'owner' : 'staff'));
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
		<!-- 보는 사람(테스트 멤버)이 바뀌면 화면을 새로 마운트해 그 사람 기준으로 다시 불러온다 -->
		{#key $session.ticketId}
			{@render children?.()}
		{/key}
	</Shell>
{/if}
