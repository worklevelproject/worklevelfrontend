<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getMyNextWeek, submitNextWeek } from '$lib/api/availableTime.js';
	import { addDays, DOW, dateOf } from '$lib/utils/date.js';
	import { TIME_TYPE } from '$lib/utils/labels.js';
	import { showToast } from '$lib/stores/toast.js';

	let loading = $state(true);
	let saving = $state(false);
	let weekStart = $state('');
	let days = $state(/** @type {{iso:string, d:string, n:number}[]} */ ([]));
	let templates = $state(/** @type {any[]} */ ([]));
	/** @type {Record<string, Record<string, boolean>>} */
	let grid = $state({});

	async function load() {
		loading = true;
		const res = await getMyNextWeek($session.storeId);
		weekStart = res.weekStart;
		templates = res.timeTemplates;
		days = Array.from({ length: 7 }, (_, i) => {
			const iso = addDays(weekStart, i);
			const d = dateOf(iso);
			return { iso, d: DOW[d.getDay()], n: d.getDate() };
		});
		const g = {};
		for (const day of days) g[day.iso] = { OPEN: false, NORMAL: false, CLOSE: false };
		for (const item of res.items) {
			for (const slot of item.timeSlots) {
				if (!g[item.date]) g[item.date] = { OPEN: false, NORMAL: false, CLOSE: false };
				g[item.date][slot.timeType] = true;
			}
		}
		grid = g;
		loading = false;
	}
	onMount(load);

	function toggle(iso, type) {
		grid = { ...grid, [iso]: { ...grid[iso], [type]: !grid[iso][type] } };
	}

	const activeTypes = $derived(templates.map((t) => t.timeType));

	async function submit() {
		saving = true;
		try {
			const items = [];
			for (const iso of Object.keys(grid)) {
				for (const type of Object.keys(grid[iso])) {
					if (grid[iso][type]) items.push({ date: iso, timeType: type });
				}
			}
			await submitNextWeek($session.storeId, { items });
			showToast('사장님께 보냈어요');
		} catch (e) {
			showToast(e?.message || '실패했어요');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>다음 주 되는 시간 · WORKLEVEL</title></svelte:head>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="hdr">
		<div><div class="eyebrow">{weekStart} 부터 한 주</div><h1>다음 주 언제 되세요?</h1></div>
		<div class="acts"><button class="btn p" disabled={saving} onclick={submit}>사장님께 보내기</button></div>
	</div>

	{#if !templates.length}
		<div class="empty">매장에 시간대 템플릿이 아직 없어요. 사장님에게 설정을 부탁해 주세요.</div>
	{:else}
		<p class="muted" style="margin-bottom:12px">칸을 누르면 가능/불가능이 바뀌어요.</p>
		<div class="ag">
			<div></div>
			{#each days as w (w.iso)}<div class="h">{w.d}<b>{w.n}</b></div>{/each}
			{#each activeTypes as t (t)}
				<div class="lab"><b>{TIME_TYPE[t]}</b></div>
				{#each days as w (w.iso)}
					<button class={grid[w.iso]?.[t] ? 'ok' : 'no'} onclick={() => toggle(w.iso, t)}>{grid[w.iso]?.[t] ? '돼요' : '안 돼요'}</button>
				{/each}
			{/each}
		</div>
		<div class="note" style="margin-top:16px">안 적으면 없는 것으로 봐요. 이 내용은 근무 배정에만 쓰이고 평가에는 들어가지 않아요.</div>
	{/if}
{/if}
