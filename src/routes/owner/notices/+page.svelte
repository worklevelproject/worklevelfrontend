<script>
	import { mock, deleteNotice } from '$lib/stores/mock.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';
	import NoticeDrawer from '$lib/components/drawers/NoticeDrawer.svelte';

	let tab = $state('notice');
	let openId = $state(/** @type {number | null} */ (null));

	function onDelete(id) {
		confirmBox('공지를 지울까요?', '직원 화면에서도 사라져요.', '지우기', () => {
			deleteNotice(id);
			showToast('지웠어요');
		}, true);
	}
</script>

<svelte:head><title>공지 · 인수인계 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">백엔드에 공지 전용 도메인이 아직 없어요 (교육자료는 레시피 메뉴에서 관리)<span class="mock-badge">목업</span></div>
		<h1>공지 · 인수인계</h1>
	</div>
	<div class="acts">
		<div class="seg lg">
			<button class={tab === 'notice' ? 'on' : ''} onclick={() => (tab = 'notice')}>공지 {$mock.notices.length}</button>
			<button class={tab === 'handover' ? 'on' : ''} onclick={() => (tab = 'handover')}>마감 노트 {$mock.handovers.length}</button>
		</div>
		{#if tab === 'notice'}<button class="btn p" onclick={() => openDrawer(NoticeDrawer)}>공지 쓰기</button>{/if}
	</div>
</div>

{#if tab === 'notice'}
	<div class="card w" style="max-width:820px;padding:4px 20px">
		{#each $mock.notices as n (n.id)}
			<div class="notice" role="button" tabindex="0" onclick={() => (openId = openId === n.id ? null : n.id)} onkeydown={(e) => e.key === 'Enter' && (openId = openId === n.id ? null : n.id)}>
				<div class="main">
					<div class="t">{n.pin ? '[필독] ' : ''}{n.title}</div>
					<div class="s">{n.by} · {n.at} · 읽음 {n.readTicketIds.length}명</div>
					{#if openId === n.id}<div class="b">{n.body}</div>{/if}
				</div>
				<button class="btn d sm" onclick={(e) => { e.stopPropagation(); onDelete(n.id); }}>삭제</button>
			</div>
		{:else}
			<div class="empty">공지가 없어요</div>
		{/each}
	</div>
{:else}
	<div class="card w" style="max-width:820px;padding:4px 20px">
		{#each $mock.handovers as h (h.id)}
			<div class="notice" style="cursor:default">
				<div class="avatar" style="width:32px;height:32px;font-size:11px">{h.by.slice(1)}</div>
				<div class="main">
					<div class="t">{h.by} <span class="muted tiny">· {h.at} · 사진 {h.photos}장</span></div>
					<div class="b">{h.text}</div>
				</div>
			</div>
		{:else}
			<div class="empty">아직 없어요</div>
		{/each}
	</div>
{/if}
