<script>
	import { onMount, onDestroy } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getTask, updateTask, deleteTask } from '$lib/api/task.js';
	import { loadProtectedImages } from '$lib/api/s3file.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';
	import { CONTENT_TYPE, TASK_STATUS, taskStatusPillClass } from '$lib/utils/labels.js';
	import { dueLabel } from '$lib/utils/date.js';

	/** @type {{taskId:number, onDone?: () => void}} */
	let { taskId, onDone } = $props();

	let task = $state(/** @type {any} */ (null));
	let editing = $state(false);
	let title = $state('');
	let dueDate = $state('');
	let dueTime = $state('');
	let saving = $state(false);
	let err = $state('');
	/** @type {Record<number, string>} s3FileId -> blob object URL */
	let photoUrls = $state({});
	let photoErr = $state('');

	const pending = $derived(task?.status === 'PENDING');

	async function load() {
		task = (await getTask($session.storeId, taskId)).task;
		title = task.title;
		dueDate = task.dueDate?.slice(0, 10) || '';
		dueTime = task.dueDate?.slice(11, 16) || '';
		const ids = task.contentType === 'PHOTO' && task.response ? task.response.s3FileIds || [] : [];
		if (ids.length) {
			try {
				Object.values(photoUrls).forEach((u) => URL.revokeObjectURL(u));
				photoErr = '';
				photoUrls = await loadProtectedImages(ids);
			} catch (e) {
				photoErr = e?.message || '사진을 불러오지 못했어요';
			}
		}
	}
	onMount(load);
	onDestroy(() => Object.values(photoUrls).forEach((u) => URL.revokeObjectURL(u)));

	function renderResponse(r, contentType) {
		if (!r) return '';
		if (contentType === 'MEMO') return r.memo;
		if (contentType === 'CHECK') return r.checked ? '했어요' : '아직이에요';
		return JSON.stringify(r);
	}

	async function saveEdit() {
		if (!title.trim()) return (err = '제목을 적어 주세요');
		if (!dueDate || !dueTime) return (err = '언제까지 할지 정해 주세요');
		saving = true;
		err = '';
		try {
			await updateTask($session.storeId, taskId, { title: title.trim(), dueDate: `${dueDate}T${dueTime}:00` });
			showToast('수정했어요');
			editing = false;
			await load();
			onDone?.();
		} catch (e) {
			err = e?.message || '수정에 실패했어요';
		} finally {
			saving = false;
		}
	}

	function onDelete() {
		confirmBox('이 할 일을 지울까요?', '담당 직원의 배정에서도 빠져요.', '지우기', async () => {
			try {
				await deleteTask($session.storeId, taskId);
				showToast('지웠어요');
				closeDrawer();
				onDone?.();
			} catch (e) {
				showToast(e?.message || '지우지 못했어요');
			}
		}, true);
	}
</script>

<DrawerShell title={task ? task.title : '할 일'}>
	{#snippet children()}
		{#if !task}
			<div class="empty">불러오는 중…</div>
		{:else}
			{#if editing}
				<div class="f"><label>제목</label><input bind:value={title} autofocus /></div>
				<div class="f">
					<label>언제까지</label>
					<div class="inline">
						<input type="date" bind:value={dueDate} aria-label="마감 날짜" />
						<input type="time" bind:value={dueTime} aria-label="마감 시간" />
					</div>
				</div>
				<p class="tiny muted">담당 직원을 바꾸려면 이 할 일을 지우고 새로 만들어 주세요.</p>
			{:else}
				<div class="kv" style="margin-top:0">
					<div><b>{task.alias}</b><span>누구에게</span></div>
					<div><b>{dueLabel(task.dueDate)}</b><span>언제까지</span></div>
					<div><b>{CONTENT_TYPE[task.contentType]}</b><span>답하는 방법</span></div>
				</div>
				<div class="f">
					<label>상태</label>
					<div class="note">
						<span class="pill {taskStatusPillClass(task.status)}">{TASK_STATUS[task.status]}</span>
						{#if task.completedAt}<span class="tiny muted"> · {dueLabel(task.completedAt)}에 제출</span>{/if}
						{#if task.response}
							{#if task.contentType === 'PHOTO'}
								{#if photoErr}
									<p class="tiny err">{photoErr}</p>
								{:else}
									<div class="inline" style="margin-top:8px;flex-wrap:wrap">
										{#each task.response.s3FileIds || [] as id (id)}
											{#if photoUrls[id]}
												<img src={photoUrls[id]} alt="제출 사진" style="width:96px;height:96px;object-fit:cover;border-radius:6px" />
											{/if}
										{/each}
									</div>
								{/if}
							{:else}
								<div>{renderResponse(task.response, task.contentType)}</div>
							{/if}
						{/if}
					</div>
				</div>
			{/if}
			{#if err}<p class="f err">{err}</p>{/if}
		{/if}
	{/snippet}
	{#snippet foot()}
		{#if editing}
			<button class="btn s" onclick={() => (editing = false)}>취소</button>
			<button class="btn p" disabled={saving} onclick={saveEdit}>저장</button>
		{:else}
			{#if pending}<button class="btn d" onclick={onDelete}>삭제</button>{/if}
			{#if task && task.status !== 'COMPLETE'}<button class="btn s" onclick={() => (editing = true)}>수정</button>{/if}
			<button class="btn p" onclick={closeDrawer}>닫기</button>
		{/if}
	{/snippet}
</DrawerShell>
