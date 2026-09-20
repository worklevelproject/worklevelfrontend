<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getWorks } from '$lib/api/work.js';
	import { mondayOf, addDays, todayISO, weekOf, toHM, dateOf } from '$lib/utils/date.js';
	import { TIME_TYPE } from '$lib/utils/labels.js';
	import { createPagedList } from '$lib/utils/pagedList.svelte.js';

	let weekOffset = $state(0);
	let loading = $state(true);
	let error = $state('');

	const baseMonday = mondayOf(todayISO());
	const monday = $derived(addDays(baseMonday, weekOffset * 7));
	const ws = $derived(weekOf(monday));
	const today = todayISO();

	// 한 달 치를 offset 페이징으로 받는다 - 이번 주가 속한 달에 근무가 10건을 넘으면
	// "더보기"로 이어 받는다.
	const works = createPagedList((offset) => {
		const m = dateOf(monday);
		return getWorks($session.storeId, { year: m.getFullYear(), month: m.getMonth() + 1, offset });
	});

	async function load() {
		loading = true;
		error = '';
		try {
			await works.load();
		} catch (e) {
			error = e?.message || '불러오기에 실패했어요';
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		monday;
		load();
	});

	function worksOf(iso) {
		return works.items.filter((w) => w.startTime?.slice(0, 10) === iso);
	}
</script>

<svelte:head><title>근무표 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div><div class="eyebrow">우리 매장 전체 · 다른 직원의 이름은 API 제약으로 보이지 않아요<span class="mock-badge">API 제약</span></div><h1>근무표</h1></div>
	<div class="acts">
		<button class="btn s" onclick={() => weekOffset--}>‹ 지난주</button>
		<button class="btn s" disabled={weekOffset === 0} onclick={() => (weekOffset = 0)}>이번 주</button>
		<button class="btn s" onclick={() => weekOffset++}>다음 주 ›</button>
	</div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else if error}
	<div class="empty">{error}</div>
{:else}
	<div class="week">
		{#each ws as w (w.iso)}
			<div class="day {w.iso === today ? 'today' : ''}">
				<div class="dh"><b>{w.n}</b><small>{w.d}{w.iso === today ? ' · 오늘' : ''}</small></div>
				{#each worksOf(w.iso) as work (work.id)}
					<div class="blk" style={work.assigned ? 'outline:1.5px solid var(--carbon)' : ''}>
						<div class="tm">{toHM(work.startTime)}–{toHM(work.endTime)}</div>
						<div class="nm">{TIME_TYPE[work.timeType] ?? '보통'} 근무</div>
						{#if work.assigned}<div class="rs" style="color:var(--blue)">내 근무</div>{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>
	{#if works.hasNext}<button class="btn s" style="margin-top:10px" onclick={works.loadMore}>더보기</button>{/if}
{/if}
