<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getNotices } from '$lib/api/notice.js';
	import { rel, toHM } from '$lib/utils/date.js';

	let notices = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	let openId = $state(/** @type {number | null} */ (null));

	onMount(async () => {
		try {
			notices = await getNotices($session.storeId);
		} finally {
			loading = false;
		}
	});

	function view(n) {
		openId = openId === n.id ? null : n.id;
	}
</script>

<svelte:head><title>공지 · WORKLEVEL</title></svelte:head>

<div class="hdr"><div><h1>공지</h1></div></div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="card w" style="max-width:820px;padding:4px 20px">
		{#each notices as n (n.id)}
			<div class="notice" role="button" tabindex="0" onclick={() => view(n)} onkeydown={(e) => e.key === 'Enter' && view(n)}>
				<div class="main">
					<div class="t">{n.title}</div>
					<div class="s">{n.writer.alias} · {rel(n.createdAt.slice(0, 10))} {toHM(n.createdAt)}</div>
					{#if openId === n.id}<div class="b">{n.content}</div>{/if}
				</div>
			</div>
		{:else}
			<div class="empty">공지가 없어요</div>
		{/each}
	</div>
{/if}
