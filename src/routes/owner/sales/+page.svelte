<script>
	import { mock } from '$lib/stores/mock.js';
	import { won, man } from '$lib/utils/format.js';
	import { todayISO, DOW } from '$lib/utils/date.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import SalesDayDrawer from '$lib/components/drawers/SalesDayDrawer.svelte';

	const T = todayISO();
	let calYear = $state(new Date().getFullYear());
	let calMonth = $state(new Date().getMonth());
	let calSel = $state(T);

	const pre = $derived(`${calYear}-${String(calMonth + 1).padStart(2, '0')}`);
	const keys = $derived(Object.keys($mock.sales).filter((k) => k.startsWith(pre) && $mock.sales[k].total > 0));
	const vals = $derived(keys.map((k) => $mock.sales[k].total));
	const max = $derived(Math.max(...vals, 1));
	const sum = $derived(vals.reduce((a, b) => a + b, 0));
	const avg = $derived(vals.length ? sum / vals.length : 0);
	const best = $derived([...keys].sort((a, b) => $mock.sales[b].total - $mock.sales[a].total)[0]);

	const first = $derived(new Date(calYear, calMonth, 1).getDay());
	const days = $derived(new Date(calYear, calMonth + 1, 0).getDate());
	const cells = $derived(
		Array.from({ length: days }, (_, i) => {
			const d = i + 1;
			const k = `${pre}-${String(d).padStart(2, '0')}`;
			const s = $mock.sales[k];
			const has = s && s.total > 0;
			let lvl = 'none';
			if (has) lvl = s.total >= max * 0.9 ? 'l4' : s.total >= max * 0.75 ? 'l3' : s.total >= max * 0.6 ? 'l2' : 'l1';
			return { d, k, s, has, lvl };
		})
	);

	const sel = $derived($mock.sales[calSel]);
	const hasSel = $derived(sel && sel.total > 0);

	function prevMonth() {
		calMonth--;
		if (calMonth < 0) {
			calMonth = 11;
			calYear--;
		}
	}
	function nextMonth() {
		calMonth++;
		if (calMonth > 11) {
			calMonth = 0;
			calYear++;
		}
	}
	function openDay(iso) {
		openDrawer(SalesDayDrawer, { iso });
	}
</script>

<svelte:head><title>매출 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">하루 매출 · 직원에게는 보이지 않아요<span class="mock-badge">목업</span></div>
		<h1>매출</h1>
	</div>
	<div class="acts"><button class="btn p" onclick={() => openDay(T)}>오늘 매출 넣기</button></div>
</div>

<div class="tiles">
	<div class="tile"><b class="num" style="font-size:22px">{won(sum)}</b><span>{calMonth + 1}월 누적</span></div>
	<div class="tile"><b class="num" style="font-size:22px">{won(avg)}</b><span>하루 평균</span></div>
	<div class="tile"><b class="num" style="font-size:22px">{best ? `${+best.slice(8)}일 · ${man($mock.sales[best].total)}` : '—'}</b><span>가장 잘 판 날</span></div>
	<div class="tile"><b class="num" style="font-size:22px">{vals.length}일</b><span>입력한 날</span></div>
</div>

<div class="cols">
	<div>
		<div class="month">
			<button onclick={prevMonth}>‹</button><b>{calYear}년 {calMonth + 1}월</b><button onclick={nextMonth}>›</button>
		</div>
		<div class="cal">
			{#each DOW as d (d)}<div class="dow">{d}</div>{/each}
			{#each Array(first) as _, i (i)}<button class="empty"></button>{/each}
			{#each cells as c (c.k)}
				<button class="{c.lvl} {c.k === T ? 'today' : ''} {c.k === calSel ? 'sel' : ''}" onclick={() => (calSel = c.k)}>
					<small>{c.d}</small><b>{c.has ? man(c.s.total) : c.k > T ? '' : '—'}</b>
				</button>
			{/each}
		</div>
	</div>
	<div class="card w">
		<div class="sec-h"><h3>{calSel}</h3><button class="btn p sm" onclick={() => openDay(calSel)}>{hasSel ? '고치기' : '넣기'}</button></div>
		{#if hasSel}
			<div class="kv" style="margin-top:0">
				<div><b class="num">{won(sel.total)}</b><span>총 매출</span></div>
				<div><b class="num">{sel.orders}건</b><span>주문 · 객단가 {sel.orders ? won(sel.total / sel.orders) : '—'}</span></div>
			</div>
			<div class="bars">
				{#each [['카드', sel.card], ['현금', sel.cash], ['배달', sel.delivery]] as [l, v] (l)}
					<div><span>{l}</span><i style="width:{sel.total ? Math.round((v / sel.total) * 100) : 0}%"></i><b>{won(v)}</b></div>
				{/each}
			</div>
		{:else}
			<div class="empty">이날 매출이 아직 없어요</div>
		{/if}
	</div>
</div>
