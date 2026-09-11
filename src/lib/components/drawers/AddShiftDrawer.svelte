<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getEmployees } from '$lib/api/store.js';
	import { createWorks } from '$lib/api/work.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { WORK_TYPE, TIME_TYPE, CONTENT_TYPE } from '$lib/utils/labels.js';
	import { todayISO } from '$lib/utils/date.js';

	/** @type {{onDone?: () => void, defaultDate?: string}} */
	let { onDone, defaultDate } = $props();

	let employees = $state(/** @type {any[]} */ ([]));
	let selected = $state(/** @type {number[]} */ ([]));
	let title = $state('');
	let workType = $state('NORMAL');
	let timeType = $state('');
	let contentType = $state('CHECK');
	let checkItems = $state('쇼케이스 온도 확인');
	let guide = $state('');
	let requiredCount = $state(1);
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

	function buildContent() {
		if (contentType === 'CHECK') {
			const items = checkItems
				.split('\n')
				.map((s) => s.trim())
				.filter(Boolean);
			return { items };
		}
		if (contentType === 'MEMO') return { guide };
		return { guide, requiredCount: Number(requiredCount) || 1 };
	}

	async function submit() {
		if (!title.trim()) return (err = '무엇을 할지 적어 주세요');
		if (!selected.length) return (err = '직원을 한 명 이상 골라 주세요');
		saving = true;
		err = '';
		try {
			await createWorks($session.storeId, [
				{
					workType,
					timeType: timeType || null,
					title: title.trim(),
					contentType,
					content: buildContent(),
					startTime: `${date}T${startTime}:00`,
					endTime: `${date}T${endTime}:00`,
					participantTicketIds: selected
				}
			]);
			showToast('근무를 만들었어요');
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
			<label>제목</label>
			<input bind:value={title} placeholder="예: 오픈 근무 · 쇼케이스 온도 확인" autofocus />
		</div>
		<div class="f">
			<label>반복</label>
			<div class="opts">
				{#each Object.entries(WORK_TYPE) as [k, l] (k)}
					<button class={workType === k ? 'on' : ''} onclick={() => (workType = k)}>{l}</button>
				{/each}
			</div>
		</div>
		<div class="f">
			<label>시간대 (선택)</label>
			<div class="opts">
				<button class={timeType === '' ? 'on' : ''} onclick={() => (timeType = '')}>없음</button>
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
			<label>업무 종류</label>
			<div class="opts">
				{#each Object.entries(CONTENT_TYPE) as [k, l] (k)}
					<button class={contentType === k ? 'on' : ''} onclick={() => (contentType = k)}>{l}</button>
				{/each}
			</div>
		</div>
		{#if contentType === 'CHECK'}
			<div class="f"><label>체크 항목 (한 줄에 하나)</label><textarea bind:value={checkItems}></textarea></div>
		{:else if contentType === 'MEMO'}
			<div class="f"><label>답 안내</label><input bind:value={guide} placeholder="예: 원두 ○봉, 우유 ○팩 형식으로" /></div>
		{:else}
			<div class="f"><label>답 안내</label><input bind:value={guide} placeholder="예: 쇼케이스 온도" /></div>
			<div class="f"><label>필요한 사진 장수</label><input type="number" min="1" bind:value={requiredCount} /></div>
		{/if}
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
		<button class="btn p" disabled={saving} onclick={submit}>물어보기</button>
	{/snippet}
</DrawerShell>
