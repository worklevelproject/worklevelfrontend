<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { createTask } from '$lib/api/task.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { CONTENT_TYPE, TASK_RECURRENCE_TYPE } from '$lib/utils/labels.js';

	/** @type {{onDone?: () => void}} */
	let { onDone } = $props();

	let title = $state('');
	let contentType = $state('CHECK');
	let recurrenceType = $state('ONE_TIME');
	let saving = $state(false);
	let err = $state('');

	async function submit() {
		if (!title.trim()) return (err = '무엇을 할지 적어 주세요');
		saving = true;
		err = '';
		try {
			await createTask($session.storeId, { title: title.trim(), contentType, recurrenceType });
			showToast('만들었어요');
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
			<label>답하는 방법</label>
			<div class="opts">
				{#each Object.entries(CONTENT_TYPE) as [k, l] (k)}
					<button class={contentType === k ? 'on' : ''} onclick={() => (contentType = k)}>{l}</button>
				{/each}
			</div>
		</div>
		<div class="f">
			<label>반복</label>
			<div class="opts">
				{#each Object.entries(TASK_RECURRENCE_TYPE) as [k, l] (k)}
					<button class={recurrenceType === k ? 'on' : ''} onclick={() => (recurrenceType = k)}>{l}</button>
				{/each}
			</div>
		</div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>만들기</button>
	{/snippet}
</DrawerShell>
