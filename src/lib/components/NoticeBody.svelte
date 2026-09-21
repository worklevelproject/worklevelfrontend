<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import {
		getNotice,
		applyWorkProposal,
		getNoticeComments,
		createNoticeComment,
		updateNoticeComment
	} from '$lib/api/notice.js';
	import { showToast } from '$lib/stores/toast.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { fmt, toHM, rel } from '$lib/utils/date.js';
	import { TIME_TYPE } from '$lib/utils/labels.js';

	/** 공지 하나를 펼쳤을 때 보이는 본문 영역: 근무 제안 슬롯(선착순 지원)과 댓글/답글.
	 * @type {{notice: any, canApply?: boolean}} */
	let { notice, canApply = false } = $props();

	let slots = $state(/** @type {any[]} */ ([]));
	let comments = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	let applyingSlotId = $state(/** @type {number | null} */ (null));

	let text = $state('');
	let replyTo = $state(/** @type {any} */ (null)); // 답글 대상 댓글
	let editing = $state(/** @type {any} */ (null)); // 수정 중인 내 댓글
	let sending = $state(false);

	const isProposal = $derived(notice.type === 'WORK_PROPOSAL');

	async function loadSlots() {
		if (!isProposal) return;
		const detail = await getNotice($session.storeId, notice.id);
		slots = detail.slots ?? [];
	}
	async function loadComments() {
		comments = (await getNoticeComments($session.storeId, notice.id))?.content ?? [];
	}

	onMount(async () => {
		try {
			await Promise.all([loadSlots(), loadComments()]);
		} catch (e) {
			showToast(e?.message || '불러오기에 실패했어요');
		} finally {
			loading = false;
		}
	});

	function apply(slot) {
		confirmBox('이 근무에 지원할까요?', '선착순이고, 지원하면 바로 내 근무로 확정돼요.', '지원하기', async () => {
			applyingSlotId = slot.slotId;
			try {
				await applyWorkProposal($session.storeId, notice.id, slot.slotId);
				showToast('지원했어요 · 내 근무로 확정됐어요');
			} catch (e) {
				showToast(e?.message || '지원하지 못했어요');
			} finally {
				applyingSlotId = null;
				loadSlots().catch(() => {});
			}
		});
	}

	function startReply(c) {
		editing = null;
		replyTo = c;
		text = '';
	}
	function startEdit(c) {
		replyTo = null;
		editing = c;
		text = c.content;
	}
	function cancelInput() {
		replyTo = null;
		editing = null;
		text = '';
	}

	async function send() {
		const content = text.trim();
		if (!content) return;
		sending = true;
		try {
			if (editing) {
				await updateNoticeComment($session.storeId, notice.id, editing.id, { content });
			} else {
				await createNoticeComment($session.storeId, notice.id, {
					content,
					replyToCommentId: replyTo?.id
				});
			}
			cancelInput();
			await loadComments();
		} catch (e) {
			showToast(e?.message || '댓글을 남기지 못했어요');
		} finally {
			sending = false;
		}
	}

	const stop = (e) => e.stopPropagation();
</script>

<!-- 공지 행의 클릭(펼치기/접기)이 이 영역 안에서 새지 않도록 막는다 -->
<div role="presentation" onclick={stop} onkeydown={stop} style="margin-top:12px;cursor:default">
	{#if loading}
		<div class="tiny muted">불러오는 중…</div>
	{:else}
		{#if isProposal}
			<div class="f" style="margin-bottom:12px">
				<label>근무 제안 (선착순)</label>
				{#each slots as sl (sl.slotId)}
					{@const full = sl.appliedCount >= sl.capacity}
					<div class="row">
						<div class="main">
							<div class="t">{fmt(sl.startTime.slice(0, 10))} <span class="num">{toHM(sl.startTime)}–{toHM(sl.endTime)}</span> · {TIME_TYPE[sl.timeType] ?? '보통'}</div>
							<div class="s">{sl.appliedCount}/{sl.capacity}명 지원</div>
						</div>
						{#if canApply}
							{#if sl.applied}
								<span class="pill ok">지원함</span>
							{:else}
								<button class="btn p sm" disabled={full || applyingSlotId !== null} onclick={() => apply(sl)}>{full ? '마감' : '지원하기'}</button>
							{/if}
						{/if}
					</div>
				{:else}
					<div class="tiny muted">근무 칸이 없어요</div>
				{/each}
			</div>
		{/if}

		<div class="f" style="margin:0">
			<label>댓글 {comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)}</label>
			{#each comments as c (c.id)}
				<div style="padding:6px 0">
					{@render commentRow(c)}
					{#each c.replies ?? [] as r (r.id)}
						<div style="margin-left:20px;margin-top:4px">{@render commentRow(r)}</div>
					{/each}
				</div>
			{:else}
				<div class="tiny muted">첫 댓글을 남겨보세요</div>
			{/each}

			{#if replyTo || editing}
				<div class="tiny muted" style="margin-top:6px">
					{editing ? '댓글 수정 중' : `@${replyTo.writer.alias} 에게 답글`}
					<button class="link b" onclick={cancelInput}>취소</button>
				</div>
			{/if}
			<div class="inline" style="margin-top:6px">
				<input bind:value={text} maxlength="1000" placeholder="댓글 쓰기" onkeydown={(e) => e.key === 'Enter' && !e.isComposing && send()} />
				<button class="btn p sm" disabled={sending || !text.trim()} onclick={send}>{editing ? '수정' : '남기기'}</button>
			</div>
		</div>
	{/if}
</div>

{#snippet commentRow(c)}
	<div class="tiny muted">{c.writer.alias}{c.mine ? ' (나)' : ''} · {rel(c.createdAt.slice(0, 10))} {toHM(c.createdAt)}{c.updatedAt !== c.createdAt ? ' · 수정됨' : ''}</div>
	<div style="white-space:pre-line">{#if c.replyTo}<b>@{c.replyTo.writer.alias}</b> {/if}{c.content}</div>
	<div>
		<button class="link b" onclick={() => startReply(c)}>답글</button>
		{#if c.mine}<button class="link b" onclick={() => startEdit(c)}>수정</button>{/if}
	</div>
{/snippet}
