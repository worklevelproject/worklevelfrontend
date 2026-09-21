<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getTasks } from '$lib/api/task.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { CONTENT_TYPE, TASK_STATUS, taskStatusPillClass } from '$lib/utils/labels.js';
	import { dueLabel } from '$lib/utils/date.js';
	import { createPagedList } from '$lib/utils/pagedList.svelte.js';
	import TaskAnswerDrawer from '$lib/components/drawers/TaskAnswerDrawer.svelte';

	let loading = $state(true);
	let error = $state('');
	const tasks = createPagedList((offset) => getTasks($session.storeId, offset));
	// 내게 배정된 것만 클라이언트에서 필터(백엔드 목록 API가 담당자 필터를 안 받음) - "더보기"는
	// 전체 할 일 기준으로 다음 페이지를 이어 받으므로, 한 번에 안 보이던 내 할 일이 더보기 후에
	// 나타날 수 있다.
	const list = $derived(tasks.items.filter((t) => t.ticketId === $session.ticketId));

	async function load() {
		loading = true;
		error = '';
		try {
			await tasks.load();
		} catch (e) {
			error = e?.message || '불러오기에 실패했어요';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	function answer(t) {
		if (t.status !== 'PENDING') return;
		openDrawer(TaskAnswerDrawer, {
			taskId: t.id,
			title: t.title,
			contentType: t.contentType,
			dueDate: t.dueDate,
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
{:else if error}
	<div class="empty">{error}</div>
{:else}
	<table class="tbl">
		<thead><tr><th>할 일</th><th>언제까지</th><th>답하는 방법</th><th>상태</th><th></th></tr></thead>
		<tbody>
			{#each list as t (t.id)}
				<tr class={t.status === 'PENDING' ? 'click' : ''} onclick={() => answer(t)}>
					<td><span class="t">{t.title}</span></td>
					<td class="num">{dueLabel(t.dueDate)}</td>
					<td><span class="kind">{CONTENT_TYPE[t.contentType]}</span></td>
					<td><span class="pill {taskStatusPillClass(t.status)}">{TASK_STATUS[t.status]}</span></td>
					<td>{#if t.status === 'PENDING'}<span class="link">답하기 →</span>{/if}</td>
				</tr>
			{:else}
				<tr><td colspan="5"><div class="empty">아직 맡겨진 할 일이 없어요.</div></td></tr>
			{/each}
		</tbody>
	</table>
	{#if tasks.hasNext}<button class="btn s" style="margin-top:10px" onclick={tasks.loadMore}>더보기</button>{/if}
{/if}
