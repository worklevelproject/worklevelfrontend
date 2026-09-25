<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getMyWorkAssignments, checkIn as apiCheckIn, checkOut as apiCheckOut, getWork } from '$lib/api/work.js';
	import { getMyAttendanceHistory } from '$lib/api/attendance.js';
	import { getResignationForEmployee } from '$lib/api/resignation.js';
	import { mock } from '$lib/stores/mock.js';
	import { todayISO, toHM, fmt, hh } from '$lib/utils/date.js';
	import { won } from '$lib/utils/format.js';
	import { showToast } from '$lib/stores/toast.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import HandOverDrawer from '$lib/components/drawers/HandOverDrawer.svelte';

	const T = todayISO();
	let mine = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	/** @type {Record<number, any>} 액션 응답으로만 알 수 있는 체크인 상태 */
	let att = $state(/** @type {Record<number, {checkIn:boolean, checkOut:boolean, checkInTime?:string, checkOutTime?:string}>} */ ({}));
	/** 오늘 근무별 마감 여부(closing) - 마감 인수인계 버튼 노출용 */
	let closings = $state(/** @type {Record<number, boolean>} */ ({}));
	let resignationPending = $state(false);

	async function load() {
		loading = true;
		try {
			const [assigned, todayHistory] = await Promise.all([
				getMyWorkAssignments($session.storeId),
				getMyAttendanceHistory($session.storeId, { fromDate: T, toDate: T })
			]);
			mine = assigned.content;
			// 새로고침해도 출근/퇴근 상태가 "출근 전"으로 리셋되지 않도록, 실제 출퇴근 이력을
			// 진실 소스로 삼아 att를 채운다(버튼을 눌렀을 때의 낙관적 갱신은 doCheckIn/doCheckOut이
			// 그대로 처리).
			for (const a of todayHistory.content) {
				att[a.workAssignmentId] = { checkIn: a.checkIn, checkInTime: a.checkInTime, checkOut: a.checkOut, checkOutTime: a.checkOutTime };
			}
			const today = mine.filter((w) => w.workStartTime?.slice(0, 10) === T);
			const details = await Promise.all(today.map((w) => getWork($session.storeId, w.workId)));
			details.forEach((d, i) => (closings[today[i].workId] = d.closing));
		} finally {
			loading = false;
		}
		// 점주가 3단계(evaluation/send)까지 보낸 퇴사처리가 있을 때만 배너를 띄운다 - 없으면
		// 항상 404라 실패를 조용히 무시한다.
		try {
			const r = await getResignationForEmployee($session.storeId);
			resignationPending = r.status === 'EMPLOYEE_CONFIRM';
		} catch {
			resignationPending = false;
		}
	}
	onMount(load);

	const todayWorks = $derived(mine.filter((w) => w.workStartTime?.slice(0, 10) === T));
	const weekWorks = $derived(mine.filter((w) => w.workStartTime?.slice(0, 10) >= T).slice(0, 10));

	async function doCheckIn(w) {
		try {
			const r = await apiCheckIn($session.storeId, w.workId);
			att[w.workAssignmentId] = r;
			showToast('출근 기록됐어요');
		} catch (e) {
			showToast(e?.message || '이미 처리됐을 수 있어요');
		}
	}
	async function doCheckOut(w) {
		try {
			const r = await apiCheckOut($session.storeId, w.workId);
			att[w.workAssignmentId] = r;
			showToast('퇴근 기록됐어요');
		} catch (e) {
			showToast(e?.message || '이미 처리됐을 수 있어요');
		}
	}

	function writeHandOver(workId) {
		openDrawer(HandOverDrawer, { workId, onDone: load });
	}
</script>

<svelte:head><title>오늘 · WORKLEVEL</title></svelte:head>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="hdr">
		<div><div class="eyebrow">{fmt(T)} · {$session.storeName}</div><h1>{$session.alias}님, 오늘도 수고해요</h1></div>
	</div>

	<div class="cols">
		<div>
			{#each todayWorks as w (w.workAssignmentId)}
				{@const a = att[w.workAssignmentId]}
				<div class="clock" style="margin-bottom:16px">
					<div class="eyebrow">오늘 근무</div>
					<h2 class="num">{toHM(w.workStartTime)} – {toHM(w.workEndTime)}</h2>
					<div class="st">
						{#if a?.checkOut}
							퇴근했어요
						{:else if a?.checkIn}
							일하는 중 · {toHM(a.checkInTime)} 출근
						{:else}
							출근 전
						{/if}
					</div>
					{#if !a?.checkIn}
						<button class="btn p" style="margin-top:20px" onclick={() => doCheckIn(w)}>출근했어요</button>
					{:else if !a?.checkOut}
						<button class="btn p" style="margin-top:20px" onclick={() => doCheckOut(w)}>퇴근할게요</button>
					{/if}
				</div>
				{#if closings[w.workId]}
					<button class="btn s w" style="margin-bottom:16px" onclick={() => writeHandOver(w.workId)}>마감 인수인계 쓰기</button>
				{/if}
			{:else}
				<div class="card" style="margin-bottom:16px"><div class="empty" style="padding:16px 0">오늘은 근무 없음</div></div>
			{/each}
		</div>
		<div>
			{#if resignationPending}
				<div class="issue wait" style="margin-bottom:16px">
					<div class="bar"></div>
					<div class="main"><div class="t">사장님이 퇴사처리 확인을 요청했어요</div></div>
					<a class="btn p sm" href="/staff/resignation">확인하기</a>
				</div>
			{/if}
			<div class="sec">
				<div class="sec-h"><h3>이번 주 내 근무</h3></div>
				<div class="rows">
					{#each weekWorks as w (w.workAssignmentId)}
						<div class="row"><div class="main"><div class="t">{fmt(w.workStartTime.slice(0, 10))}</div><div class="s num">{toHM(w.workStartTime)}–{toHM(w.workEndTime)}</div></div></div>
					{:else}
						<div class="empty">이번 주 근무가 없어요</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
