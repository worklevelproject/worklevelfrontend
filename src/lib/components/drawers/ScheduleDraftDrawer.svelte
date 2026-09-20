<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getOwnerWeeklySchedule, createWorks } from '$lib/api/work.js';
	import { getTemplates } from '$lib/api/timeTemplate.js';
	import { getEmployeeStats } from '$lib/api/store.js';
	import { closeDrawer, openDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { mondayOf, addDays, todayISO, fmtS } from '$lib/utils/date.js';
	import { buildScheduleDraft, draftItemsToCreateWorksRequests } from '$lib/utils/scheduleDraft.js';
	import AddShiftDrawer from './AddShiftDrawer.svelte';

	/** @type {{onDone?: () => void}} */
	let { onDone } = $props();

	let loading = $state(true);
	let saving = $state(false);
	let err = $state('');
	let items = $state(/** @type {any[]} */ ([]));
	let gaps = $state(/** @type {any[]} */ ([]));
	let risks = $state(/** @type {any[]} */ ([]));
	let employees = $state(/** @type {any[]} */ ([]));

	const nextMonday = addDays(mondayOf(todayISO()), 7);

	onMount(async () => {
		try {
			const storeId = $session.storeId;
			const [currentWeekSchedule, timeTemplates, empStats] = await Promise.all([
				getOwnerWeeklySchedule(storeId, mondayOf(todayISO())),
				getTemplates(storeId),
				getEmployeeStats(storeId, true)
			]);
			employees = empStats.content;
			const draft = buildScheduleDraft({ nextMonday, currentWeekSchedule, timeTemplates, employeeStats: employees });
			items = draft.items;
			gaps = draft.gaps;
			risks = draft.risks;
		} catch (e) {
			err = e?.message || '초안을 만들지 못했어요';
		} finally {
			loading = false;
		}
	});

	function drop(i) {
		items = items.filter((_, idx) => idx !== i);
	}
	function swap(i, ticketId) {
		const p = employees.find((e) => e.ticketId === Number(ticketId));
		if (!p) return;
		items[i] = { ...items[i], ticketId: p.ticketId, alias: p.alias, reason: '수동으로 교체함' };
	}
	function fillGap(g) {
		openDrawer(AddShiftDrawer, { defaultDate: g.date, onDone });
	}

	async function confirm() {
		if (!items.length) return;
		saving = true;
		err = '';
		try {
			await createWorks($session.storeId, draftItemsToCreateWorksRequests(items));
			showToast(`${items.length}건을 근무표에 넣었어요 · 직원에게 바로 배정됐어요`);
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '반영에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title="다음 주 근무표 초안">
	{#snippet children()}
		{#if loading}
			<div class="empty">이번 주 근무를 보고 초안을 만드는 중…</div>
		{:else}
			<p class="tiny muted">
				이번 주 근무표를 뼈대로, 이번 초안 안 누적시간·정시출근율을 보고 배정해봤어요. 완성본이 아니라 초안이에요 - 확인하고 고친 뒤 반영해주세요.
			</p>
			{#if risks.length}
				<div class="f">
					<label>확인할 점</label>
					{#each risks as r (r.ticketId + r.type)}
						<div class="tiny" style="color:var(--bad)">{r.alias} · {r.detail}</div>
					{/each}
				</div>
			{/if}
			<div class="f">
				<label>배정 {items.length}건</label>
				{#each items as it, i (i)}
					<div class="row">
						<div class="main">
							<div class="t">{fmtS(it.date)} {it.startTime}–{it.endTime} · {it.label}</div>
							<div class="s">{it.reason}</div>
						</div>
						<select value={it.ticketId} onchange={(e) => swap(i, e.currentTarget.value)}>
							{#each employees as p (p.ticketId)}
								<option value={p.ticketId}>{p.alias}</option>
							{/each}
						</select>
						<button class="btn d sm" onclick={() => drop(i)}>빼기</button>
					</div>
				{:else}
					<div class="empty">배정할 근무가 없어요</div>
				{/each}
			</div>
			{#if gaps.length}
				<div class="f">
					<label>못 채운 자리 {gaps.length}건</label>
					{#each gaps as g, i (i)}
						<div class="row">
							<div class="main">
								<div class="t">{fmtS(g.date)} {g.startTime}–{g.endTime} · {g.label}</div>
								<div class="s">{g.reason}</div>
							</div>
							<button class="btn s sm" onclick={() => fillGap(g)}>직접 채우기</button>
						</div>
					{/each}
				</div>
			{/if}
			{#if err}<p class="f err">{err}</p>{/if}
		{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving || loading || !items.length} onclick={confirm}>{items.length}건 근무표에 반영</button>
	{/snippet}
</DrawerShell>
