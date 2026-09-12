<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getHandOvers, createHandOver, updateHandOver } from '$lib/api/handover.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';

	/** @type {{workId:number, onDone?: () => void}} */
	let { workId, onDone } = $props();

	let existing = $state(/** @type {any} */ (null));
	let content = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let err = $state('');

	onMount(async () => {
		try {
			const list = await getHandOvers($session.storeId, workId);
			existing = list[0] || null;
			content = existing?.content || '';
		} finally {
			loading = false;
		}
	});

	async function submit() {
		if (!content.trim()) return (err = '내용을 적어 주세요');
		saving = true;
		err = '';
		try {
			if (existing) {
				await updateHandOver($session.storeId, existing.id, content.trim());
			} else {
				await createHandOver($session.storeId, workId, content.trim());
			}
			showToast('전달했어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '저장에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title="마감 인수인계">
	{#snippet children()}
		{#if loading}
			<div class="empty">불러오는 중…</div>
		{:else}
			<div class="f"><label>다음 근무자에게 전할 말</label><textarea bind:value={content} style="height:140px" placeholder="예: 원두 1봉 남음, 쇼케이스 온도 정상" autofocus></textarea></div>
			{#if err}<p class="f err">{err}</p>{/if}
		{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving || loading} onclick={submit}>{existing ? '수정' : '전달'}</button>
	{/snippet}
</DrawerShell>
