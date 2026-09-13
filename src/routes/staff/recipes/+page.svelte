<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getManualItems } from '$lib/api/manualItem.js';
	import { createPagedList } from '$lib/utils/pagedList.svelte.js';
	import CupIcon from '$lib/components/CupIcon.svelte';

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

<div class="hdr"><div><div class="eyebrow">메뉴 {list.items.length}종</div><h1>레시피</h1></div></div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="menu">
		{#each list.items as r (r.id)}
			<a href={`/staff/recipes/${r.id}`}>
				<div class="cup"><CupIcon color={colorFor(r.id)} /></div>
				<div class="cap"><b>{r.content?.nameKo}</b><span>{r.content?.nameEn}</span></div>
			</a>
		{:else}
			<div class="empty">아직 없어요</div>
		{/each}
	</div>
	{#if list.hasNext}<button class="btn s" style="margin-top:10px" onclick={list.loadMore}>더보기</button>{/if}
{/if}
