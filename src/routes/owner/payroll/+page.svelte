<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getStoreSalary } from '$lib/api/cost.js';
	import { mock } from '$lib/stores/mock.js';
	import { deductionFor } from '$lib/utils/payroll.js';
	import { won } from '$lib/utils/format.js';

	let list = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);

	onMount(async () => {
		try {
			list = await getStoreSalary($session.storeId);
		} finally {
			loading = false;
		}
	});

	const rows = $derived(
		list.map((s) => {
			const gross = s.totalPay + s.weeklyAllowanceAmount;
			return { s, gross, ...deductionFor(gross, $mock.paySettings.deduct) };
		})
	);
	const total = $derived(
		rows.reduce((a, { gross, ded, net }) => ({ gross: a.gross + gross, ded: a.ded + ded, net: a.net + net }), { gross: 0, ded: 0, net: 0 })
	);
</script>

<svelte:head><title>급여 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">
			이번달 실제 출퇴근 기록 기준 수당(기본·야간·휴일)·주휴수당 합계예요. 공제만 백엔드에 없어 이 브라우저 설정을 따라요.
			<span class="mock-badge">공제만 추정</span>
		</div>
		<h1>급여</h1>
	</div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="tiles">
		<div class="tile"><b class="num" style="font-size:22px">{won(total.net)}</b><span>실지급 합계 · {rows.length}명</span></div>
		<div class="tile"><b class="num" style="font-size:22px">{won(total.gross)}</b><span>지급 총액</span></div>
		<div class="tile"><b class="num" style="font-size:22px">{won(total.ded)}</b><span>공제 합계</span></div>
		<div class="tile"><b class="num" style="font-size:22px">{$mock.paySettings.deduct === '3.3' ? '3.3%' : $mock.paySettings.deduct}</b><span>공제 방식</span></div>
	</div>
	<div class="paycard">
		{#each rows as { s, ded, net } (s.ticketId)}
			<div class="pay">
				<div class="h">
					<div class="avatar" style="width:30px;height:30px;font-size:11px">{s.alias?.slice(1)}</div>
					<div><b>{s.alias}</b><br /><span>시급 {s.hourlyWage?.toLocaleString()}원 · 이번달 {(s.totalWorkMinutes / 60).toFixed(1)}h</span></div>
				</div>
				<div class="amt">{won(net)}</div>
				<div class="ln"><span>수당 (기본·야간·휴일)</span><span>{won(s.totalPay)}</span></div>
				<div class="ln"><span>주휴수당</span><span>{won(s.weeklyAllowanceAmount)}</span></div>
				<div class="ln"><span>공제</span><span>−{won(ded)}</span></div>
				<div class="ln tot"><span>실지급</span><span>{won(net)}</span></div>
			</div>
		{:else}
			<div class="empty">이번달 급여 대상 직원이 없어요</div>
		{/each}
	</div>
	<p class="tiny muted" style="margin-top:16px">
		수당·주휴수당은 실제 근무·출퇴근 기록 기준 계산값이에요. 공제 방식은 설정에서 바꿀 수 있고, 실제 지급 전 세무 담당자 확인을 권해요.
	</p>
{/if}
