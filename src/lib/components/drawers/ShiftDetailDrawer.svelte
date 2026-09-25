<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getWork, updateWork, deleteWork, updateWorkSeries, deleteWorkSeries } from '$lib/api/work.js';
	import { getEmployees } from '$lib/api/store.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';
	import { toHM, fmt, addDays } from '$lib/utils/date.js';
	import { shiftLabel } from '$lib/utils/labels.js';
	import { loadStoreHours, hoursOn, timeTypeFor } from '$lib/utils/storeHours.js';

	/** 근무 상세. 반복 근무(seriesId 있음)면 "이 근무만 / 이 날부터 반복 근무 전체" 중 고른 범위로 참여자·시간을
	 * 바꾸거나 뺀다 - 반복 전체는 반복 근무 규칙 API(.../owner/work-series)가 시작 전 근무 전부에 반영한다.
	 * @type {{workId: number, onDone?: () => void}} */
	let { workId, onDone } = $props();

	let work = $state(/** @type {any} */ (null));
	let employees = $state(/** @type {any[]} */ ([]));
	let editing = $state(false);
	let selected = $state(/** @type {number[]} */ ([]));
	let saving = $state(false);
	let err = $state('');
	/** 적용 범위: 이 근무만(false) / 반복 근무 전체(true) */
	let wholeSeries = $state(false);
	let editingTime = $state(false);
	let newStart = $state('');
	let newEnd = $state('');
	let hours = /** @type {any} */ (null);

	async function load() {
		const [w, emp, h] = await Promise.all([getWork($session.storeId, workId), getEmployees($session.storeId), loadStoreHours($session.storeId)]);
		work = w;
		employees = emp;
		hours = h;
		selected = (w.workAssignments || w.workers || []).map((r) => r.ticketId);
		newStart = toHM(w.startTime);
		newEnd = toHM(w.endTime);
	}
	onMount(load);

	const isPast = $derived(work && new Date(work.startTime) <= new Date());
	const isSeries = $derived(!!work?.seriesId);
	const useSeries = $derived(isSeries && wholeSeries);

	function toggle(id) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}

	/** 수정 요청 하나를 범위에 맞게 보낸다 */
	async function apply(body) {
		if (useSeries) await updateWorkSeries($session.storeId, work.seriesId, body);
		else work = await updateWork($session.storeId, workId, body);
	}

	async function saveParticipants() {
		saving = true;
		err = '';
		try {
			await apply({ participantTicketIds: selected });
			editing = false;
			showToast(useSeries ? '반복 근무 전체의 대상을 바꿨어요' : '대상을 바꿨어요');
			if (useSeries) await load();
			onDone?.();
		} catch (e) {
			err = e?.message || '수정에 실패했어요';
		} finally {
			saving = false;
		}
	}

	async function saveTime() {
		if (!newStart || !newEnd) return (err = '시작·종료 시간을 입력해 주세요');
		saving = true;
		err = '';
		try {
			const date = work.startTime.slice(0, 10);
			// 마감 여부도 운영 시간대 기준으로 다시 정한다(서버는 timeType이 CLOSE인지만 본다)
			const timeType = timeTypeFor(hoursOn(hours, date), newStart, newEnd);
			if (useSeries) {
				await updateWorkSeries($session.storeId, work.seriesId, { startTime: newStart, endTime: newEnd, timeType });
			} else {
				const endDay = newEnd <= newStart ? addDays(date, 1) : date;
				work = await updateWork($session.storeId, workId, {
					startTime: `${date}T${newStart}:00`,
					endTime: `${endDay}T${newEnd}:00`,
					timeType
				});
			}
			editingTime = false;
			showToast(useSeries ? '반복 근무 전체의 시간을 바꿨어요 · 직원에게 알렸어요' : '시간을 바꿨어요 · 직원에게 알렸어요');
			if (useSeries) await load();
			onDone?.();
		} catch (e) {
			err = e?.message || '시간을 바꾸지 못했어요';
		} finally {
			saving = false;
		}
	}

	function onDelete() {
		const date = work.startTime.slice(0, 10);
		confirmBox(
			useSeries ? `${fmt(date)}부터 반복 근무를 끝낼까요?` : '이 근무를 뺄까요?',
			useSeries ? '이 날부터 잡혀 있던 반복 근무가 모두 빠지고, 이후로 더 만들어지지 않아요.' : '시작 전 근무만 뺄 수 있어요.',
			'빼기',
			async () => {
				try {
					if (useSeries) await deleteWorkSeries($session.storeId, work.seriesId, date);
					else await deleteWork($session.storeId, workId);
					showToast('뺐어요');
					closeDrawer();
					onDone?.();
				} catch (e) {
					showToast(e?.message || '삭제에 실패했어요');
				}
			},
			true
		);
	}
