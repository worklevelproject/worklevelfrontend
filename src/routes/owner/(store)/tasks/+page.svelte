<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getTasks } from '$lib/api/task.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { CONTENT_TYPE, TASK_STATUS, taskStatusPillClass } from '$lib/utils/labels.js';
	import { dueLabel } from '$lib/utils/date.js';
	import { createPagedList } from '$lib/utils/pagedList.svelte.js';
	import TaskDetailDrawer from '$lib/components/drawers/TaskDetailDrawer.svelte';
	import TaskFormDrawer from '$lib/components/drawers/TaskFormDrawer.svelte';

	let loading = $state(true);
	let error = $state('');
	const list = createPagedList((offset) => getTasks($session.storeId, offset));

	async function load() {
		loading = true;
		error = '';
		try {
			await list.load();
		} catch (e) {
			error = e?.message || '불러오기에 실패했어요';
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
		<div class="eyebrow">누구에게, 언제까지 맡길지 정해서 직원에게 맡기는 할 일</div>
		<h1>할 일</h1>
	</div>
	<div class="acts"><button class="btn p" onclick={create}>할 일 만들기</button></div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else if error}
	<div class="empty">{error}</div>
{:else}
	<table class="tbl">
		<thead><tr><th>할 일</th><th>누구에게</th><th>언제까지</th><th>답하는 방법</th><th>상태</th><th></th></tr></thead>
		<tbody>
			{#each list.items as t (t.id)}
				<tr class="click" onclick={() => open(t.id)}>
					<td><span class="t">{t.title}</span></td>
					<td>{t.alias}</td>
					<td class="num">{dueLabel(t.dueDate)}</td>
					<td><span class="kind">{CONTENT_TYPE[t.contentType]}</span></td>
					<td><span class="pill {taskStatusPillClass(t.status)}">{TASK_STATUS[t.status]}</span></td>
					<td><span class="link">자세히 →</span></td>
				</tr>
			{:else}
				<tr><td colspan="6"><div class="empty">아직 만든 할 일이 없어요.</div></td></tr>
			{/each}
		</tbody>
	</table>
	{#if list.hasNext}<button class="btn s" style="margin-top:10px" onclick={list.loadMore}>더보기</button>{/if}
{/if}
