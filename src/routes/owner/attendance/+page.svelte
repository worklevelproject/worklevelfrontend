<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getAttendance } from '$lib/api/dashboard.js';
	import { getAttendanceCorrections, confirmAttendanceCorrection, rejectAttendanceCorrection } from '$lib/api/work.js';
	import { todayISO, toHM, fmtS, hh } from '$lib/utils/date.js';
	import { ATTENDANCE_STATUS, attendancePillClass } from '$lib/utils/labels.js';
	import { showToast } from '$lib/stores/toast.js';

	let tab = $state('today');
	let items = $state(/** @type {any[]} */ ([]));
	let corrections = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	const T = todayISO();

	async function load() {
		loading = true;
		try {
			const [att, corr] = await Promise.all([
				getAttendance($session.storeId, T),
				getAttendanceCorrections($session.storeId)
			]);
			items = att;
			corrections = corr;
		} finally {
			loading = false;
		}
	}
	onMount(load);

	const todays = $derived(items.filter((a) => a.workDate === T));
	const isLate = (a) => a.checkIn && a.checkInTime && hh(toHM(a.checkInTime)) - hh(toHM(a.workStartTime)) > 10 / 60;
	const pendingCorr = $derived(corrections.filter((c) => !c.resolved));

	async function confirm(id) {
		try {
			await confirmAttendanceCorrection($session.storeId, id);
			showToast('고쳐줬어요');
			load();
		} catch (e) {
			showToast(e?.message || '실패했어요');
		}
	}
	async function reject(id) {
		try {
			await rejectAttendanceCorrection($session.storeId, id);
			showToast('그대로 두었어요');
			load();
		} catch (e) {
			showToast(e?.message || '실패했어요');
		}
	}
</script>

<svelte:head><title>출퇴근 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">출근 허용 오차 ±10분 (백엔드 고정값)</div>
		<h1>출퇴근</h1>
	</div>
	<div class="acts">
		<div class="seg lg">
			<button class={tab === 'today' ? 'on' : ''} onclick={() => (tab = 'today')}>오늘</button>
			<button class={tab === 'week' ? 'on' : ''} onclick={() => (tab = 'week')}>이번 주 기록</button>
			<button class={tab === 'corr' ? 'on' : ''} onclick={() => (tab = 'corr')}>정정 요청 {pendingCorr.length}</button>
		</div>
	</div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else if tab === 'today'}
	<div class="stat">
		<button><b class="num">{todays.length}</b><span>오늘 나오는 직원</span></button>
		<button class="in"><b class="num">{todays.filter((a) => a.status === 'WORKING').length}</b><span>일하는 중</span></button>
		<button><b class="num">{todays.filter((a) => a.status === 'LEFT').length}</b><span>퇴근함</span></button>
		<button class="late"><b class="num">{todays.filter(isLate).length}</b><span>지각</span></button>
		<button class="abs"><b class="num">{todays.filter((a) => a.status === 'NO_SHOW').length}</b><span>안 옴</span></button>
	</div>
	<table class="tbl">
		<thead><tr><th>직원</th><th>예정</th><th>출근</th><th>퇴근</th><th>일한 시간</th><th>상태</th></tr></thead>
		<tbody>
			{#each todays as a (a.workRequestId)}
				<tr>
					<td><div class="who"><div class="avatar">{a.alias?.slice(1)}</div><span class="t">{a.alias}</span></div></td>
					<td class="num">{toHM(a.workStartTime)}–{toHM(a.workEndTime)}</td>
					<td class="num">{a.checkIn ? toHM(a.checkInTime) : '—'}</td>
					<td class="num">{a.checkOut ? toHM(a.checkOutTime) : '—'}</td>
					<td class="num">{a.checkOut ? (a.workMinutes / 60).toFixed(1) + 'h' : '—'}</td>
					<td><span class="pill {attendancePillClass(a.status)}">{ATTENDANCE_STATUS[a.status] || a.status}</span></td>
				</tr>
			{:else}
				<tr><td colspan="6"><div class="empty">오늘 근무가 없어요</div></td></tr>
			{/each}
		</tbody>
	</table>
{:else if tab === 'week'}
	<table class="tbl">
		<thead><tr><th>날짜</th><th>직원</th><th>예정</th><th>출근</th><th>퇴근</th><th>일한 시간</th><th>상태</th></tr></thead>
		<tbody>
			{#each items as a (a.workRequestId)}
				<tr>
					<td class="num">{fmtS(a.workDate)}</td>
					<td><div class="who"><div class="avatar" style="width:28px;height:28px;font-size:11px">{a.alias?.slice(1)}</div>{a.alias}</div></td>
					<td class="num">{toHM(a.workStartTime)}–{toHM(a.workEndTime)}</td>
					<td class="num">{a.checkIn ? toHM(a.checkInTime) : '—'}</td>
					<td class="num">{a.checkOut ? toHM(a.checkOutTime) : '—'}</td>
					<td class="num">{a.checkOut ? (a.workMinutes / 60).toFixed(1) + 'h' : '—'}</td>
					<td><span class="pill {attendancePillClass(a.status)}">{ATTENDANCE_STATUS[a.status] || a.status}</span></td>
				</tr>
			{:else}
				<tr><td colspan="7"><div class="empty">이번 주 기록이 없어요</div></td></tr>
			{/each}
		</tbody>
	</table>
{:else}
	<div class="rows" style="max-width:760px">
		{#each corrections as c (c.workRequestId)}
			<div class="row">
				<div class="avatar">{c.alias?.slice(1)}</div>
				<div class="main">
					<div class="t">{c.alias} · {fmtS(c.workStartTime.slice(0, 10))}</div>
					<div class="s">
						{c.checkInTime ? toHM(c.checkInTime) : '—'}–{c.checkOutTime ? toHM(c.checkOutTime) : '—'} →
						<b style="color:var(--carbon)">
							{c.proposedCheckInTime ? toHM(c.proposedCheckInTime) : (c.checkInTime ? toHM(c.checkInTime) : '—')}–{c.proposedCheckOutTime ? toHM(c.proposedCheckOutTime) : (c.checkOutTime ? toHM(c.checkOutTime) : '—')}
						</b>
						· {c.correctionReason || '사유 없음'}
					</div>
				</div>
				<div class="right">
					{#if !c.resolved}
						<button class="btn s sm" onclick={() => reject(c.workRequestId)}>그대로</button>
						<button class="btn p sm" onclick={() => confirm(c.workRequestId)}>고쳐주기</button>
					{:else}
						<span class="pill off">처리됨</span>
					{/if}
				</div>
			</div>
		{:else}
			<div class="empty">요청이 없어요</div>
		{/each}
	</div>
{/if}
