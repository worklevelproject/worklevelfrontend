<script>
	import { session } from '$lib/stores/session.js';
	import { mock, markNoticeRead } from '$lib/stores/mock.js';

	let openId = $state(/** @type {number | null} */ (null));

	function view(n) {
		openId = openId === n.id ? null : n.id;
		if ($session.ticketId) markNoticeRead(n.id, $session.ticketId);
	}
</script>

<svelte:head><title>공지 · WORKLEVEL</title></svelte:head>

<div class="hdr"><div><div class="eyebrow">백엔드에 공지 도메인이 아직 없어요<span class="mock-badge">목업</span></div><h1>공지</h1></div></div>

<div class="card w" style="max-width:820px;padding:4px 20px">
	{#each $mock.notices as n (n.id)}
		<div class="notice" role="button" tabindex="0" onclick={() => view(n)} onkeydown={(e) => e.key === 'Enter' && view(n)}>
			<div class="main">
				<div class="t">{n.pin ? '[꼭 읽기] ' : ''}{n.title}</div>
				<div class="s">{n.by} · {n.at}</div>
				{#if openId === n.id}<div class="b">{n.body}</div>{/if}
			</div>
		</div>
	{:else}
		<div class="empty">공지가 없어요</div>
	{/each}
</div>
