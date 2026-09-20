<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { mock } from '$lib/stores/mock.js';
	import { getAttendance } from '$lib/api/dashboard.js';
	import { getAttendanceCorrections, confirmAttendanceCorrection, rejectAttendanceCorrection, getOwnerWeeklySchedule } from '$lib/api/work.js';
	import { getEmployeeStats } from '$lib/api/store.js';
	import { getNotices } from '$lib/api/notice.js';
	import { getHandOvers } from '$lib/api/handover.js';
	import { getStoreSalary } from '$lib/api/cost.js';
	import { todayISO, mondayOf, addDays, hh, toHM, rel } from '$lib/utils/date.js';
	import { won, man } from '$lib/utils/format.js';
	import { deductionFor } from '$lib/utils/payroll.js';
	import { showToast } from '$lib/stores/toast.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { ATTENDANCE_STATUS, attendancePillClass } from '$lib/utils/labels.js';
	import AddShiftDrawer from '$lib/components/drawers/AddShiftDrawer.svelte';
	import NoticeDrawer from '$lib/components/drawers/NoticeDrawer.svelte';
	import ScheduleDraftDrawer from '$lib/components/drawers/ScheduleDraftDrawer.svelte';

	let loading = $state(true);
	let error = $state('');
	let items = $state(/** @type {any[]} */ ([]));
	let corrections = $state(/** @type {any[]} */ ([]));
	let stats = $state(/** @type {any[]} */ ([]));
	let notices = $state(/** @type {any[]} */ ([]));
	let handovers = $state(/** @type {any[]} */ ([]));
	let salary = $state(/** @type {any[]} */ ([]));
	let nextWeek = $state(/** @type {any} */ (null));

	const T = todayISO();
	const nowH = () => {
		const d = new Date();
		return d.getHours() + d.getMinutes() / 60;
	};

	async function load() {
		loading = true;
		error = '';
		try {
			const storeId = $session.storeId;
			const nextMonday = addDays(mondayOf(T), 7);
			const [att, corr, empStats, n, h, sal, nw] = await Promise.all([
				getAttendance(storeId, T),
				getAttendanceCorrections(storeId),
				getEmployeeStats(storeId, true),
				getNotices(storeId),
				getHandOvers(storeId),
				getStoreSalary(storeId),
				getOwnerWeeklySchedule(storeId, nextMonday)
			]);
			items = att.filter((a) => a.workDate === T);
			corrections = corr.content.filter((c) => !c.resolved);
			stats = empStats.content;
			notices = n.content;
			handovers = h.content;
			salary = sal;
			nextWeek = nw;
		} catch (e) {
			error = e?.message || '불러오기에 실패했어요';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	// 다음 주 근무표 상태: nextWeek(getOwnerWeeklySchedule 응답)의 근무 건수만 본다. 근무는 생성 즉시
	// 확정이라(수락/거절 단계 삭제) "직원 답 대기" 상태는 없다.
	const nextWeekCount = $derived((nextWeek?.days ?? []).reduce((n, d) => n + d.works.length, 0));

	const isLate = (a) => a.checkIn && a.checkInTime && hh(toHM(a.checkInTime)) - hh(toHM(a.workStartTime)) > 10 / 60;
	const planned = $derived(items);
	const inNow = $derived(items.filter((a) => a.status === 'WORKING').length);
	const lateCount = $derived(items.filter(isLate).length);
	const notYet = $derived(items.filter((a) => a.status === 'NO_SHOW').length);

	const today = $derived($mock.sales[T] || { total: 0 });
	const yesterday = $derived($mock.sales[Object.keys($mock.sales).sort().filter((k) => k < T).at(-1)] || { total: 0 });

	const monthlyPayEstimate = $derived(
		salary.reduce((sum, s) => sum + deductionFor(s.totalPay + s.weeklyAllowanceAmount, $mock.paySettings.deduct).net, 0)
	);

	async function onConfirmCorrection(id) {
		try {
			await confirmAttendanceCorrection($session.storeId, id);
			showToast('고쳐줬어요 · 확인된 기록에 반영');
			load();
		} catch (e) {
			showToast(e?.message || '처리에 실패했어요');
		}
	}
	async function onRejectCorrection(id) {
		try {
			await rejectAttendanceCorrection($session.storeId, id);
			showToast('그대로 두었어요');
			load();
		} catch (e) {
			showToast(e?.message || '처리에 실패했어요');
		}
	}
</script>

<svelte:head><title>오늘 · WORKLEVEL</title></svelte:head>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else if error}
	<div class="empty">{error}</div>
{:else}
	<div class="hdr">
		<div>
			<div class="eyebrow">{T} · {$session.storeName}</div>
			<h1>{nowH() < 12 ? '좋은 아침입니다' : nowH() < 18 ? '좋은 오후입니다' : '수고 많으셨어요'}, 사장님</h1>
		</div>
		<div class="acts">
			<button class="btn s" onclick={() => openDrawer(NoticeDrawer, { onDone: load })}>공지 쓰기</button>
			<button class="btn p" onclick={() => openDrawer(AddShiftDrawer, { onDone: load })}>근무 넣기</button>
		</div>
	</div>

	<div class="stat">
		<button><b class="num">{planned.length}</b><span>오늘 나오는 직원</span></button>
		<button class="in"><b class="num">{inNow}</b><span>지금 일하는 중</span></button>
		<button class="late"><b class="num">{lateCount}</b><span>지각</span></button>
		<button class="abs"><b class="num">{notYet}</b><span>아직 안 온 직원</span></button>
		<a href="/owner/sales"><b class="num" style="font-size:20px">{won(today.total)}</b><span>오늘 매출 · 어제 {man(yesterday.total)}<span class="mock-badge">목업</span></span></a>
	</div>

	<div class="cols eq" style="margin-top:12px">
		{#if nextWeekCount === 0}
			<button class="card w" style="text-align:left" onclick={() => openDrawer(ScheduleDraftDrawer, { onDone: load })}>
				<div class="tiny muted">다음 주 근무표</div>
				<p style="margin-top:4px">아직 비어 있어요 · 초안 만들기</p>
			</button>
		{:else}
			<a class="card w" href="/owner/shifts" style="text-decoration:none;color:inherit">
				<div class="tiny muted">다음 주 근무표</div>
				<p style="margin-top:4px">근무 {nextWeekCount}건이 배정돼 있어요</p>
			</a>
		{/if}
	</div>

	<div class="cols">
		<div>
			<div class="sec">
				<div class="sec-h"><h3>오늘 챙길 것 {corrections.length}</h3></div>

				{#each corrections as c (c.workAssignmentId)}
					<div class="issue wait">
						<div class="bar"></div>
						<div class="main">
							<div class="t">{c.alias} · 출퇴근 기록 정정 제안</div>
							<div class="s">
								{c.correctionReason || '사유 없음'} ·
								{c.proposedCheckInTime ? toHM(c.proposedCheckInTime) + ' 출근' : ''}
								{c.proposedCheckOutTime ? ' / ' + toHM(c.proposedCheckOutTime) + ' 퇴근' : ''}
							</div>
						</div>
						<div class="acts">
							<button class="btn s sm" onclick={() => onRejectCorrection(c.workAssignmentId)}>그대로</button>
							<button class="btn p sm" onclick={() => onConfirmCorrection(c.workAssignmentId)}>고쳐주기</button>
						</div>
					</div>
				{/each}

				{#if !corrections.length}
					<div class="card"><div class="empty" style="padding:16px 0">챙길 게 없어요.</div></div>
				{/if}
			</div>

			<div class="sec">
				<div class="sec-h"><h3>오늘 근무 · 지금 상태</h3><a class="more" href="/owner/attendance">출퇴근 →</a></div>
				<table class="tbl">
					<thead>
						<tr><th>직원</th><th>예정</th><th>실제 출근</th><th>상태</th></tr>
					</thead>
					<tbody>
						{#each planned as a (a.workAssignmentId)}
							<tr>
								<td><div class="who"><div class="avatar">{a.alias?.slice(1)}</div><span class="t">{a.alias}</span></div></td>
								<td class="num">{toHM(a.workStartTime)}–{toHM(a.workEndTime)}</td>
								<td class="num">{a.checkIn ? toHM(a.checkInTime) : '—'}{a.checkOut ? ' → ' + toHM(a.checkOutTime) : ''}</td>
								<td>
									<span class="pill {attendancePillClass(a.status)}">{ATTENDANCE_STATUS[a.status] || a.status}</span>
								</td>
							</tr>
						{:else}
							<tr><td colspan="4"><div class="empty">오늘 근무가 없어요</div></td></tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if handovers[0]}
				<div class="sec">
					<div class="sec-h"><h3>최근 마감 노트</h3><a class="more" href="/owner/notices">인수인계 →</a></div>
					<div class="card">
						<div class="tiny muted">{handovers[0].writer.alias} · {rel(handovers[0].createdAt.slice(0, 10))} {toHM(handovers[0].createdAt)}</div>
						<p style="margin-top:6px;color:var(--carbon)">{handovers[0].content}</p>
					</div>
				</div>
			{/if}
		</div>

		<div>
			<div class="sec">
				<div class="sec-h"><h3>공지</h3><a class="more" href="/owner/notices">공지 →</a></div>
				<div class="rows">
					{#each notices.slice(0, 3) as n (n.id)}
						<div class="row"><div class="main"><div class="t">{n.title}</div><div class="s">{rel(n.createdAt.slice(0, 10))}</div></div></div>
					{:else}
						<div class="empty">공지가 없어요</div>
					{/each}
				</div>
			</div>
			<div class="sec">
				<div class="sec-h"><h3>이번 달 급여 예상</h3><a class="more" href="/owner/payroll">급여 →</a></div>
				<div class="card">
					<div class="tile" style="padding:0;background:none">
						<b class="num" style="font-size:24px">{won(monthlyPayEstimate)}</b>
						<span>직원 {salary.length}명 실지급 예상 · 공제 방식은 급여 페이지 참고</span>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
