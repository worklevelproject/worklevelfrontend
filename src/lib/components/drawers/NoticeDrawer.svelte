<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { addNotice } from '$lib/stores/mock.js';

	let title = $state('');
	let body = $state('');
	let pin = $state(false);
	let err = $state('');

	function submit() {
		if (!title.trim()) return (err = '제목을 적어 주세요');
		addNotice(title.trim(), body.trim(), pin);
		showToast('보냈어요');
		closeDrawer();
	}
</script>

<DrawerShell title="공지 쓰기">
	{#snippet children()}
		<p class="tiny muted" style="margin:-4px 0 16px">
			백엔드에 공지 전용 도메인이 아직 없어서, 이 화면은 <b>이 브라우저에만</b> 저장되는 목업이에요.<span class="mock-badge">목업</span>
		</p>
		<div class="f"><label>제목</label><input bind:value={title} placeholder="예: 신메뉴 출시 · 레시피 확인 필수" autofocus /></div>
		<div class="f"><label>내용</label><textarea bind:value={body} style="height:140px" placeholder="직원에게 전할 말"></textarea></div>
		<div class="setrow">
			<div>
				<div class="t">꼭 읽기</div>
				<div class="s">직원 첫 화면에 고정</div>
			</div>
			<button class="toggle {pin ? 'on' : ''}" onclick={() => (pin = !pin)}></button>
		</div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" onclick={submit}>보내기</button>
	{/snippet}
</DrawerShell>
