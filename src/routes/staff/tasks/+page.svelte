<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getTasks } from '$lib/api/task.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { CONTENT_TYPE, TASK_RESPONSE_STATUS, taskResponsePillClass } from '$lib/utils/labels.js';
	import TaskAnswerDrawer from '$lib/components/drawers/TaskAnswerDrawer.svelte';

	let list = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);

	async function load() {
		loading = true;
		try {
			const all = await getTasks($session.storeId);
			list = all.filter((t) => t.latestResponse?.ticketId === $session.ticketId);
		} finally {
			loading = false;
		}
	}
	onMount(load);

	function answer(t) {
		if (t.latestResponse.status === 'COMPLETE') return;
		openDrawer(TaskAnswerDrawer, {
			taskId: t.id,
			taskResponseId: t.latestResponse.id,
			title: t.title,
			contentType: t.contentType,
			onDone: load
		});
	}
</script>

<svelte:head><title>할 일 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">사장님이 나에게 맡긴 할 일</div>
		<h1>할 일</h1>
	</div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<table class="tbl">
		<thead><tr><th>할 일</th><th>답하는 방법</th><th>상태</th><th></th></tr></thead>
		<tbody>
			{#each list as t (t.id)}
				<tr class={t.latestResponse.status === 'PENDING' ? 'click' : ''} onclick={() => answer(t)}>
					<td><span class="t">{t.title}</span></td>
					<td><span class="kind">{CONTENT_TYPE[t.contentType]}</span></td>
					<td><span class="pill {taskResponsePillClass(t.latestResponse.status)}">{TASK_RESPONSE_STATUS[t.latestResponse.status]}</span></td>
					<td>{#if t.latestResponse.status === 'PENDING'}<span class="link">답하기 →</span>{/if}</td>
				</tr>
			{:else}
				<tr><td colspan="4"><div class="empty">아직 맡겨진 할 일이 없어요.</div></td></tr>
			{/each}
		</tbody>
	</table>
{/if}
