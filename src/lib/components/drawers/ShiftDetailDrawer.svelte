<script>
	import { onMount } from 'svelte';
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { getWork, updateWork, deleteWork } from '$lib/api/work.js';
	import { getEmployees } from '$lib/api/store.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';
	import { toHM, fmt } from '$lib/utils/date.js';
	import { won } from '$lib/utils/format.js';
	import { WORK_TYPE, TIME_TYPE, WORK_REQUEST_STATUS, statusPillClass } from '$lib/utils/labels.js';

	/** @type {{workId: number, onDone?: () => void}} */
	let { workId, onDone } = $props();

	let work = $state(/** @type {any} */ (null));
	let employees = $state(/** @type {any[]} */ ([]));
	let editing = $state(false);
	let selected = $state(/** @type {number[]} */ ([]));
	let saving = $state(false);
	let err = $state('');

	async function load() {
		const [w, emp] = await Promise.all([getWork($session.storeId, workId), getEmployees($session.storeId)]);
		work = w;
		employees = emp;
		selected = (w.workRequests || []).filter((r) => r.status !== 'REJECT').map((r) => r.ticketId);
	}
	onMount(load);

	const isPast = $derived(work && new Date(work.startTime) <= new Date());

	function toggle(id) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}

	async function saveParticipants() {
		saving = true;
		err = '';
		try {
			work = await updateWork($session.storeId, workId, { participantTicketIds: selected });
			editing = false;
			showToast('대상을 바꿨어요');
			onDone?.();
		} catch (e) {
			err = e?.message || '수정에 실패했어요';
		} finally {
			saving = false;
		}
	}

	function onDelete() {
		confirmBox('이 근무를 뺄까요?', '시작 전 근무만 뺄 수 있어요.', '빼기', async () => {
			try {
				await deleteWork($session.storeId, workId);
				showToast('뺐어요');
				closeDrawer();
				onDone?.();
			} catch (e) {
				showToast(e?.message || '삭제에 실패했어요');
			}
		}, true);
	}
</script>

<DrawerShell title={work ? work.title : '근무'}>
	{#snippet children()}
		{#if !work}
			<div class="empty">불러오는 중…</div>
		{:else}
			<div class="kv" style="margin-top:0">
				<div><b class="num">{toHM(work.startTime)}–{toHM(work.endTime)}</b><span>{fmt(work.startTime.slice(0, 10))}</span></div>
				<div><b>{WORK_TYPE[work.workType]}</b><span>반복 · {work.timeType ? TIME_TYPE[work.timeType] : '시간대 없음'}</span></div>
			</div>

			{#if work.minStaff}
				<p class="tiny muted">
					최소 인원 {work.minStaff}명 ·
					{work.staffingStatus === 'SUFFICIENT' ? '충족' : work.staffingStatus === 'INSUFFICIENT' ? '부족' : '기준 없음'}
				</p>
			{/if}

			<div class="sec">
				<div class="sec-h">
					<h3>참여자</h3>
					{#if !isPast}<button class="link b" onclick={() => (editing = !editing)}>{editing ? '취소' : '바꾸기'}</button>{/if}
				</div>
				{#if !editing}
					<div class="rows">
						{#each work.workRequests || work.workers || [] as r (r.workRequestId ?? r.ticketId)}
							<div class="row">
								<div class="avatar">{r.alias?.slice(1)}</div>
								<div class="main">
									<div class="t">{r.alias}</div>
									{#if r.reason}<div class="s">사유: {r.reason}</div>{/if}
								</div>
								{#if r.status}<span class="pill {statusPillClass(r.status)}">{WORK_REQUEST_STATUS[r.status]}</span>{/if}
							</div>
						{:else}
							<div class="empty">참여자가 없어요</div>
						{/each}
					</div>
				{:else}
					<div class="rank">
						{#each employees as p (p.ticketId)}
							<button class={selected.includes(p.ticketId) ? 'on' : ''} onclick={() => toggle(p.ticketId)}>
								<span class="avatar">{p.alias?.slice(1)}</span>
								<span class="main"><span class="t">{p.alias}</span></span>
							</button>
						{/each}
					</div>
					{#if err}<p class="f err">{err}</p>{/if}
					<button class="btn p w" style="margin-top:12px" disabled={saving} onclick={saveParticipants}>저장</button>
				{/if}
			</div>
		{/if}
	{/snippet}
	{#snippet foot()}
		{#if work && !isPast}
			<button class="btn d" onclick={onDelete}>근무 빼기</button>
		{/if}
		<button class="btn p" onclick={closeDrawer}>닫기</button>
	{/snippet}
</DrawerShell>
