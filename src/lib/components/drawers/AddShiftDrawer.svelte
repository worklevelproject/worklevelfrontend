<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getEmployees } from '$lib/api/store.js';
	import { createWorks, createWorkSeries } from '$lib/api/work.js';
	import { getHolidays } from '$lib/api/holiday.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { TIME_TYPE } from '$lib/utils/labels.js';
	import { DEFAULT_STORE_HOURS, loadStoreHours, hoursOn, timeTypeFor } from '$lib/utils/storeHours.js';
	import { todayISO, dayKeyOf, addDays, mondayOf, weekOf } from '$lib/utils/date.js';

	/** 점주 흐름(피드백): 요일 고르고 → 시간 넣고 → 누가 일하는지 고르면 끝. 요일은 여러 개 고를 수 있다.
	 * "매주 반복"을 켜면 반복 근무 규칙(POST .../owner/work-series)으로 만들어 서버가 앞으로도 계속 근무를 채우고,
	 * 나중에 규칙 단위로 고치거나 끝낼 수 있다(근무 상세). 끄면 이번 주 고른 날짜에만 근무를 만든다.
	 * 시간대(오픈/오후/마감)는 고르지 않는다 - 매장 운영 시간대(평일/주말)와 근무 시각을 비교해 날짜마다 정한다.
	 * @type {{onDone?: () => void, defaultDate?: string, defaultStart?: string, weekMonday?: string}} */
	let { onDone, defaultDate, defaultStart, weekMonday } = $props();

	const today = todayISO();
	const monday = weekMonday || mondayOf(defaultDate || today);
	const week = weekOf(monday);

	let days = $state(/** @type {string[]} */ (defaultDate ? [defaultDate] : week.some((w) => w.iso === today) ? [today] : []));
	let employees = $state(/** @type {any[]} */ ([]));
	let selected = $state(/** @type {number[]} */ ([]));
	let hours = $state({ ...DEFAULT_STORE_HOURS, configured: true });
	let start = $state(defaultStart || '');
	let end = $state(defaultStart ? `${String(Math.min(23, Number(defaultStart.slice(0, 2)) + 2)).padStart(2, '0')}:00` : '');
	let repeat = $state(false);
	/** 반복 종료일(비우면 무기한) */
	let endDate = $state('');
	let saving = $state(false);
	let err = $state('');
	/** 이번 주 날짜별 휴일 이름('주말' 제외) */
	let holidays = $state(/** @type {Record<string, string>} */ ({}));

	onMount(async () => {
		const [emp, hol, h] = await Promise.allSettled([
			getEmployees($session.storeId),
			getHolidays(week[0].iso, week[6].iso),
			loadStoreHours($session.storeId)
		]);
		// 휴일 안내는 참고용이라 못 읽어도 근무 넣기는 그대로 된다
		if (hol.status === 'fulfilled') {
			holidays = Object.fromEntries(
				hol.value.filter((x) => x.isHoliday && x.holidayName && x.holidayName !== '주말').map((x) => [x.date, x.holidayName])
			);
		}
		if (emp.status === 'fulfilled') employees = emp.value;
		else err = emp.reason?.message || '직원 목록을 불러오지 못했어요';
		if (h.status === 'fulfilled') hours = h.value;
		// 시간표 빈 칸으로 들어온 게 아니면 고른 날의 여는 시각부터 닫는 시각까지로 채워 둔다
		if (!defaultStart) {
			const d = hoursOn(hours, days[0] || monday, !!holidays[days[0]]);
			start = d.open;
			end = d.close;
		}
	});

	/** 그 날짜에 이 시간으로 넣으면 어떤 근무가 되는지(주말·공휴일은 주말 운영 시간 기준) */
	const typeOn = (iso) => timeTypeFor(hoursOn(hours, iso, !!holidays[iso]), start, end);

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

	/** 이번 주 고른 날짜에만 근무를 만든다 */
	async function createOnce() {
		const now = new Date();
		const requests = [];
		for (const date of days) {
			// 종료가 시작보다 이르거나 같으면 자정을 넘기는 근무로 보고 종료를 다음 날로 넘긴다
			const endDay = end <= start ? addDays(date, 1) : date;
			const startTime = `${date}T${start}:00`;
			if (new Date(startTime) <= now) continue; // 이미 지난 시각은 백엔드가 막으므로 건너뛴다
			requests.push({ timeType: typeOn(date), startTime, endTime: `${endDay}T${end}:00`, participantTicketIds: selected });
		}
		if (!requests.length) throw new Error('이미 지난 시간이에요 · 시간이나 요일을 바꿔 주세요');
		await createWorks($session.storeId, requests);
		return `근무 ${requests.length}건을 넣었어요`;
	}

	/** 매주 반복 규칙을 만든다. 반복 규칙은 마감 여부를 하나만 가지므로, 평일/주말 운영 시간 차이로 마감 여부가
	 * 갈리는 요일 조합이면 근무 종류별로 규칙을 나눠 만든다. */
	async function createSeries() {
		if (endDate && endDate < days[0]) throw new Error('반복 종료일이 시작보다 빨라요');
		/** @type {Record<string, string[]>} */
		const groups = {};
		for (const iso of days) (groups[typeOn(iso)] ||= []).push(iso);
		for (const [timeType, isos] of Object.entries(groups)) {
			await createWorkSeries($session.storeId, {
				daysOfWeek: isos.map(dayKeyOf),
				startTime: start,
				endTime: end,
				timeType,
				startDate: isos[0] < today ? today : isos[0],
				endDate: endDate || undefined,
				participantTicketIds: selected
			});
		}
		return '매주 반복 근무를 만들었어요 · 앞으로 4주 치가 먼저 잡혀요';
	}

	async function submit() {
		if (!days.length) return (err = '요일을 하나 이상 골라 주세요');
		if (!start || !end) return (err = '시작·종료 시간을 입력해 주세요');
		if (!selected.length) return (err = '직원을 한 명 이상 골라 주세요');
		saving = true;
		err = '';
		try {
			showToast(`${await (repeat ? createSeries() : createOnce())} · 직원에게 바로 확정됐어요`);
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
			<div class="inline">
				<input type="time" bind:value={start} aria-label="시작 시간" />
				<input type="time" bind:value={end} aria-label="종료 시간" />
			</div>
			<p class="tiny muted">
				운영 시간 평일 {hours.weekday.open}–{hours.weekday.close} · 주말 {hours.weekend.open}–{hours.weekend.close}
				{#if !hours.configured}(아직 안 정해 기본값이에요 · <a href="/owner/settings?sec=store" onclick={closeDrawer}>설정</a>){/if}
				{#if days.length && start && end}
					· {[...new Set(days.map((iso) => TIME_TYPE[typeOn(iso)]))].join('/')} 근무로 넣어요
				{/if}
			</p>
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
				<button class={!repeat ? 'on' : ''} onclick={() => (repeat = false)}>이번 주만</button>
				<button class={repeat ? 'on' : ''} onclick={() => (repeat = true)}>매주 반복</button>
			</div>
			{#if repeat}
				<div class="inline" style="margin-top:6px;align-items:center">
					<input type="date" bind:value={endDate} min={days[0]} aria-label="반복 종료일" />
					<span class="tiny muted">까지 (비우면 계속)</span>
				</div>
				<p class="tiny muted">고른 요일마다 같은 시간으로 계속 잡혀요. 앞으로 4주 치를 먼저 만들고 이어서 채워요. 근무를 누르면 반복 근무 전체를 한 번에 고치거나 끝낼 수 있고, 직원이 퇴사하면 남은 근무는 자동으로 빠져요.</p>
			{/if}
		</div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>근무 넣기</button>
	{/snippet}
</DrawerShell>
