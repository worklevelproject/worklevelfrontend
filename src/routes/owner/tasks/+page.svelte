<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getResponses } from '$lib/api/workResponse.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { WORK_RESPONSE_STATUS, CONTENT_TYPE, statusPillClass } from '$lib/utils/labels.js';
	import TaskDetailDrawer from '$lib/components/drawers/TaskDetailDrawer.svelte';

	let list = $state(/** @type {any[]} */ ([]));
	let filter = $state('all');
	let loading = $state(true);

	async function load() {
		loading = true;
		try {
			list = await getResponses($session.storeId);
		} finally {
			loading = false;
		}
	}
	onMount(load);

	const filtered = $derived(filter === 'all' ? list : list.filter((t) => t.status === filter));

	function pillClass(status) {
		return status === 'SUCCESS' ? 'ok' : status === 'REJECT' ? 'bad' : 'wait';
	}
	function open(workId) {
		openDrawer(TaskDetailDrawer, { workId, owner: true, onDone: load });
	}
</script>

<svelte:head><title>할 일 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">직원이 올린 근무 보고 · 승인/반려</div>
		<h1>할 일</h1>
	</div>
</div>

<div class="chips">
	<button class="chip {filter === 'all' ? 'on' : ''}" onclick={() => (filter = 'all')}>전체 {list.length}</button>
	<button class="chip {filter === 'PENDING' ? 'on' : ''}" onclick={() => (filter = 'PENDING')}>검토 대기 {list.filter((t) => t.status === 'PENDING').length}</button>
	<button class="chip {filter === 'SUCCESS' ? 'on' : ''}" onclick={() => (filter = 'SUCCESS')}>승인 {list.filter((t) => t.status === 'SUCCESS').length}</button>
	<button class="chip {filter === 'REJECT' ? 'on' : ''}" onclick={() => (filter = 'REJECT')}>반려 {list.filter((t) => t.status === 'REJECT').length}</button>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<table class="tbl">
		<thead><tr><th>근무</th><th>답하는 방법</th><th>상태</th><th></th></tr></thead>
		<tbody>
			{#each filtered as t (t.id)}
				<tr class="click" onclick={() => open(t.workId)}>
					<td><span class="t">{t.workTitle}</span></td>
					<td><span class="kind">{CONTENT_TYPE[t.contentType]}</span></td>
					<td><span class="pill {pillClass(t.status)}">{WORK_RESPONSE_STATUS[t.status]}</span></td>
					<td><span class="link">자세히 →</span></td>
				</tr>
			{:else}
				<tr><td colspan="4"><div class="empty">아직 올라온 보고가 없어요. 배정만 된 근무는 근무표에서 확인해요.</div></td></tr>
			{/each}
		</tbody>
	</table>
{/if}
