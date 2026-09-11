<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getResponse, updateStatus } from '$lib/api/workResponse.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { WORK_RESPONSE_STATUS } from '$lib/utils/labels.js';

	/** @type {{workId: number, owner?: boolean, onDone?: () => void}} */
	let { workId, owner = true, onDone } = $props();

	let detail = $state(/** @type {any} */ (null));
	let remark = $state('');
	let saving = $state(false);

	async function load() {
		detail = await getResponse($session.storeId, workId);
		remark = detail.remark || '';
	}
	onMount(load);

	async function setStatus(status) {
		saving = true;
		try {
			detail = await updateStatus($session.storeId, workId, { status, remark });
			showToast(status === 'SUCCESS' ? '승인했어요' : '반려했어요');
			onDone?.();
		} catch (e) {
			showToast(e?.message || '처리에 실패했어요');
		} finally {
			saving = false;
		}
	}

	function renderResponse(r, contentType) {
		if (!r) return '';
		if (contentType === 'MEMO') return r.memo;
		if (contentType === 'CHECK') return (r.items || []).map((i) => `${i.label}: ${i.checked ? '완료' : '미완료'}`).join(' · ');
		if (contentType === 'PHOTO') return `사진 ${(r.s3FileIds || []).length}장`;
		return JSON.stringify(r);
	}
</script>

<DrawerShell title={detail ? detail.workTitle : '근무 보고'}>
	{#snippet children()}
		{#if !detail}
			<div class="empty">불러오는 중…</div>
		{:else}
			<div class="kv" style="margin-top:0">
				<div><b>{WORK_RESPONSE_STATUS[detail.status]}</b><span>상태</span></div>
				<div><b>{(detail.workers || []).map((w) => w.alias).join(', ') || '—'}</b><span>누가</span></div>
			</div>
			<div class="note">{renderResponse(detail.response, detail.contentType)}</div>
			{#if owner}
				<div class="f" style="margin-top:16px"><label>비고 (선택)</label><input bind:value={remark} /></div>
			{/if}
		{/if}
	{/snippet}
	{#snippet foot()}
		{#if owner && detail}
			<button class="btn d" disabled={saving} onclick={() => setStatus('REJECT')}>반려</button>
			<button class="btn p" disabled={saving} onclick={() => setStatus('SUCCESS')}>승인</button>
		{:else}
			<button class="btn p" onclick={closeDrawer}>닫기</button>
		{/if}
	{/snippet}
</DrawerShell>
