<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getNotices, deleteNotice } from '$lib/api/notice.js';
	import { getHandOvers } from '$lib/api/handover.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';
	import { rel, toHM } from '$lib/utils/date.js';
	import { createPagedList } from '$lib/utils/pagedList.svelte.js';
	import NoticeDrawer from '$lib/components/drawers/NoticeDrawer.svelte';

	let tab = $state('notice');
	let loading = $state(true);
	let error = $state('');
	let openId = $state(/** @type {number | null} */ (null));

	const notices = createPagedList((offset) => getNotices($session.storeId, offset));
	const handovers = createPagedList((offset) => getHandOvers($session.storeId, undefined, offset));

	async function load() {
		loading = true;
		error = '';
		try {
			await Promise.all([notices.load(), handovers.load()]);
		} catch (e) {
			error = e?.message || '불러오기에 실패했어요';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	function write() {
		openDrawer(NoticeDrawer, { onDone: load });
	}
	function edit(n) {
		openDrawer(NoticeDrawer, { notice: n, onDone: load });
	}
	function onDelete(id) {
		confirmBox('공지를 지울까요?', '직원 화면에서도 사라져요.', '지우기', async () => {
			await deleteNotice($session.storeId, id);
			showToast('지웠어요');
			load();
		}, true);
	}
</script>

<svelte:head><title>공지 · 인수인계 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">공지는 매장 전체에, 인수인계는 마감 근무 참여자가 남겨요</div>
		<h1>공지 · 인수인계</h1>
	</div>
	<div class="acts">
		<div class="seg lg">
			<button class={tab === 'notice' ? 'on' : ''} onclick={() => (tab = 'notice')}>공지 {notices.items.length}</button>
			<button class={tab === 'handover' ? 'on' : ''} onclick={() => (tab = 'handover')}>마감 노트 {handovers.items.length}</button>
		</div>
		{#if tab === 'notice'}<button class="btn p" onclick={write}>공지 쓰기</button>{/if}
	</div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else if error}
	<div class="empty">{error}</div>
{:else if tab === 'notice'}
	<div class="card w" style="max-width:820px;padding:4px 20px">
		{#each notices.items as n (n.id)}
			<div class="notice" role="button" tabindex="0" onclick={() => (openId = openId === n.id ? null : n.id)} onkeydown={(e) => e.key === 'Enter' && (openId = openId === n.id ? null : n.id)}>
				<div class="main">
					<div class="t">{n.title}</div>
					<div class="s">{n.writer.alias} · {rel(n.createdAt.slice(0, 10))} {toHM(n.createdAt)}</div>
					{#if openId === n.id}<div class="b">{n.content}</div>{/if}
				</div>
				<button class="btn s sm" onclick={(e) => { e.stopPropagation(); edit(n); }}>수정</button>
				<button class="btn d sm" onclick={(e) => { e.stopPropagation(); onDelete(n.id); }}>삭제</button>
			</div>
		{:else}
			<div class="empty">공지가 없어요</div>
		{/each}
		{#if notices.hasNext}<button class="btn s" style="margin-top:10px" onclick={notices.loadMore}>더보기</button>{/if}
	</div>
{:else}
	<div class="card w" style="max-width:820px;padding:4px 20px">
		{#each handovers.items as h (h.id)}
			<div class="notice" style="cursor:default">
				<div class="avatar" style="width:32px;height:32px;font-size:11px">{h.writer.alias.slice(1)}</div>
				<div class="main">
					<div class="t">{h.writer.alias} <span class="muted tiny">· {rel(h.createdAt.slice(0, 10))} {toHM(h.createdAt)}</span></div>
					<div class="b">{h.content}</div>
				</div>
			</div>
		{:else}
			<div class="empty">아직 없어요</div>
		{/each}
		{#if handovers.hasNext}<button class="btn s" style="margin-top:10px" onclick={handovers.loadMore}>더보기</button>{/if}
	</div>
{/if}
