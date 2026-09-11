<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { saveSalesDay, mock } from '$lib/stores/mock.js';
	import { showToast } from '$lib/stores/toast.js';
	import { fmt } from '$lib/utils/date.js';

	/** @type {{iso: string}} */
	let { iso } = $props();
	const existing = $mock.sales[iso];

	let total = $state(existing?.total || '');
	let orders = $state(existing?.orders || '');
	let card = $state(existing?.card || '');
	let cash = $state(existing?.cash || '');
	let delivery = $state(existing?.delivery || '');

	function submit() {
		const t = Number(total) || 0;
		if (!t) return showToast('총 매출을 넣어 주세요');
		const c = Number(card) || 0,
			h = Number(cash) || 0,
			d = Number(delivery) || 0;
		saveSalesDay(iso, {
			total: t,
			orders: Number(orders) || 0,
			card: c || (h || d ? t - h - d : Math.round(t * 0.8)),
			cash: h || (c || d ? t - c - d : Math.round(t * 0.1)),
			delivery: d || (c || h ? t - c - h : t - Math.round(t * 0.8) - Math.round(t * 0.1))
		});
		showToast('저장했어요');
		closeDrawer();
	}
</script>

<DrawerShell title={`${fmt(iso)} 매출 ${existing ? '고치기' : '넣기'}`}>
	{#snippet children()}
		<p class="tiny muted" style="margin:-4px 0 16px">백엔드에 매출 도메인이 아직 없어 이 브라우저에만 저장돼요.<span class="mock-badge">목업</span></p>
		<div class="f"><div class="inline">
			<div class="f" style="margin:0"><label>총 매출</label><input bind:value={total} inputmode="numeric" autofocus /></div>
			<div class="f" style="margin:0"><label>주문 수</label><input bind:value={orders} inputmode="numeric" /></div>
		</div></div>
		<div class="f"><div class="inline">
			<div class="f" style="margin:0"><label>카드</label><input bind:value={card} inputmode="numeric" /></div>
			<div class="f" style="margin:0"><label>현금</label><input bind:value={cash} inputmode="numeric" /></div>
			<div class="f" style="margin:0"><label>배달</label><input bind:value={delivery} inputmode="numeric" /></div>
		</div></div>
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" onclick={submit}>저장</button>
	{/snippet}
</DrawerShell>
