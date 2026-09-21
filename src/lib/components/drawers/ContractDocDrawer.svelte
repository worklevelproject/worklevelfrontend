<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { register } from '$lib/api/contractDocument.js';
	import { uploadFile, retryAfterUpload } from '$lib/api/s3file.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { DOCUMENT_TYPE } from '$lib/utils/labels.js';
	import { addDays, todayISO } from '$lib/utils/date.js';

	/** @type {{ticketId: number, onDone?: () => void}} */
	let { ticketId, onDone } = $props();

	let documentType = $state('CONTRACT');
	let title = $state('근로계약서');
	let issuedDate = $state(todayISO());
	let expiryDate = $state(addDays(todayISO(), 365));
	let file = $state(/** @type {File | null} */ (null));
	let saving = $state(false);
	let err = $state('');

	async function submit() {
		if (!file) return (err = '파일을 골라 주세요');
		saving = true;
		err = '';
		try {
			const s3FileId = await uploadFile(file, 'PRIVATE');
			await retryAfterUpload(() =>
				register(ticketId, { title: title.trim() || DOCUMENT_TYPE[documentType], documentType, issuedDate, expiryDate, s3FileId })
			);
			showToast('등록했어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '등록에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title="서류 등록">
	{#snippet children()}
		<div class="f">
			<label>종류</label>
			<div class="opts">
				{#each Object.entries(DOCUMENT_TYPE) as [k, l] (k)}
					<button class={documentType === k ? 'on' : ''} onclick={() => { documentType = k; title = l; }}>{l}</button>
				{/each}
			</div>
		</div>
		<div class="f"><label>제목</label><input bind:value={title} /></div>
		<div class="f"><div class="inline">
			<div class="f" style="margin:0"><label>발급일</label><input bind:value={issuedDate} /></div>
			<div class="f" style="margin:0"><label>만료일</label><input bind:value={expiryDate} /></div>
		</div></div>
		<div class="f"><label>파일</label><input type="file" accept="image/*,.pdf" onchange={(e) => (file = e.target.files?.[0] || null)} /></div>
		<p class="tiny muted">사장님과 직원 본인만 볼 수 있어요.</p>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>등록</button>
	{/snippet}
</DrawerShell>
