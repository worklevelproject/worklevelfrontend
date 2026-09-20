<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { counterpartPath } from '$lib/utils/viewMap.js';
	import Sidebar from './Sidebar.svelte';
	import Topbar from './Topbar.svelte';
	import { session } from '$lib/stores/session.js';
	import { showToast } from '$lib/stores/toast.js';

	/** @type {{owner: boolean, title: string, children?: import('svelte').Snippet}} */
	let { owner, title, children } = $props();

	async function backToOwner() {
		try {
			await session.exitActing();
			await goto(counterpartPath(page.url.pathname, 'owner'));
		} catch (e) {
			showToast(e?.message || '점주 화면으로 돌아가지 못했어요');
		}
	}
</script>

<div class="shell">
	<Sidebar {owner} />
	<div class="main">
		<Topbar {title} />
		{#if $session.acting}
			<div class="issue wait" style="margin:12px 32px 0">
				<div class="bar"></div>
				<div class="main"><div class="t">테스트 멤버 {$session.acting}로 보는 중</div><div class="s">지금 하는 조작은 이 멤버 이름으로 처리돼요</div></div>
				<button class="btn p sm" onclick={backToOwner}>점주로 돌아가기</button>
			</div>
		{/if}
		<main class="page fade">
			{@render children?.()}
		</main>
	</div>
</div>
