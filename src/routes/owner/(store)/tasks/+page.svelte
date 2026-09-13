<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getTasks } from '$lib/api/task.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { CONTENT_TYPE, TASK_RECURRENCE_TYPE, TASK_RESPONSE_STATUS, taskResponsePillClass } from '$lib/utils/labels.js';
	import { createPagedList } from '$lib/utils/pagedList.svelte.js';
	import TaskDetailDrawer from '$lib/components/drawers/TaskDetailDrawer.svelte';
	import TaskFormDrawer from '$lib/components/drawers/TaskFormDrawer.svelte';

	let loading = $state(true);
	const list = createPagedList((offset) => getTasks($session.storeId, offset));

	async function load() {
		loading = true;
		try {
			await list.load();
		} finally {
			loading = false;
		}
	}
	onMount(load);

	function open(taskId) {
		openDrawer(TaskDetailDrawer, { taskId, onDone: load });
	}
	function create() {
		openDrawer(TaskFormDrawer, { onDone: load });
	}
</script>

<svelte:head><title>할 일 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">점주가 등록하고, 직원에게 맡기는 할 일</div>
		<h1>할 일</h1>
	</div>
	<div class="acts"><button class="btn p" onclick={create}>할 일 만들기</button></div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<table class="tbl">
		<thead><tr><th>할 일</th><th>답하는 방법</th><th>반복</th><th>담당</th><th>상태</th><th></th></tr></thead>
		<tbody>
			{#each list.items as t (t.id)}
				<tr class="click" onclick={() => open(t.id)}>
					<td><span class="t">{t.title}</span></td>
					<td><span class="kind">{CONTENT_TYPE[t.contentType]}</span></td>
					<td><span class="kind">{TASK_RECURRENCE_TYPE[t.recurrenceType]}</span></td>
					<td>{t.latestResponse ? t.latestResponse.alias : '—'}</td>
					<td>
						{#if t.latestResponse}
							<span class="pill {taskResponsePillClass(t.latestResponse.status)}">{TASK_RESPONSE_STATUS[t.latestResponse.status]}</span>
						{:else}
							<span class="pill off">배정 전</span>
						{/if}
					</td>
					<td><span class="link">자세히 →</span></td>
				</tr>
			{:else}
				<tr><td colspan="6"><div class="empty">아직 만든 할 일이 없어요.</div></td></tr>
			{/each}
		</tbody>
	</table>
	{#if list.hasNext}<button class="btn s" style="margin-top:10px" onclick={list.loadMore}>더보기</button>{/if}
{/if}
