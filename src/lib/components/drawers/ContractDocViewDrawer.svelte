<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { getDetail } from '$lib/api/contractDocument.js';
	import { createDownloadPresign } from '$lib/api/s3file.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { DOCUMENT_TYPE } from '$lib/utils/labels.js';

	/** 서류 파일은 PRIVATE 버킷이라 목록엔 파일 id가 없다 — 상세로 s3FileId를 얻고 download-presign으로
	 * 잠깐 유효한 URL을 받아 보여준다(사장님·티켓 본인 모두 백엔드가 허용). 이미지가 아니면(PDF 등)
	 * `<img>`가 실패하므로 새 탭으로 열기 링크만 남긴다.
	 * @type {{ticketId: number, contractDocumentId: number}} */
	let { ticketId, contractDocumentId } = $props();

	let doc = $state(/** @type {any} */ (null));
	let url = $state('');
	let loading = $state(true);
	let imgFailed = $state(false);
	let err = $state('');

	$effect(() => {
		let cancelled = false;
		loading = true;
		err = '';
		imgFailed = false;
		(async () => {
			try {
				const d = await getDetail(ticketId, contractDocumentId);
				const p = await createDownloadPresign(d.s3FileId);
				if (cancelled) return;
				doc = d;
				url = p.presignedUrl;
			} catch (e) {
				if (!cancelled) err = e?.message || '서류를 불러오지 못했어요';
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

<DrawerShell title={doc ? doc.title || DOCUMENT_TYPE[doc.documentType] || '서류' : '서류'}>
	{#snippet children()}
		{#if loading}
			<div class="empty">불러오는 중…</div>
		{:else if err}
			<p class="f err">{err}</p>
		{:else if doc}
			<div class="doc-meta tiny muted">
				{DOCUMENT_TYPE[doc.documentType] || doc.documentType} · 발급 {doc.issuedDate} · 만료 {doc.expiryDate}
			</div>
			{#if !imgFailed}
				<img class="doc-view" src={url} alt={doc.title} onerror={() => (imgFailed = true)} />
			{:else}
				<div class="empty">미리 볼 수 없는 파일이에요. 아래 버튼으로 열어 주세요.</div>
			{/if}
		{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>닫기</button>
		{#if url}<a class="btn p" href={url} target="_blank" rel="noopener noreferrer">새 탭에서 열기</a>{/if}
	{/snippet}
</DrawerShell>

<style>
	.doc-meta {
		margin-bottom: 12px;
	}
	.doc-view {
		display: block;
		width: 100%;
		border-radius: 4px;
		border: 1px solid var(--cloud);
	}
</style>
