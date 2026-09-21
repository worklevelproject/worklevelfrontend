<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getOwnerWeeklySchedule, deleteWork } from '$lib/api/work.js';
	import { getEmployees } from '$lib/api/store.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';
	import { mondayOf, addDays, todayISO, weekOf, toHM, hh, dayKeyOf } from '$lib/utils/date.js';
	import { TIME_TYPE, holidayNameOf } from '$lib/utils/labels.js';
	import AddShiftDrawer from '$lib/components/drawers/AddShiftDrawer.svelte';
	import ShiftDetailDrawer from '$lib/components/drawers/ShiftDetailDrawer.svelte';
	import ScheduleDraftDrawer from '$lib/components/drawers/ScheduleDraftDrawer.svelte';

	const HOUR_H = 44; // 시간표 한 시간의 높이(px)

	let weekOffset = $state(0);
	let schedule = $state(/** @type {any} */ (null));
	let employees = $state(/** @type {any[]} */ ([]));
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
	onMount(async () => {
		try {
			employees = await getEmployees($session.storeId);
		} catch {
			employees = []; // 기본 근무 요일 표시만 빠질 뿐 근무표는 그대로 쓴다
		}
	});

	/** 그 날짜가 기본 근무 요일인 직원(점주 티켓은 요일을 안 정하므로 자연히 빠진다) */
	function defaultsOn(iso) {
		const key = dayKeyOf(iso);
		return employees.filter((e) => e.availableDays?.includes(key));
	}
	/** 그 날이 법정공휴일이면 그 이름(토/일은 제외) */
	const holidayOf = (iso) => holidayNameOf(schedule?.days.find((d) => d.date === iso));

	/** 그 날 이미 근무가 잡힌 직원 ticketId 집합 */
	function scheduledOn(iso) {
		const ids = new Set();
		for (const w of schedule?.days.find((d) => d.date === iso)?.works || []) for (const wr of w.workers) ids.add(wr.ticketId);
		return ids;
	}

	/** 근무 하나의 시작/끝을 "그날 0시부터의 시간"으로 - 자정을 넘기는 근무는 그날 24시에서 자른다 */
	function span(work) {
		const s = hh(toHM(work.startTime));
		const e = work.endTime.slice(0, 10) === work.startTime.slice(0, 10) ? hh(toHM(work.endTime)) : 24;
		return { s, e: Math.max(e, s + 0.5) };
	}

	// 근무가 있는 시간대가 다 보이도록 범위를 잡는다(기본 9~22시, 벗어나는 근무가 있으면 넓힌다)
	const range = $derived.by(() => {
		let lo = 9;
		let hi = 22;
		for (const d of schedule?.days ?? []) {
			for (const w of d.works) {
				const { s, e } = span(w);
				lo = Math.min(lo, Math.floor(s));
				hi = Math.max(hi, Math.ceil(e));
			}
		}
		return { lo, hi };
	});
	const hours = $derived(Array.from({ length: range.hi - range.lo + 1 }, (_, i) => range.lo + i));
	const bodyH = $derived((range.hi - range.lo) * HOUR_H);

	/** 하루의 근무를 겹치는 것끼리 묶어 나란히 배치한다(좌우 분할) */
	function layout(iso) {
		const works = (schedule?.days.find((d) => d.date === iso)?.works || [])
			.map((w) => ({ w, ...span(w) }))
			.sort((a, b) => a.s - b.s || a.e - b.e);
		const out = [];
		let cluster = [];
		let clusterEnd = -1;
		const flush = () => {
			const laneEnds = [];
			for (const it of cluster) {
				let lane = laneEnds.findIndex((end) => end <= it.s);
				if (lane < 0) lane = laneEnds.length;
				laneEnds[lane] = it.e;
				it.lane = lane;
			}
			for (const it of cluster) out.push({ ...it, lanes: laneEnds.length });
			cluster = [];
		};
		for (const it of works) {
			if (cluster.length && it.s >= clusterEnd) flush();
			cluster.push(it);
			clusterEnd = cluster.length === 1 ? it.e : Math.max(clusterEnd, it.e);
		}
		if (cluster.length) flush();
		return out;
	}

	function openDetail(workId) {
		openDrawer(ShiftDetailDrawer, { workId, onDone: load });
	}
	function openAdd(iso, startHour) {
		const defaultStart = startHour == null ? undefined : `${String(startHour).padStart(2, '0')}:00`;
		openDrawer(AddShiftDrawer, { defaultDate: iso, defaultStart, onDone: load });
	}
	/** 시간표의 빈 칸을 누르면 그 시각으로 근무 넣기가 열린다 */
	function onColumnClick(e, iso) {
		if (e.target !== e.currentTarget) return;
		const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
		openAdd(iso, Math.min(23, range.lo + Math.floor(y / HOUR_H)));
	}
	function removeWork(e, work) {
		e.stopPropagation();
		confirmBox('이 근무를 뺄까요?', '시작 전 근무만 뺄 수 있어요.', '빼기', async () => {
			try {
				await deleteWork($session.storeId, work.workId);
				showToast('뺐어요');
				load();
			} catch (err) {
				showToast(err?.message || '삭제에 실패했어요');
			}
		}, true);
	}
	const canRemove = (work) => new Date(work.startTime) > new Date();
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
		<button class="btn o" onclick={() => openDrawer(ScheduleDraftDrawer, { onDone: load })}>다음 주 초안 만들기</button>
	</div>
