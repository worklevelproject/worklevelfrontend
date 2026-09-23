<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getEmployees } from '$lib/api/store.js';
	import { getTemplates } from '$lib/api/timeTemplate.js';
	import { createWorks } from '$lib/api/work.js';
	import { getHolidays } from '$lib/api/holiday.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { todayISO, dayKeyOf, addDays, mondayOf, weekOf } from '$lib/utils/date.js';

	/** 점주 흐름(피드백): 요일 고르고 → 시간 넣고 → 누가 일하는지 고르면 끝. 요일은 여러 개 고를 수 있고,
	 * "N주 반복"을 고르면 같은 요일·시간 근무를 그 주 수만큼 한 번에 만든다(백엔드에 반복 근무 개념이
	 * 없어 미리 여러 건을 만드는 방식 - KNOWN_GAPS.md 참고).
	 * 시간 칸 위의 오픈/오후/마감 버튼은 설정 > 운영 시간대 값으로 시간을 채우는 바로가기이고, 근무의
	 * timeType도 그걸로 정해진다(시간을 직접 고치면 NORMAL).
	 * @type {{onDone?: () => void, defaultDate?: string, defaultStart?: string, weekMonday?: string}} */
	let { onDone, defaultDate, defaultStart, weekMonday } = $props();

	const FALLBACK = { OPEN: ['09:00', '15:00'], AFTERNOON: ['13:00', '18:00'], CLOSE: ['17:00', '22:00'] };
	const PRESET_LABEL = { OPEN: '오픈', AFTERNOON: '오후', CLOSE: '마감' };
	const REPEAT = [
		[1, '이번 주만'],
		[4, '4주 반복'],
		[8, '8주 반복'],
		[12, '12주 반복']
	];

	const today = todayISO();
	const monday = weekMonday || mondayOf(defaultDate || today);
	const week = weekOf(monday);

	let days = $state(/** @type {string[]} */ (defaultDate ? [defaultDate] : week.some((w) => w.iso === today) ? [today] : []));
	let weeks = $state(1);
	let employees = $state(/** @type {any[]} */ ([]));
	let selected = $state(/** @type {number[]} */ ([]));
	/** 고른 시간대 바로가기(시간을 직접 고치면 NORMAL) */
	let timeType = $state(/** @type {'OPEN'|'AFTERNOON'|'CLOSE'|'NORMAL'} */ ('NORMAL'));
	let start = $state(defaultStart || '09:00');
	let end = $state('');
	/** @type {Record<string, [string, string]>} */
	let presets = $state({ ...FALLBACK });
	let saving = $state(false);
	let err = $state('');
	/** 이번 주 날짜별 휴일 이름('주말' 제외) */
	let holidays = $state(/** @type {Record<string, string>} */ ({}));

	onMount(async () => {
		const [emp, tpl, hol] = await Promise.allSettled([
			getEmployees($session.storeId),
			getTemplates($session.storeId),
			getHolidays(week[0].iso, week[6].iso)
		]);
		// 휴일 안내는 참고용이라 못 읽어도 근무 넣기는 그대로 된다
		if (hol.status === 'fulfilled') {
			holidays = Object.fromEntries(
				hol.value.filter((h) => h.isHoliday && h.holidayName && h.holidayName !== '주말').map((h) => [h.date, h.holidayName])
			);
		}
		if (emp.status === 'fulfilled') employees = emp.value;
		else err = emp.reason?.message || '직원 목록을 불러오지 못했어요';
		if (tpl.status === 'fulfilled') {
			for (const t of tpl.value) {
				if (t.timeType in presets) presets[t.timeType] = [t.startTime.slice(0, 5), t.endTime.slice(0, 5)];
			}
		}
		// 시간표의 빈 칸을 눌러 들어오면 그 시각부터 두 시간짜리로 채워 두고, 아니면 오픈 시간대로 시작한다
		if (defaultStart) end = `${String(Math.min(23, Number(defaultStart.slice(0, 2)) + 2)).padStart(2, '0')}:00`;
		else usePreset('OPEN');
	});

	function usePreset(t) {
		timeType = t;
		[start, end] = presets[t];
	}
	/** 시간을 직접 고치면 바로가기 선택은 풀고 NORMAL(직접 입력)로 둔다 */
	function onTimeInput() {
		if (timeType !== 'NORMAL' && (start !== presets[timeType][0] || end !== presets[timeType][1])) timeType = 'NORMAL';
	}

	function toggleDay(iso) {
		days = days.includes(iso) ? days.filter((x) => x !== iso) : [...days, iso].sort();
	}
	function toggle(id) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}

	/** 고른 요일 중 하나라도 기본 근무 요일인 직원(앞에 올려 고르기 쉽게 한다 - 자동 체크는 안 함) */
	const isDefault = (p) => days.some((iso) => p.availableDays?.includes(dayKeyOf(iso)));
	const sortedEmployees = $derived([...employees].sort((a, b) => Number(isDefault(b)) - Number(isDefault(a))));
	const holidayNames = $derived(days.filter((iso) => holidays[iso]).map((iso) => holidays[iso]));

	async function submit() {
		if (!days.length) return (err = '요일을 하나 이상 골라 주세요');
		if (!start || !end) return (err = '시작·종료 시간을 입력해 주세요');
		if (!selected.length) return (err = '직원을 한 명 이상 골라 주세요');
		const now = new Date();
		const requests = [];
		for (let w = 0; w < weeks; w++) {
			for (const iso of days) {
				const date = addDays(iso, w * 7);
				// 종료가 시작보다 이르거나 같으면 자정을 넘기는 근무로 보고 종료를 다음 날로 넘긴다
				const endDate = end <= start ? addDays(date, 1) : date;
				const startTime = `${date}T${start}:00`;
				if (new Date(startTime) <= now) continue; // 이미 지난 시각은 백엔드가 막으므로 건너뛴다
				requests.push({ timeType, startTime, endTime: `${endDate}T${end}:00`, participantTicketIds: selected });
			}
		}
		if (!requests.length) return (err = '이미 지난 시간이에요 · 시간이나 요일을 바꿔 주세요');
		saving = true;
		err = '';
		try {
			await createWorks($session.storeId, requests);
			showToast(`근무 ${requests.length}건을 넣었어요 · 직원에게 바로 확정됐어요`);
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '만들기에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title={`${week[0].m}월 ${week[0].n}일 주 근무 넣기`}>
	{#snippet children()}
		<div class="f">
			<label>요일</label>
			<div class="opts">
				{#each week as w (w.iso)}
					<button class={days.includes(w.iso) ? 'on' : ''} disabled={w.iso < today} onclick={() => toggleDay(w.iso)} title={holidays[w.iso] || ''}>
						{w.d} {w.n}{holidays[w.iso] ? ' · 휴일' : ''}
					</button>
				{/each}
			</div>
			{#if holidayNames.length}
				<p class="tiny" style="color:var(--bad)">{holidayNames.join(', ')} · 휴일 근무로 잡혀 매장 설정에 따라 휴일수당이 붙어요</p>
			{/if}
		</div>
		<div class="f">
			<label>시간</label>
			<div class="opts" style="margin-bottom:6px">
				{#each Object.entries(PRESET_LABEL) as [k, l] (k)}
					<button class={timeType === k ? 'on' : ''} onclick={() => usePreset(k)}>{l} {presets[k][0]}–{presets[k][1]}</button>
				{/each}
			</div>
			<div class="inline">
				<input type="time" bind:value={start} oninput={onTimeInput} aria-label="시작 시간" />
				<input type="time" bind:value={end} oninput={onTimeInput} aria-label="종료 시간" />
			</div>
			{#if start && end && end <= start}
				<p class="tiny muted">종료가 시작보다 이르면 다음 날 종료로 넣어요</p>
			{/if}
		</div>
		<div class="f">
			<label>누가</label>
			<div class="rank">
				{#each sortedEmployees as p (p.ticketId)}
					<button class={selected.includes(p.ticketId) ? 'on' : ''} onclick={() => toggle(p.ticketId)}>
						<span class="avatar">{p.alias?.slice(1)}</span>
						<span class="main"><span class="t">{p.alias}</span>{#if isDefault(p)}<span class="s">기본 근무 요일</span>{/if}</span>
					</button>
				{:else}
					<div class="empty">직원이 없어요</div>
				{/each}
			</div>
		</div>
		<div class="f">
			<label>반복</label>
			<div class="opts">
				{#each REPEAT as [n, l] (n)}
					<button class={weeks === n ? 'on' : ''} onclick={() => (weeks = n)}>{l}</button>
				{/each}
			</div>
			{#if weeks > 1}
				<p class="tiny muted">같은 요일·시간 근무를 {weeks}주 치 한 번에 넣어요 (최대 {days.length * weeks}건)</p>
			{/if}
		</div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>근무 넣기</button>
	{/snippet}
</DrawerShell>
