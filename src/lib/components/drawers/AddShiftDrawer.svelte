<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getEmployees } from '$lib/api/store.js';
	import { createWorks } from '$lib/api/work.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { TIME_TYPE } from '$lib/utils/labels.js';
	import { todayISO } from '$lib/utils/date.js';

	/** @type {{onDone?: () => void, defaultDate?: string}} */
	let { onDone, defaultDate } = $props();

	let employees = $state(/** @type {any[]} */ ([]));
	let selected = $state(/** @type {number[]} */ ([]));
	let timeType = $state('NORMAL');
	let date = $state(defaultDate || todayISO());
	let startTime = $state('09:00');
	let endTime = $state('18:00');
	let saving = $state(false);
	let err = $state('');

	onMount(async () => {
		employees = await getEmployees($session.storeId);
	});

	function toggle(id) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}

	async function submit() {
		if (!selected.length) return (err = '직원을 한 명 이상 골라 주세요');
		saving = true;
		err = '';
		try {
			await createWorks($session.storeId, [
				{
					timeType,
					startTime: `${date}T${startTime}:00`,
					endTime: `${date}T${endTime}:00`,
					participantTicketIds: selected
				}
			]);
			showToast('근무를 넣었어요 · 직원에게 바로 배정됐어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '만들기에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title="근무 넣기">
	{#snippet children()}
		<div class="f">
			<label>시간대</label>
			<div class="opts">
				{#each Object.entries(TIME_TYPE) as [k, l] (k)}
					<button class={timeType === k ? 'on' : ''} onclick={() => (timeType = k)}>{l}</button>
				{/each}
			</div>
		</div>
		<div class="f">
			<div class="inline">
				<div class="f" style="margin:0"><label>날짜</label><input bind:value={date} /></div>
				<div class="f" style="margin:0"><label>시작</label><input bind:value={startTime} /></div>
				<div class="f" style="margin:0"><label>끝</label><input bind:value={endTime} /></div>
			</div>
		</div>
		<div class="f">
			<label>누구에게</label>
			<div class="rank">
				{#each employees as p (p.ticketId)}
					<button class={selected.includes(p.ticketId) ? 'on' : ''} onclick={() => toggle(p.ticketId)}>
						<span class="avatar">{p.alias?.slice(1)}</span>
						<span class="main"><span class="t">{p.alias}</span></span>
					</button>
				{:else}
					<div class="empty">직원이 없어요</div>
				{/each}
			</div>
		</div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>근무 넣기</button>
	{/snippet}
</DrawerShell>
