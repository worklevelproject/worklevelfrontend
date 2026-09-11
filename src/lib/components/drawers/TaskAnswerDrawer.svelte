<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getWork } from '$lib/api/work.js';
	import { getResponse, createResponse, updateResponse } from '$lib/api/workResponse.js';
	import { uploadFile } from '$lib/api/s3file.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { ApiError } from '$lib/api/client.js';
	import { CONTENT_TYPE } from '$lib/utils/labels.js';

	/** @type {{workId: number, onDone?: () => void}} */
	let { workId, onDone } = $props();

	let work = $state(/** @type {any} */ (null));
	let existing = $state(/** @type {any} */ (null));
	let checks = $state(/** @type {{label:string, checked:boolean}[]} */ ([]));
	let memo = $state('');
	let files = $state(/** @type {FileList | null} */ (null));
	let saving = $state(false);
	let uploading = $state(false);
	let err = $state('');

	onMount(async () => {
		work = await getWork($session.storeId, workId);
		if (work.contentType === 'CHECK') {
			checks = (work.content.items || []).map((label) => ({ label, checked: false }));
		}
		try {
			existing = await getResponse($session.storeId, workId);
			if (existing) {
				if (work.contentType === 'CHECK') checks = existing.response.items || checks;
				if (work.contentType === 'MEMO') memo = existing.response.memo || '';
			}
		} catch (e) {
			if (!(e instanceof ApiError && e.status === 404)) throw e;
		}
	});

	function buildResponse() {
		if (work.contentType === 'CHECK') return { items: checks };
		if (work.contentType === 'MEMO') return { memo: memo.trim() };
		return null; // PHOTO는 업로드 후 별도 구성
	}

	async function submit() {
		saving = true;
		err = '';
		try {
			let response = buildResponse();
			if (work.contentType === 'MEMO' && !memo.trim()) throw new Error('내용을 적어 주세요');
			if (work.contentType === 'PHOTO') {
				if (!files || !files.length) throw new Error('사진을 골라 주세요');
				uploading = true;
				const ids = [];
				for (const f of files) ids.push(await uploadFile(f, 'PROTECTED'));
				uploading = false;
				response = { s3FileIds: ids };
			}
			if (existing) {
				await updateResponse($session.storeId, workId, { response });
			} else {
				await createResponse($session.storeId, workId, { response });
			}
			showToast('사장님께 바로 갔어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '보내기에 실패했어요';
		} finally {
			saving = false;
			uploading = false;
		}
	}
</script>

<DrawerShell title={work ? work.title : '할 일'}>
	{#snippet children()}
		{#if !work}
			<div class="empty">불러오는 중…</div>
		{:else}
			<div class="muted tiny" style="margin-bottom:12px">{CONTENT_TYPE[work.contentType]}</div>
			{#if existing?.status === 'REJECT'}
				<div class="note">반려됐어요{existing.remark ? ' · ' + existing.remark : ''}. 다시 답하면 재검토돼요.</div>
			{/if}
			{#if work.contentType === 'CHECK'}
				{#each checks as c, i (c.label)}
					<label class="setrow" style="cursor:pointer">
						<div class="t">{c.label}</div>
						<input type="checkbox" bind:checked={checks[i].checked} style="width:20px;height:20px" />
					</label>
				{/each}
			{:else if work.contentType === 'MEMO'}
				<div class="f"><label>{work.content.guide}</label><textarea bind:value={memo} autofocus></textarea></div>
			{:else}
				<div class="f">
					<label>{work.content.guide} (최소 {work.content.requiredCount}장)</label>
					<input type="file" accept="image/*" multiple onchange={(e) => (files = e.target.files)} />
				</div>
			{/if}
			{#if err}<p class="f err">{err}</p>{/if}
		{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>나중에</button>
		<button class="btn p" disabled={saving} onclick={submit}>{uploading ? '올리는 중…' : work?.contentType === 'CHECK' ? '했어요' : '보내기'}</button>
	{/snippet}
</DrawerShell>