</div>

{#if loading && !schedule}
	<div class="empty">불러오는 중…</div>
{:else if error}
	<div class="empty">{error}</div>
{:else}
	<div class="tt" style="--hh:{HOUR_H}px">
		<div class="tt-head">
			<div></div>
			{#each ws as w (w.iso)}
				{@const done = scheduledOn(w.iso)}
				{@const hol = holidayOf(w.iso)}
				<div class="dh {w.iso === today ? 'today' : ''}">
					<span><b>{w.n}</b> <small>{w.d}{w.iso === today ? ' · 오늘' : ''}</small></span>
					<button class="plus" aria-label="{w.m}월 {w.n}일 근무 넣기" onclick={() => openAdd(w.iso)}>+</button>
					{#if hol}<div class="holn">{hol}</div>{/if}
						{#if defaultsOn(w.iso).length}
						<div class="dfl" title="기본 근무 요일인 직원 · 진하게 표시된 사람은 이미 근무가 잡혔어요">
							{#each defaultsOn(w.iso) as e (e.ticketId)}<i class={done.has(e.ticketId) ? 'on' : ''}>{e.alias}</i>{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<div class="tt-body">
			<div class="axis" style="height:{bodyH}px">
				{#each hours as h (h)}
					<span style="top:{(h - range.lo) * HOUR_H}px">{h}</span>
				{/each}
			</div>
			{#each ws as w (w.iso)}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div class="col {w.iso === today ? 'today' : ''} {holidayOf(w.iso) ? 'hol' : ''}" style="height:{bodyH}px" onclick={(e) => onColumnClick(e, w.iso)}>
					{#each layout(w.iso) as it (it.w.workId)}
						{@const work = it.w}
						<div
							class="tb {work.timeType === 'CLOSE' ? 'close' : ''}"
							role="button"
							tabindex="0"
							style="top:{(it.s - range.lo) * HOUR_H}px;height:{(it.e - it.s) * HOUR_H - 2}px;left:calc({(it.lane / it.lanes) * 100}% + 2px);width:calc({100 / it.lanes}% - 4px)"
							onclick={() => openDetail(work.workId)}
							onkeydown={(e) => e.key === 'Enter' && openDetail(work.workId)}
						>
							<div class="tm">{toHM(work.startTime)}–{toHM(work.endTime)}</div>
							<div class="nm">{TIME_TYPE[work.timeType] ?? '보통'}</div>
							<div class="rs">{work.workers.map((wr) => wr.alias).join(', ') || '아직 없음'}</div>
							{#if canRemove(work)}
								<button class="x" aria-label="근무 빼기" onclick={(e) => removeWork(e, work)}>×</button>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
	<p class="tiny muted" style="margin-top:16px">
		빨간 날짜는 법정공휴일이라 그날 근무는 휴일수당 대상이에요. 날짜 아래 이름은 그 요일이 기본 근무 요일인 직원이에요(진한 이름은 이미 근무가 잡힌 사람). 날짜 옆 +나 시간표의 빈 칸을 누르면 근무를 넣고, 근무 칸의 ×로 바로 뺄 수 있어요(시작 전 근무만). 근무를 누르면 참여자를 바꿀 수 있어요.
	</p>
{/if}
