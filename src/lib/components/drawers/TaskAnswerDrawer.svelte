<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { completeTask } from '$lib/api/task.js';
	import { uploadFile, retryAfterUpload } from '$lib/api/s3file.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { CONTENT_TYPE } from '$lib/utils/labels.js';
	import { dueLabel } from '$lib/utils/date.js';

	/** @type {{taskId:number, title:string, contentType:'CHECK'|'MEMO'|'PHOTO', dueDate?:string, onDone?: () => void}} */
	let { taskId, title, contentType, dueDate, onDone } = $props();

	let checked = $state(true);
	let memo = $state('');
	let files = $state(/** @type {FileList | null} */ (null));
	let saving = $state(false);
	let uploading = $state(false);
	let err = $state('');

	async function submit() {
		saving = true;
		err = '';
		try {
			let response;
			let justUploaded = false;
			if (contentType === 'CHECK') {
				response = { checked };
			} else if (contentType === 'MEMO') {
				if (!memo.trim()) throw new Error('내용을 적어 주세요');
				response = { memo: memo.trim() };
			} else {
				if (!files || !files.length) throw new Error('사진을 골라 주세요');
				uploading = true;
				const ids = [];
				for (const f of files) ids.push(await uploadFile(f, 'PROTECTED'));
				uploading = false;
				response = { s3FileIds: ids };
				justUploaded = true;
			}
			const complete = () => completeTask($session.storeId, taskId, response);
			await (justUploaded ? retryAfterUpload(complete) : complete());
			const late = dueDate && new Date(dueDate) < new Date();
			showToast(late ? '마감이 지나서 기한 넘김으로 기록됐어요' : '완료 처리했어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '처리에 실패했어요';
		} finally {
			saving = false;
			uploading = false;
		}
	}
</script>

<DrawerShell title={title}>
	{#snippet children()}
		<div class="muted tiny" style="margin-bottom:12px">{CONTENT_TYPE[contentType]}{dueDate ? ` · ${dueLabel(dueDate)}까지` : ''}</div>
		{#if contentType === 'CHECK'}
			<label class="setrow" style="cursor:pointer">
				<div class="t">했어요</div>
				<input type="checkbox" bind:checked style="width:20px;height:20px" />
			</label>
		{:else if contentType === 'MEMO'}
			<div class="f"><label>내용</label><textarea bind:value={memo} autofocus></textarea></div>
		{:else}
			<div class="f">
				<label>사진</label>
				<input type="file" accept="image/*" multiple onchange={(e) => (files = e.target.files)} />
			</div>
		{/if}
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>나중에</button>
		<button class="btn p" disabled={saving} onclick={submit}>{uploading ? '올리는 중…' : '완료했어요'}</button>
	{/snippet}
</DrawerShell>
