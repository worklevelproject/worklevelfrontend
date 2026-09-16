<script>
	import { loadProtectedImagesWithRetry } from '$lib/api/s3file.js';
	import CupIcon from './CupIcon.svelte';

	/** PROTECTED S3File 하나를 CDN에서 받아와 보여준다. s3FileId가 없거나 아직 불러오는 중이면
	 * CupIcon 색상 아이콘으로 대체한다. 부모가 크기를 정하면(`.cup`, 고정 height 카드 등) 이미지가
	 * 그 안을 꽉 채운다(object-fit:cover).
	 *
	 * 업로드 직후에는 백엔드 S3FileWebhookController가 업로드 완료를 비동기로 반영하기 때문에
	 * 첫 조회가 실패할 수 있다 — loadProtectedImagesWithRetry로 재시도한다. */
	/** @type {{s3FileId?: number | null, color?: string}} */
	let { s3FileId = null, color = '#8E8E8E' } = $props();

	let url = $state('');

	$effect(() => {
		const id = s3FileId;
		let cancelled = false;
		let localUrl = '';
		url = '';
		if (id) {
			loadProtectedImagesWithRetry([id], () => cancelled).then((m) => {
				if (cancelled) return;
				localUrl = m[id] || '';
				url = localUrl;
			});
		}
		return () => {
			cancelled = true;
			if (localUrl) URL.revokeObjectURL(localUrl);
		};
	});
</script>

{#if url}
	<img class="thumb-img" src={url} alt="" />
{:else}
	<CupIcon {color} />
{/if}