</script>

<DrawerShell title={work ? `${shiftLabel(work)} 근무` : '근무'}>
	{#snippet children()}
		{#if !work}
			<div class="empty">불러오는 중…</div>
		{:else}
			<div class="kv" style="margin-top:0">
				<div><b class="num">{toHM(work.startTime)}–{toHM(work.endTime)}</b><span>{fmt(work.startTime.slice(0, 10))}</span></div>
				<div><b>{work.closing ? '마감' : '일반'}</b><span>{work.closing ? '인수인계 대상' : '근무 종류'}</span></div>
			</div>

			{#if work.minStaff}
				<p class="tiny muted">
					최소 인원 {work.minStaff}명 ·
					{work.staffingStatus === 'SUFFICIENT' ? '충족' : work.staffingStatus === 'INSUFFICIENT' ? '부족' : '기준 없음'}
				</p>
			{/if}

			{#if isSeries && !isPast}
				<div class="f" style="margin-top:12px">
					<label>고치거나 뺄 범위 · 매주 반복 근무예요</label>
					<div class="opts">
						<button class={!wholeSeries ? 'on' : ''} onclick={() => (wholeSeries = false)}>이 근무만</button>
						<button class={wholeSeries ? 'on' : ''} onclick={() => (wholeSeries = true)}>반복 근무 전체</button>
					</div>
					{#if wholeSeries}<p class="tiny muted">아직 시작 전인 이 반복 근무 전부에 반영돼요. 빼기는 이 날부터 끝내요.</p>{/if}
				</div>
			{/if}

			{#if !isPast}
				<div class="sec">
					<div class="sec-h"><h3>시간</h3><button class="link b" onclick={() => (editingTime = !editingTime)}>{editingTime ? '취소' : '바꾸기'}</button></div>
					{#if editingTime}
						<div class="f">
							<div class="inline">
								<input type="time" bind:value={newStart} aria-label="시작 시간" />
								<input type="time" bind:value={newEnd} aria-label="종료 시간" />
							</div>
							<p class="tiny muted">바꾸면 배정된 직원에게 근무 시간 변경 알림이 가요.</p>
						</div>
						{#if err}<p class="f err">{err}</p>{/if}
						<button class="btn p w" disabled={saving} onclick={saveTime}>시간 저장</button>
					{/if}
				</div>
			{/if}

			<div class="sec">
				<div class="sec-h">
					<h3>참여자</h3>
					{#if !isPast}<button class="link b" onclick={() => (editing = !editing)}>{editing ? '취소' : '바꾸기'}</button>{/if}
				</div>
				{#if !editing}
					<div class="rows">
						{#each work.workAssignments || work.workers || [] as r (r.workAssignmentId ?? r.ticketId)}
							<div class="row">
								<div class="avatar">{r.alias?.slice(1)}</div>
								<div class="main"><div class="t">{r.alias}</div></div>
							</div>
						{:else}
							<div class="empty">참여자가 없어요</div>
						{/each}
					</div>
				{:else}
					<div class="rank">
						{#each employees as p (p.ticketId)}
							<button class={selected.includes(p.ticketId) ? 'on' : ''} onclick={() => toggle(p.ticketId)}>
								<span class="avatar">{p.alias?.slice(1)}</span>
								<span class="main"><span class="t">{p.alias}</span></span>
							</button>
						{/each}
					</div>
					{#if err}<p class="f err">{err}</p>{/if}
					<button class="btn p w" style="margin-top:12px" disabled={saving} onclick={saveParticipants}>저장</button>
				{/if}
			</div>
		{/if}
	{/snippet}
	{#snippet foot()}
		{#if work && !isPast}
			<button class="btn d" onclick={onDelete}>{useSeries ? '반복 끝내기' : '근무 빼기'}</button>
		{/if}
		<button class="btn p" onclick={closeDrawer}>닫기</button>
	{/snippet}
</DrawerShell>
