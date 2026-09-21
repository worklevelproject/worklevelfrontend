<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { createTask } from '$lib/api/task.js';
	import { getEmployees } from '$lib/api/store.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { CONTENT_TYPE } from '$lib/utils/labels.js';
	import { todayISO } from '$lib/utils/date.js';

	/** @type {{onDone?: () => void}} */
	let { onDone } = $props();

	let title = $state('');
	let contentType = $state('CHECK');
	let ticketId = $state(/** @type {number | null} */ (null));
	let dueDate = $state(todayISO());
	let dueTime = $state('18:00');
	let employees = $state(/** @type {any[]} */ ([]));
	let saving = $state(false);
	let err = $state('');

	onMount(async () => {
		try {
			// 점주 본인 티켓은 담당자 후보에서 뺀다(task 상세의 members도 점주 제외 목록이다)
			employees = (await getEmployees($session.storeId)).filter((e) => e.ticketId !== $session.ticketId);
		} catch (e) {
			err = e?.message || '직원 목록을 불러오지 못했어요';
		}
	});

	async function submit() {
		if (!title.trim()) return (err = '무엇을 할지 적어 주세요');
		if (!ticketId) return (err = '누구에게 맡길지 골라 주세요');
		if (!dueDate || !dueTime) return (err = '언제까지 할지 정해 주세요');
		saving = true;
		err = '';
		try {
			// 반복 구분은 자동 생성에 쓰이지 않는 메타데이터라 화면에서는 묻지 않고 일시적(ONE_TIME)으로 둔다
			await createTask($session.storeId, {
				title: title.trim(),
				contentType,
				recurrenceType: 'ONE_TIME',
				ticketId,
				dueDate: `${dueDate}T${dueTime}:00`
			});
			showToast('맡겼어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '만들기에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title="할 일 만들기">
	{#snippet children()}
		<div class="f"><label>제목</label><input bind:value={title} placeholder="예: 마감 청소 체크" autofocus /></div>
		<div class="f">
			<label>누구에게</label>
			<div class="rank">
				{#each employees as p (p.ticketId)}
					<button class={ticketId === p.ticketId ? 'on' : ''} onclick={() => (ticketId = p.ticketId)}>
						<span class="avatar">{p.alias?.slice(1)}</span>
						<span class="main"><span class="t">{p.alias}</span></span>
					</button>
				{:else}
					<div class="empty">직원이 없어요</div>
				{/each}
			</div>
		</div>
		<div class="f">
			<label>언제까지</label>
			<div class="inline">
				<input type="date" bind:value={dueDate} min={todayISO()} aria-label="마감 날짜" />
				<input type="time" bind:value={dueTime} aria-label="마감 시간" />
			</div>
			<p class="tiny muted" style="margin-top:6px">마감이 지난 뒤에 제출하면 완료가 아니라 ‘기한 넘김’으로 기록돼요.</p>
		</div>
		<div class="f">
			<label>답하는 방법</label>
			<div class="opts">
				{#each Object.entries(CONTENT_TYPE) as [k, l] (k)}
					<button class={contentType === k ? 'on' : ''} onclick={() => (contentType = k)}>{l}</button>
				{/each}
			</div>
		</div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>맡기기</button>
	{/snippet}
</DrawerShell>
