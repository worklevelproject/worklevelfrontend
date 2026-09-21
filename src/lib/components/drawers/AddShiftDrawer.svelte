<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getEmployees } from '$lib/api/store.js';
	import { getTemplates } from '$lib/api/timeTemplate.js';
	import { createWorks } from '$lib/api/work.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { fmt, todayISO, dayKeyOf, addDays } from '$lib/utils/date.js';

	/** 오픈/마감은 매장 시간대 템플릿 값으로 채우고, 직접 입력(NORMAL)은 시간을 자유롭게 정한다.
	 * 템플릿이 없거나 못 읽으면 FALLBACK 값을 쓴다. 시간칸은 세 종류 모두 직접 고칠 수 있다.
	 * @type {{onDone?: () => void, defaultDate?: string, defaultStart?: string}} */
	let { onDone, defaultDate, defaultStart } = $props();

	const FALLBACK = { OPEN: ['09:00', '15:00'], CLOSE: ['17:00', '22:00'], NORMAL: ['09:00', '18:00'] };
	const LABEL = { OPEN: '오픈', CLOSE: '마감', NORMAL: '직접 입력' };

	const date = defaultDate || todayISO();
	let employees = $state(/** @type {any[]} */ ([]));
	let selected = $state(/** @type {number[]} */ ([]));
	let timeType = $state('OPEN');
	/** @type {Record<string, [string, string]>} */
	let times = $state({ OPEN: [...FALLBACK.OPEN], CLOSE: [...FALLBACK.CLOSE], NORMAL: [...FALLBACK.NORMAL] });
	let saving = $state(false);
	let err = $state('');

	onMount(async () => {
		const [emp, tpl] = await Promise.allSettled([getEmployees($session.storeId), getTemplates($session.storeId)]);
		// 그 날이 기본 근무 요일인 직원을 앞으로 올려 고르기 쉽게 한다(자동으로 체크하진 않는다)
		if (emp.status === 'fulfilled') employees = [...emp.value].sort((a, b) => Number(isDefault(b)) - Number(isDefault(a)));
		else err = emp.reason?.message || '직원 목록을 불러오지 못했어요';
		if (tpl.status === 'fulfilled') {
			for (const t of tpl.value) {
				if (t.timeType in times) times[t.timeType] = [t.startTime.slice(0, 5), t.endTime.slice(0, 5)];
			}
		}
		// 시간표의 빈 칸을 눌러 들어오면 그 시각이 시작 시각으로 넘어온다
		if (defaultStart) {
			const [s, e] = times[timeType];
			const len = Math.max(1, Number(e.slice(0, 2)) - Number(s.slice(0, 2)));
			const endH = Math.min(24, Number(defaultStart.slice(0, 2)) + len);
			times[timeType] = [defaultStart, endH === 24 ? '23:59' : `${String(endH).padStart(2, '0')}:00`];
		}
	});

	const isDefault = (p) => !!p.availableDays?.includes(dayKeyOf(date));

	function toggle(id) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}

	async function submit() {
		if (!selected.length) return (err = '직원을 한 명 이상 골라 주세요');
		const [startTime, endTime] = times[timeType];
		if (!startTime || !endTime) return (err = '시작·종료 시간을 입력해 주세요');
		// 종료가 시작보다 이르거나 같으면 자정을 넘기는 근무로 보고 종료를 다음 날로 넘긴다
		const endDate = endTime <= startTime ? addDays(date, 1) : date;
		saving = true;
		err = '';
		try {
			await createWorks($session.storeId, [
				{
					timeType,
					startTime: `${date}T${startTime}:00`,
					endTime: `${endDate}T${endTime}:00`,
					participantTicketIds: selected
				}
			]);
			showToast('근무를 넣었어요 · 직원에게 바로 확정됐어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '만들기에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title={`${fmt(date)} 근무 넣기`}>
	{#snippet children()}
		<div class="f">
			<label>어떤 시간대</label>
			<div class="opts">
				{#each Object.entries(LABEL) as [k, l] (k)}
					<button class={timeType === k ? 'on' : ''} onclick={() => (timeType = k)}>{k === 'NORMAL' ? l : `${l} ${times[k][0]}–${times[k][1]}`}</button>
				{/each}
			</div>
		</div>
		<div class="f">
			<label>시간</label>
			<div class="inline">
				<input type="time" bind:value={times[timeType][0]} aria-label="시작 시간" />
				<input type="time" bind:value={times[timeType][1]} aria-label="종료 시간" />
			</div>
			{#if times[timeType][1] && times[timeType][0] && times[timeType][1] <= times[timeType][0]}
				<p class="tiny muted">종료가 시작보다 이르면 다음 날 종료로 넣어요</p>
			{/if}
		</div>
		<div class="f">
			<label>누가</label>
			<div class="rank">
				{#each employees as p (p.ticketId)}
					<button class={selected.includes(p.ticketId) ? 'on' : ''} onclick={() => toggle(p.ticketId)}>
						<span class="avatar">{p.alias?.slice(1)}</span>
						<span class="main"><span class="t">{p.alias}</span>{#if isDefault(p)}<span class="s">기본 근무 요일</span>{/if}</span>
					</button>
				{:else}
					<div class="empty">직원이 없어요</div>
				{/each}
			</div>
		</div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>근무 넣기</button>
	{/snippet}
</DrawerShell>
