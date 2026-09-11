<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getOwnerWeeklySchedule } from '$lib/api/work.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { mondayOf, addDays, todayISO, weekOf, toHM } from '$lib/utils/date.js';
	import { WORK_REQUEST_STATUS, statusPillClass } from '$lib/utils/labels.js';
	import AddShiftDrawer from '$lib/components/drawers/AddShiftDrawer.svelte';
	import ShiftDetailDrawer from '$lib/components/drawers/ShiftDetailDrawer.svelte';

	let weekOffset = $state(0);
	let schedule = $state(/** @type {any} */ (null));
	let loading = $state(true);
	let error = $state('');

	const baseMonday = mondayOf(todayISO());
	const monday = $derived(addDays(baseMonday, weekOffset * 7));
	const ws = $derived(weekOf(monday));
	const today = todayISO();

	async function load() {
		loading = true;
		error = '';
		try {
			schedule = await getOwnerWeeklySchedule($session.storeId, monday);
		} catch (e) {
			error = e?.message || '불러오기에 실패했어요';
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		monday; // eslint-disable-line no-unused-expressions
		load();
	});

	function daysOf(iso) {
		return schedule?.days.find((d) => d.date === iso)?.works || [];
	}

	function openDetail(workId) {
		openDrawer(ShiftDetailDrawer, { workId, onDone: load });
	}
	function openAdd(iso) {
		openDrawer(AddShiftDrawer, { defaultDate: iso, onDone: load });
	}
</script>

<svelte:head><title>근무표 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">{ws[0]?.m}월 {ws[0]?.n}일 – {ws[6]?.m}월 {ws[6]?.n}일{weekOffset === 0 ? ' · 이번 주' : weekOffset > 0 ? ' · 다음 주' : ' · 지난주'}</div>
		<h1>근무표</h1>
	</div>
	<div class="acts">
		<button class="btn s" onclick={() => weekOffset--}>‹ 지난주</button>
		<button class="btn s" disabled={weekOffset === 0} onclick={() => (weekOffset = 0)}>이번 주</button>
		<button class="btn s" onclick={() => weekOffset++}>다음 주 ›</button>
		<button class="btn p" onclick={() => openAdd(today)}>근무 넣기</button>
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
				<div class="dh"><b>{w.n}</b><small>{w.d}{w.iso === today ? ' · 오늘' : ''} · {daysOf(w.iso).length}건</small></div>
				{#each daysOf(w.iso) as work (work.workId)}
					<button class="blk" onclick={() => openDetail(work.workId)}>
						<div class="tm">{toHM(work.startTime)}–{toHM(work.endTime)}</div>
						<div class="nm">{work.title}</div>
						<div class="rs" style="color:var(--pewter)">
							{work.workers.map((wr) => wr.alias).join(', ') || '아직 없음'}
						</div>
					</button>
				{/each}
				<button class="add" onclick={() => openAdd(w.iso)}>+ 근무 넣기</button>
			</div>
		{/each}
	</div>
	<p class="tiny muted" style="margin-top:16px">
		근무를 누르면 참여자 상태를 자세히 볼 수 있어요. 직원별 매트릭스·월간 캘린더 뷰는 이번 포팅에서는 생략했어요.
	</p>
{/if}
