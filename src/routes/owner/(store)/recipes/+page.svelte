<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getManualItems } from '$lib/api/manualItem.js';
	import { createPagedList } from '$lib/utils/pagedList.svelte.js';
	import ProtectedThumb from '$lib/components/ProtectedThumb.svelte';

	const PALETTE = ['#5b3a25', '#c9a27a', '#d8b98c', '#3a2417', '#7f9b5a', '#e88c6a', '#6b4a35', '#e8a0a8'];
	const colorFor = (id) => PALETTE[id % PALETTE.length];

	let loading = $state(true);
	const list = createPagedList((offset) => getManualItems($session.storeId, 'RECIPE', offset));

	onMount(async () => {
		try {
			await list.load();
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>레시피 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">메뉴 {list.items.length}종</div>
		<h1>레시피</h1>
	</div>
	<div class="acts"><a class="btn p" href="/owner/recipes/new">레시피 추가</a></div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="menu">
		<a class="add" href="/owner/recipes/new"><b>+</b>레시피 추가<span class="tiny">사진 · 재료 · 순서</span></a>
		{#each list.items as r (r.id)}
			<a href={`/owner/recipes/${r.id}`}>
				<div class="cup"><ProtectedThumb s3FileId={r.thumbnailS3FileId} color={colorFor(r.id)} /></div>
				<div class="cap"><b>{r.content?.nameKo}</b><span>{r.content?.nameEn}</span></div>
			</a>
		{/each}
	</div>
	{#if list.hasNext}<button class="btn s" style="margin-top:10px" onclick={list.loadMore}>더보기</button>{/if}
{/if}
