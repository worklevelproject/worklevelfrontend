<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.js';
	import { getNotices } from '$lib/api/notice.js';
	import { rel, toHM } from '$lib/utils/date.js';
	import { createPagedList } from '$lib/utils/pagedList.svelte.js';

	let loading = $state(true);
	let error = $state('');
	/** 알람 클릭으로 들어온 경우 ?open=<noticeId>가 붙어 있다(alarmNav.js 참고) - 최신순 첫
	 * 페이지에 있으면 자동으로 펼쳐준다. */
	let openId = $state(/** @type {number | null} */ (Number(page.url.searchParams.get('open')) || null));

	const notices = createPagedList((offset) => getNotices($session.storeId, offset));

	onMount(async () => {
		try {
			await notices.load();
		} catch (e) {
			error = e?.message || '불러오기에 실패했어요';
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
{:else if error}
	<div class="empty">{error}</div>
{:else}
	<div class="card w" style="max-width:820px;padding:4px 20px">
		{#each notices.items as n (n.id)}
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
		{#if notices.hasNext}<button class="btn s" style="margin-top:10px" onclick={notices.loadMore}>더보기</button>{/if}
	</div>
{/if}
