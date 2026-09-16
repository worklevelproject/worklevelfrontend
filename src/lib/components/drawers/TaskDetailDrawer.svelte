<script>
	import { onMount, onDestroy } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getTask, updateTask, deleteTask } from '$lib/api/task.js';
	import { createTaskResponse } from '$lib/api/taskResponse.js';
	import { loadProtectedImagesWithRetry } from '$lib/api/s3file.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';
	import { CONTENT_TYPE, TASK_RECURRENCE_TYPE, TASK_RESPONSE_STATUS, taskResponsePillClass } from '$lib/utils/labels.js';

	/** @type {{taskId:number, onDone?: () => void}} */
	let { taskId, onDone } = $props();

	let task = $state(/** @type {any} */ (null));
	let members = $state(/** @type {any[]} */ ([]));
	let assignTo = $state(/** @type {number | ''} */ (''));
	let editing = $state(false);
	let title = $state('');
	let recurrenceType = $state('ONE_TIME');
	let saving = $state(false);
	let err = $state('');
	/** @type {Record<number, string>} s3FileId -> blob object URL */
	let photoUrls = $state({});
	let photoErr = $state('');
	let cancelled = false;

	async function load() {
		const detail = await getTask($session.storeId, taskId);
		task = detail.task;
		members = detail.members;
		title = task.title;
		recurrenceType = task.recurrenceType;
		const ids = task.contentType === 'PHOTO' && task.latestResponse?.status === 'COMPLETE'
			? task.latestResponse.response?.s3FileIds || []
			: [];
		if (ids.length) {
			Object.values(photoUrls).forEach((u) => URL.revokeObjectURL(u));
			photoErr = '';
			try {
				// 직원이 방금 올린 사진일 수 있어 웹훅 반영 지연을 감안해 재시도한다.
				const loaded = await loadProtectedImagesWithRetry(ids, () => cancelled);
				if (cancelled) return;
				photoUrls = loaded;
				if (ids.some((id) => !loaded[id])) photoErr = '사진을 불러오지 못했어요';
			} catch (e) {
				if (!cancelled) photoErr = e?.message || '사진을 불러오지 못했어요';
			}
		}
	}
	onMount(load);
	onDestroy(() => {
		cancelled = true;
		Object.values(photoUrls).forEach((u) => URL.revokeObjectURL(u));
	});

	function renderResponse(r, contentType) {
		if (!r) return '';
		if (contentType === 'MEMO') return r.memo;
		if (contentType === 'CHECK') return r.checked ? '완료' : '미완료';
		return JSON.stringify(r);
	}

	async function assign() {
		if (!assignTo) return;
		saving = true;
		err = '';
		try {
			await createTaskResponse($session.storeId, taskId, Number(assignTo));
			showToast('배정했어요');
			assignTo = '';
			await load();
			onDone?.();
		} catch (e) {
			err = e?.message || '배정에 실패했어요';
		} finally {
			saving = false;
		}
	}

	async function saveEdit() {
		if (!title.trim()) return (err = '제목을 적어 주세요');
		saving = true;
		err = '';
		try {
			await updateTask($session.storeId, taskId, { title: title.trim(), recurrenceType });
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
		confirmBox('이 할 일을 지울까요?', '배정 이력도 함께 사라져요.', '지우기', async () => {
			await deleteTask($session.storeId, taskId);
			showToast('지웠어요');
			closeDrawer();
			onDone?.();
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
					<label>반복</label>
					<div class="opts">
						{#each Object.entries(TASK_RECURRENCE_TYPE) as [k, l] (k)}
							<button class={recurrenceType === k ? 'on' : ''} onclick={() => (recurrenceType = k)}>{l}</button>
						{/each}
					</div>
				</div>
			{:else}
				<div class="kv" style="margin-top:0">
					<div><b>{CONTENT_TYPE[task.contentType]}</b><span>답하는 방법</span></div>
					<div><b>{TASK_RECURRENCE_TYPE[task.recurrenceType]}</b><span>반복</span></div>
				</div>
				<div class="f">
					<label>현재 배정</label>
					{#if task.latestResponse}
						<div class="note">
							<b>{task.latestResponse.alias}</b> ·
							<span class="pill {taskResponsePillClass(task.latestResponse.status)}">{TASK_RESPONSE_STATUS[task.latestResponse.status]}</span>
							{#if task.latestResponse.status === 'COMPLETE'}
								{#if task.contentType === 'PHOTO'}
									{#if photoErr}
										<p class="tiny err">{photoErr}</p>
									{:else}
										<div class="inline" style="margin-top:8px;flex-wrap:wrap">
											{#each task.latestResponse.response?.s3FileIds || [] as id (id)}
												{#if photoUrls[id]}
													<img src={photoUrls[id]} alt="완료 사진" style="width:96px;height:96px;object-fit:cover;border-radius:6px" />
												{/if}
											{/each}
										</div>
									{/if}
								{:else}
									<div>{renderResponse(task.latestResponse.response, task.contentType)}</div>
								{/if}
							{/if}
						</div>
					{:else}
						<div class="empty">아직 배정한 사람이 없어요</div>
					{/if}
				</div>
				<div class="f">
					<label>{task.latestResponse ? '다시 배정하기' : '배정하기'}</label>
					<div class="inline">
						<select bind:value={assignTo} style="flex:1">
							<option value="">직원 선택</option>
							{#each members as m (m.ticketId)}
								<option value={m.ticketId}>{m.alias}</option>
							{/each}
						</select>
						<button class="btn p" disabled={!assignTo || saving} onclick={assign}>배정</button>
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
			<button class="btn d" onclick={onDelete}>삭제</button>
			<button class="btn s" onclick={() => (editing = true)}>수정</button>
			<button class="btn p" onclick={closeDrawer}>닫기</button>
		{/if}
	{/snippet}
</DrawerShell>
