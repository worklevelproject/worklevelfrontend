<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getMyProfile } from '$lib/api/store.js';
	import { getMySalary } from '$lib/api/cost.js';
	import { DEDUCTION_TYPE } from '$lib/utils/labels.js';
	import { won } from '$lib/utils/format.js';

	let profile = $state(/** @type {any} */ (null));
	let salary = $state(/** @type {any} */ (null));
	let loading = $state(true);

	onMount(async () => {
		const [p, s] = await Promise.all([getMyProfile($session.storeId), getMySalary($session.storeId)]);
		profile = p;
		salary = s;
		loading = false;
	});

	// 공제액·실지급액은 백엔드가 내 공제 방식(deductionType)으로 계산해 준다
	const r = $derived(salary ? { ded: salary.deductionAmount, net: salary.netPay } : null);
</script>

<svelte:head><title>내 급여 · WORKLEVEL</title></svelte:head>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="hdr"><div><div class="eyebrow">이번달 실제 출퇴근 기록 기준</div><h1>내 급여</h1></div></div>
	<div class="cols">
		<div>
			<div class="tiles" style="grid-template-columns:1fr 1fr 1fr">
				<div class="tile"><b class="num" style="font-size:24px">{won(r.net)}</b><span>이번 달 받을 돈</span></div>
				<div class="tile"><b class="num" style="font-size:24px">{(salary.totalWorkMinutes / 60).toFixed(1)}h</b><span>이번달 누적 근무시간</span></div>
				<div class="tile"><b class="num" style="font-size:24px">{won(salary.weeklyAllowanceAmount)}</b><span>주휴수당</span></div>
			</div>
			<div class="slip">
				<div class="tiny muted" style="margin-bottom:8px">이번 달</div>
				<div class="ln"><span>수당 (기본·야간·휴일)</span><span>{won(salary.totalPay)}</span></div>
				<div class="ln"><span>주휴수당</span><span>{won(salary.weeklyAllowanceAmount)}</span></div>
				<div class="ln"><span>공제 ({DEDUCTION_TYPE[salary.deductionType] ?? salary.deductionType})</span><span>−{won(r.ded)}</span></div>
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
