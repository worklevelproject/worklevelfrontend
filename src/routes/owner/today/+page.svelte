<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { mock } from '$lib/stores/mock.js';
	import { getAttendance } from '$lib/api/dashboard.js';
	import { getAttendanceCorrections, confirmAttendanceCorrection, rejectAttendanceCorrection, getStoreWorkRequests } from '$lib/api/work.js';
	import { getEmployeeStats } from '$lib/api/store.js';
	import { todayISO, hh, toHM } from '$lib/utils/date.js';
	import { won, man } from '$lib/utils/format.js';
	import { payFor } from '$lib/utils/payroll.js';
	import { showToast } from '$lib/stores/toast.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { ATTENDANCE_STATUS, attendancePillClass } from '$lib/utils/labels.js';
	import AddShiftDrawer from '$lib/components/drawers/AddShiftDrawer.svelte';
	import NoticeDrawer from '$lib/components/drawers/NoticeDrawer.svelte';

	let loading = $state(true);
	let error = $state('');
	let items = $state(/** @type {any[]} */ ([]));
	let corrections = $state(/** @type {any[]} */ ([]));
	let rejected = $state(/** @type {any[]} */ ([]));
	let stats = $state(/** @type {any[]} */ ([]));

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
			const [att, corr, rej, empStats] = await Promise.all([
				getAttendance(storeId, T),
				getAttendanceCorrections(storeId),
				getStoreWorkRequests(storeId, 'REJECT'),
				getEmployeeStats(storeId, true)
			]);
			items = att.filter((a) => a.workDate === T);
			corrections = corr.filter((c) => !c.resolved);
			rejected = rej.filter((r) => r.workStartTime?.slice(0, 10) >= T);
			stats = empStats;
		} catch (e) {
			error = e?.message || '불러오기에 실패했어요';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	const isLate = (a) => a.checkIn && a.checkInTime && hh(toHM(a.checkInTime)) - hh(toHM(a.workStartTime)) > 10 / 60;
	const planned = $derived(items);
	const inNow = $derived(items.filter((a) => a.status === 'WORKING').length);
	const lateCount = $derived(items.filter(isLate).length);
	const notYet = $derived(items.filter((a) => a.status === 'NO_SHOW').length);

	const today = $derived($mock.sales[T] || { total: 0 });
	const yesterday = $derived($mock.sales[Object.keys($mock.sales).sort().filter((k) => k < T).at(-1)] || { total: 0 });

	const monthlyPayEstimate = $derived(
		stats.reduce((sum, s) => sum + payFor(s.weeklyWorkMinutes / 60, 0, s.hourlyWage || 0, $mock.paySettings).net, 0)
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
			<button class="btn s" onclick={() => openDrawer(NoticeDrawer)}>공지 쓰기</button>
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

	<div class="cols">
		<div>
			<div class="sec">
				<div class="sec-h"><h3>오늘 챙길 것 {corrections.length + rejected.length}</h3></div>

				{#each rejected as r (r.workRequestId)}
					<div class="issue bad">
						<div class="bar"></div>
						<div class="main">
							<div class="t">{r.alias} · {r.workStartTime?.slice(5, 16).replace('T', ' ')} 근무를 거절했어요</div>
							<div class="s">사유: {r.reason || '없음'} · 대신할 직원을 구해야 해요</div>
						</div>
						<div class="acts"><a class="btn p sm" href="/owner/shifts">근무표에서 재배정</a></div>
					</div>
				{/each}

				{#each corrections as c (c.workRequestId)}
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
							<button class="btn s sm" onclick={() => onRejectCorrection(c.workRequestId)}>그대로</button>
							<button class="btn p sm" onclick={() => onConfirmCorrection(c.workRequestId)}>고쳐주기</button>
						</div>
					</div>
				{/each}

				{#if !corrections.length && !rejected.length}
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
						{#each planned as a (a.workRequestId)}
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

			{#if $mock.handovers[0]}
				<div class="sec">
					<div class="sec-h"><h3>어제 마감 노트<span class="mock-badge">목업</span></h3><a class="more" href="/owner/notices">인수인계 →</a></div>
					<div class="card">
						<div class="tiny muted">{$mock.handovers[0].by} · {$mock.handovers[0].at} · 사진 {$mock.handovers[0].photos}장</div>
						<p style="margin-top:6px;color:var(--carbon)">{$mock.handovers[0].text}</p>
					</div>
				</div>
			{/if}
		</div>

		<div>
			<div class="sec">
				<div class="sec-h"><h3>공지<span class="mock-badge">목업</span></h3><a class="more" href="/owner/notices">공지 →</a></div>
				<div class="rows">
					{#each $mock.notices.slice(0, 3) as n (n.id)}
						<div class="row"><div class="main"><div class="t">{n.title}</div><div class="s">{n.at}</div></div></div>
					{/each}
				</div>
			</div>
			<div class="sec">
				<div class="sec-h"><h3>이번 달 급여 예상</h3><a class="more" href="/owner/payroll">급여 →</a></div>
				<div class="card">
					<div class="tile" style="padding:0;background:none">
						<b class="num" style="font-size:24px">{won(monthlyPayEstimate)}</b>
						<span>직원 {stats.length}명 실지급 예상 · 계산 방식은 급여 페이지 참고<span class="mock-badge">목업 계산</span></span>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
