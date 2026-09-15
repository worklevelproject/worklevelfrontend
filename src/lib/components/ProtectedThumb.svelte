<script>
	import { loadProtectedImages } from '$lib/api/s3file.js';
	import CupIcon from './CupIcon.svelte';

	/** PROTECTED S3File 하나를 CDN에서 받아와 보여준다. s3FileId가 없거나 아직 불러오는 중이면
	 * CupIcon 색상 아이콘으로 대체한다. 부모가 크기를 정하면(`.cup`, 고정 height 카드 등) 이미지가
	 * 그 안을 꽉 채운다(object-fit:cover). */
	/** @type {{s3FileId?: number | null, color?: string}} */
	let { s3FileId = null, color = '#8E8E8E' } = $props();

	let url = $state('');

	$effect(() => {
		const id = s3FileId;
		let cancelled = false;
		let localUrl = '';
		url = '';
		if (id) {
			loadProtectedImages([id])
				.then((m) => {
					if (cancelled) return;
					localUrl = m[id] || '';
					url = localUrl;
				})
				.catch(() => {});
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
