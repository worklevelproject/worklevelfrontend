<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getEmployeeStats } from '$lib/api/store.js';
	import { mock } from '$lib/stores/mock.js';
	import { payFor } from '$lib/utils/payroll.js';
	import { won } from '$lib/utils/format.js';

	let stats = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);

	onMount(async () => {
		try {
			stats = await getEmployeeStats($session.storeId, true);
		} finally {
			loading = false;
		}
	});

	const rows = $derived(stats.map((s) => ({ s, r: payFor(s.weeklyWorkMinutes / 60, 0, s.hourlyWage || 0, $mock.paySettings) })));
	const total = $derived(rows.reduce((a, { r }) => ({ gross: a.gross + r.gross, ded: a.ded + r.ded, net: a.net + r.net }), { gross: 0, ded: 0, net: 0 }));
</script>

<svelte:head><title>급여 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">
			실제 확정 근무시간(이번 주)에 근로기준법 참고 계산을 얹은 값이에요. 계산 규칙 자체는 백엔드에 없어 이 브라우저 설정을 따라요.
			<span class="mock-badge">목업 계산</span>
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
		{#each rows as { s, r } (s.ticketId)}
			<div class="pay">
				<div class="h">
					<div class="avatar" style="width:30px;height:30px;font-size:11px">{s.alias?.slice(1)}</div>
					<div><b>{s.alias}</b><br /><span>{s.jobRole} · 시급 {s.hourlyWage?.toLocaleString()}원 · 이번 주 {r.wh}h</span></div>
				</div>
				<div class="amt">{won(r.net)}</div>
				<div class="ln"><span>기본급 (주 {r.wh}h × 4.3주)</span><span>{won(r.base)}</span></div>
				<div class="ln"><span>주휴수당{r.holiday ? '' : ' (주 15h 미만)'}</span><span>{won(r.holiday)}</span></div>
				<div class="ln"><span>공제</span><span>−{won(r.ded)}</span></div>
				<div class="ln tot"><span>실지급</span><span>{won(r.net)}</span></div>
			</div>
		{/each}
	</div>
	<p class="tiny muted" style="margin-top:16px">
		근로기준법 기준 참고 계산이에요. 주휴수당은 주 15시간 이상일 때, 야간·연장 가산은 설정에서 켤 수 있어요. 실제 지급 전 세무 담당자 확인을 권해요.
	</p>
{/if}
