<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { setAccessToken } from '$lib/api/token.js';
	import { session, isOwner } from '$lib/stores/session.js';
	import { get } from 'svelte/store';

	let error = $state('');

	onMount(async () => {
		const token = page.url.searchParams.get('accessToken');
		if (!token) {
			error = '로그인 토큰을 받지 못했어요.';
			return;
		}
		setAccessToken(token);
		try {
			await session.loadFromStorage();
			const s = get(session);
			if (!s.storeId) {
				await goto('/onboarding');
			} else {
				await goto(get(isOwner) ? '/owner/today' : '/staff/today');
			}
		} catch {
			await goto('/onboarding');
		}
	});
</script>

<svelte:head><title>로그인 중 · WORKLEVEL</title></svelte:head>

<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:var(--pewter)">
	{#if error}
		<div>
			<p>{error}</p>
			<a class="link b" href="/login">다시 로그인</a>
		</div>
	{:else}
		<p>로그인 처리 중이에요…</p>
	{/if}
</div>
