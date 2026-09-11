<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getMyProfile } from '$lib/api/store.js';
	import { getMyWorkRequests } from '$lib/api/work.js';
	import { mock } from '$lib/stores/mock.js';
	import { payFor } from '$lib/utils/payroll.js';
	import { won } from '$lib/utils/format.js';
	import { mondayOf, addDays, todayISO } from '$lib/utils/date.js';

	let profile = $state(/** @type {any} */ (null));
	let weeklyHours = $state(0);
	let loading = $state(true);

	onMount(async () => {
		const [p, accepted] = await Promise.all([getMyProfile($session.storeId), getMyWorkRequests($session.storeId, 'ACCEPT')]);
		profile = p;
		const monday = mondayOf(todayISO());
		const sunday = addDays(monday, 6);
		weeklyHours = accepted
			.filter((w) => w.workStartTime.slice(0, 10) >= monday && w.workStartTime.slice(0, 10) <= sunday)
			.reduce((sum, w) => sum + (new Date(w.workEndTime) - new Date(w.workStartTime)) / 3600000, 0);
		loading = false;
	});

	const r = $derived(profile ? payFor(weeklyHours, 0, profile.hourlyWage || 0, $mock.paySettings) : null);
</script>

<svelte:head><title>내 급여 · WORKLEVEL</title></svelte:head>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="hdr"><div><div class="eyebrow">확정 근무 기준 · 급여 계산 규칙은 사장님 설정을 따라요<span class="mock-badge">목업 계산</span></div><h1>내 급여</h1></div></div>
	<div class="cols">
		<div>
			<div class="tiles" style="grid-template-columns:1fr 1fr 1fr">
				<div class="tile"><b class="num" style="font-size:24px">{won(r.net)}</b><span>이번 달 받을 돈 (예상)</span></div>
				<div class="tile"><b class="num" style="font-size:24px">{r.mh}h</b><span>예상 근무시간 (주 {r.wh.toFixed(1)}h × 4.3)</span></div>
				<div class="tile"><b class="num" style="font-size:24px">{r.holiday ? '받아요' : '15h 미만'}</b><span>주휴수당 · {won(r.holiday)}</span></div>
			</div>
			<div class="slip">
				<div class="tiny muted" style="margin-bottom:8px">이번 달 예상</div>
				<div class="ln"><span>기본급</span><span>{won(r.base)}</span></div>
				<div class="ln"><span>주휴수당</span><span>{won(r.holiday)}</span></div>
				<div class="ln"><span>공제</span><span>−{won(r.ded)}</span></div>
				<div class="ln tot"><span>받을 돈</span><span>{won(r.net)}</span></div>
			</div>
			<p class="tiny muted" style="margin-top:12px">출퇴근 기록이 틀리면 내 정보 화면에서 고쳐달라고 요청하세요.</p>
		</div>
		<div>
			<div class="sec">
				<div class="sec-h"><h3>시급</h3></div>
				<div class="card"><div style="color:var(--carbon);font-weight:500">{profile.hourlyWage?.toLocaleString()}원</div></div>
			</div>
		</div>
	</div>
{/if}
