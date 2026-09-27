<script>
	import { session } from '$lib/stores/session.js';
	import { getHandOver } from '$lib/api/handover.js';
	import { showToast } from '$lib/stores/toast.js';
	import { rel, toHM } from '$lib/utils/date.js';

	/** 인수인계 목록. 행을 누르면 상세를 조회하는데, 백엔드가 그 시점에 읽음으로 기록하고 읽은 사람 목록
	 * (read.readers)을 준다. 목록 응답엔 read.readCount/readCheck만 있다.
	 * @type {{items: any[], showUnread?: boolean}} */
	let { items, showUnread = false } = $props();

	let openId = $state(/** @type {number | null} */ (null));
	/** 펼쳐 본 인수인계의 읽은 사람 {ticketId, alias, readAt} */
	let readers = $state(/** @type {Record<number, any[]>} */ ({}));

	async function toggle(h) {
		openId = openId === h.id ? null : h.id;
		if (openId !== h.id) return;
		try {
			const detail = await getHandOver($session.storeId, h.id);
			readers[h.id] = detail.read?.readers ?? [];
			if (detail.read) h.read = detail.read; // 목록의 읽음 수·안 읽음 표시를 새로고침 없이 맞춘다
		} catch (e) {
			showToast(e?.message || '불러오지 못했어요');
		}
	}
</script>

{#each items as h (h.id)}
	<div class="notice" role="button" tabindex="0" onclick={() => toggle(h)} onkeydown={(e) => e.key === 'Enter' && toggle(h)}>
		<div class="avatar" style="width:32px;height:32px;font-size:11px">{h.writer.alias.slice(1)}</div>
		<div class="main">
			<div class="t">
				{#if showUnread && h.read && !h.read.readCheck}<span class="pill bad">안 읽음</span> {/if}{h.writer.alias}
				<span class="muted tiny">· {rel(h.createdAt.slice(0, 10))} {toHM(h.createdAt)}{h.read ? ` · 읽음 ${h.read.readCount}명` : ''}</span>
			</div>
			<div class="b">{h.content}</div>
			{#if openId === h.id}
				<div class="tiny muted" style="margin-top:8px">
					{#if readers[h.id]}
						읽은 사람:
						{#each readers[h.id] as r, i (r.ticketId)}{i ? ', ' : ''}{r.alias}{r.ticketId === $session.ticketId ? ' (나)' : ''} <span class="num">{rel(r.readAt.slice(0, 10))} {toHM(r.readAt)}</span>{:else}아직 없어요{/each}
					{:else}
						불러오는 중…
					{/if}
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="empty">아직 없어요</div>
{/each}
