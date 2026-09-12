<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { createNotice, updateNotice } from '$lib/api/notice.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';

	/** @type {{notice?: {id:number, title:string, content:string}, onDone?: () => void}} */
	let { notice, onDone } = $props();

	let title = $state(notice?.title || '');
	let body = $state(notice?.content || '');
	let saving = $state(false);
	let err = $state('');

	async function submit() {
		if (!title.trim()) return (err = '제목을 적어 주세요');
		saving = true;
		err = '';
		try {
			if (notice) {
				await updateNotice($session.storeId, notice.id, { title: title.trim(), content: body.trim() });
			} else {
				await createNotice($session.storeId, { title: title.trim(), content: body.trim() });
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
		<div class="f"><label>제목</label><input bind:value={title} placeholder="예: 신메뉴 출시 · 레시피 확인 필수" autofocus /></div>
		<div class="f"><label>내용</label><textarea bind:value={body} style="height:140px" placeholder="직원에게 전할 말"></textarea></div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>보내기</button>
	{/snippet}
</DrawerShell>
