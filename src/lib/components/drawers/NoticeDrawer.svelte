<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { createNotice, updateNotice } from '$lib/api/notice.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { TIME_TYPE } from '$lib/utils/labels.js';
	import { todayISO } from '$lib/utils/date.js';

	/** @type {{notice?: {id:number, title:string, content:string}, onDone?: () => void}} */
	let { notice, onDone } = $props();

	let title = $state(notice?.title || '');
	let body = $state(notice?.content || '');
	// 공지 종류와 근무 칸은 만들 때만 정한다(수정은 제목/내용만 가능)
	let type = $state('NORMAL');
	let slots = $state([newSlot()]);
	let saving = $state(false);
	let err = $state('');

	function newSlot() {
		return { date: todayISO(), startTime: '09:00', endTime: '18:00', timeType: 'OPEN', capacity: 1 };
	}
	function addSlot() {
		slots = [...slots, newSlot()];
	}
	function removeSlot(i) {
		slots = slots.filter((_, idx) => idx !== i);
	}

	async function submit() {
		if (!title.trim()) return (err = '제목을 적어 주세요');
		if (!notice && type === 'WORK_PROPOSAL' && !slots.length) return (err = '근무 칸을 하나 이상 넣어 주세요');
		saving = true;
		err = '';
		try {
			if (notice) {
				await updateNotice($session.storeId, notice.id, { title: title.trim(), content: body.trim() });
			} else {
				await createNotice($session.storeId, {
					title: title.trim(),
					content: body.trim(),
					type,
					slots:
						type === 'WORK_PROPOSAL'
							? slots.map((s) => ({
									startTime: `${s.date}T${s.startTime}:00`,
									endTime: `${s.date}T${s.endTime}:00`,
									timeType: s.timeType,
									capacity: Number(s.capacity) || 1
								}))
							: []
				});
			}
			showToast('보냈어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title={notice ? '공지 수정' : '공지 쓰기'}>
	{#snippet children()}
		{#if !notice}
			<div class="f">
				<label>종류</label>
				<div class="opts">
					<button class={type === 'NORMAL' ? 'on' : ''} onclick={() => (type = 'NORMAL')}>일반 공지</button>
					<button class={type === 'WORK_PROPOSAL' ? 'on' : ''} onclick={() => (type = 'WORK_PROPOSAL')}>근무 제안</button>
				</div>
			</div>
		{/if}
		<div class="f"><label>제목</label><input bind:value={title} placeholder="예: 신메뉴 출시 · 레시피 확인 필수" autofocus /></div>
		<div class="f"><label>내용</label><textarea bind:value={body} style="height:140px" placeholder="직원에게 전할 말"></textarea></div>
		{#if !notice && type === 'WORK_PROPOSAL'}
			<div class="f">
				<label>근무 칸 (먼저 지원한 직원이 바로 배정돼요)</label>
				{#each slots as s, i (i)}
					<div class="inline" style="margin-bottom:8px;flex-wrap:wrap">
						<input style="width:110px" bind:value={s.date} aria-label="날짜" />
						<input style="width:64px" bind:value={s.startTime} aria-label="시작" />
						<input style="width:64px" bind:value={s.endTime} aria-label="끝" />
						<select bind:value={s.timeType} aria-label="시간대">
							{#each ['OPEN', 'CLOSE'] as k (k)}<option value={k}>{TIME_TYPE[k]}</option>{/each}
						</select>
						<input style="width:56px" type="number" min="1" bind:value={s.capacity} aria-label="인원" />
						<span class="tiny muted">명</span>
						<button class="btn d sm" onclick={() => removeSlot(i)}>빼기</button>
					</div>
				{/each}
				<button class="btn s sm" onclick={addSlot}>+ 근무 칸 추가</button>
			</div>
		{/if}
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>보내기</button>
	{/snippet}
</DrawerShell>
