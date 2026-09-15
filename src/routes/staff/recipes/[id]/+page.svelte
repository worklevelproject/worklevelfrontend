<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.js';
	import { getManualItem } from '$lib/api/manualItem.js';
	import ProtectedThumb from '$lib/components/ProtectedThumb.svelte';

	const id = Number(page.params.id);
	let r = $state(/** @type {any} */ (null));

	onMount(async () => {
		r = await getManualItem($session.storeId, id);
	});
</script>

<svelte:head><title>{r?.content?.nameKo || '레시피'} · WORKLEVEL</title></svelte:head>

{#if !r}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="hdr">
		<div><div class="eyebrow">{r.content.nameEn}</div><h1>{r.content.nameKo}</h1></div>
	</div>
	<div class="cols eq">
		<div>
			<div class="card" style="height:320px;overflow:hidden;display:flex;align-items:center;justify-content:center">
				{#if r.thumbnailS3FileId}
					<div style="width:100%;height:100%"><ProtectedThumb s3FileId={r.thumbnailS3FileId} /></div>
				{:else}
					<div style="width:120px;height:135px"><ProtectedThumb s3FileId={null} /></div>
				{/if}
			</div>
			{#if r.content.precautions}<div class="note" style="margin-top:12px"><b style="font-weight:500;color:var(--carbon)">주의</b><br />{r.content.precautions}</div>{/if}
		</div>
		<div>
			<div class="sec">
				<div class="sec-h"><h3>재료 · 양</h3></div>
				<div class="rows">
					{#each r.content.ingredients as ing (ing.name)}
						<div class="row" style="padding:10px 0"><div class="main">{ing.name} · {ing.amount}</div></div>
					{/each}
				</div>
			</div>
			<div class="sec">
				<div class="sec-h"><h3>만드는 순서</h3></div>
				<ol class="steps">{#each r.content.steps as s, i (i)}<li>{s}</li>{/each}</ol>
			</div>
		</div>
	</div>
{/if}
