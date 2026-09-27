<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getStoreSalary } from '$lib/api/cost.js';
	import { DEDUCTION_TYPE } from '$lib/utils/labels.js';
	import { won } from '$lib/utils/format.js';

	let list = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			list = await getStoreSalary($session.storeId);
		} catch (e) {
			error = e?.message || '불러오기에 실패했어요';
		} finally {
			loading = false;
		}
	});

	// 공제액·실지급액까지 백엔드 계산값(직원별 공제 방식 deductionType 적용)
	const rows = $derived(
		list.map((s) => ({ s, gross: s.totalPay + s.weeklyAllowanceAmount, deduct: s.deductionType, ded: s.deductionAmount, net: s.netPay }))
	);
	const total = $derived(
		rows.reduce((a, { gross, ded, net }) => ({ gross: a.gross + gross, ded: a.ded + ded, net: a.net + net }), { gross: 0, ded: 0, net: 0 })
	);
</script>

<svelte:head><title>급여 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">
			이번달 실제 출퇴근 기록 기준 수당(기본·야간·휴일)·주휴수당 합계예요. 공제는 직원 상세에서 정한 직원별 공제 방식으로 계산돼요.
		</div>
		<h1>급여</h1>
	</div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else if error}
	<div class="empty">{error}</div>
{:else}
	<div class="tiles">
		<div class="tile"><b class="num" style="font-size:22px">{won(total.net)}</b><span>실지급 합계 · {rows.length}명</span></div>
		<div class="tile"><b class="num" style="font-size:22px">{won(total.gross)}</b><span>지급 총액</span></div>
		<div class="tile"><b class="num" style="font-size:22px">{won(total.ded)}</b><span>공제 합계</span></div>
	</div>
	<div class="paycard">
		{#each rows as { s, deduct, ded, net } (s.ticketId)}
			<div class="pay">
				<div class="h">
					<div class="avatar" style="width:30px;height:30px;font-size:11px">{s.alias?.slice(1)}</div>
					<div><b>{s.alias}</b><br /><span>시급 {s.hourlyWage?.toLocaleString()}원 · 이번달 {(s.totalWorkMinutes / 60).toFixed(1)}h</span></div>
				</div>
				<div class="amt">{won(net)}</div>
				<div class="ln"><span>수당 (기본·야간·휴일)</span><span>{won(s.totalPay)}</span></div>
				<div class="ln"><span>주휴수당</span><span>{won(s.weeklyAllowanceAmount)}</span></div>
				<div class="ln"><span>공제 ({DEDUCTION_TYPE[deduct] ?? deduct})</span><span>−{won(ded)}</span></div>
				<div class="ln tot"><span>실지급</span><span>{won(net)}</span></div>
			</div>
		{:else}
			<div class="empty">이번달 급여 대상 직원이 없어요</div>
		{/each}
	</div>
	<p class="tiny muted" style="margin-top:16px">
		수당·주휴수당은 실제 근무·출퇴근 기록 기준 계산값이에요. 공제 방식은 직원 상세에서 직원마다 바꿀 수 있고, 실제 지급 전 세무 담당자 확인을 권해요.
	</p>
{/if}
