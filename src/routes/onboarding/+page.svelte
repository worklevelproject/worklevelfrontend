<script>
	import { goto } from '$app/navigation';
	import { createStore, joinByInviteCode } from '$lib/api/store.js';
	import { session, isOwner } from '$lib/stores/session.js';
	import { showToast } from '$lib/stores/toast.js';
	import { get } from 'svelte/store';

	let tab = $state('create');
	let name = $state('');
	let tel = $state('');
	let pos = $state('');
	let inviteCode = $state('');
	let loading = $state(false);
	let err = $state('');

	async function submitCreate() {
		if (!name.trim()) return (err = '매장 이름을 입력해 주세요');
		loading = true;
		err = '';
		try {
			const store = await createStore({ name: name.trim(), tel: tel.trim(), address: pos.trim() });
			await session.selectStore(store.id);
			showToast('매장을 만들었어요');
			await goto('/owner/today');
		} catch (e) {
			err = e?.message || '매장 생성에 실패했어요';
		} finally {
			loading = false;
		}
	}

	async function submitJoin() {
		if (!inviteCode.trim()) return (err = '초대코드를 입력해 주세요');
		loading = true;
		err = '';
		try {
			const ticket = await joinByInviteCode(inviteCode.trim());
			await session.selectStore(ticket.storeId);
			showToast('가입됐어요');
			await goto(get(isOwner) ? '/owner/today' : '/staff/today');
		} catch (e) {
			err = e?.message || '초대코드가 올바르지 않아요';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>매장 연결 · WORKLEVEL</title></svelte:head>

<div class="login">
	<div class="l">
		<div class="mark">WORKLEVEL</div>
		<h1>매장을 만들거나<br />초대코드로 들어가요</h1>
		<p>점주면 매장을 새로 만들고, 직원이면 점주에게 받은 초대코드로 들어가요.</p>
	</div>
	<div class="r">
		<div class="box">
			<div class="seg lg" style="margin-bottom:20px">
				<button class={tab === 'create' ? 'on' : ''} onclick={() => (tab = 'create')}>매장 만들기 (점주)</button>
				<button class={tab === 'join' ? 'on' : ''} onclick={() => (tab = 'join')}>초대코드로 참여 (직원)</button>
			</div>

			{#if tab === 'create'}
				<div class="f"><label>매장 이름</label><input bind:value={name} placeholder="성수 블렌드" /></div>
				<div class="f"><label>전화</label><input bind:value={tel} placeholder="02-000-0000" /></div>
				<div class="f"><label>주소</label><input bind:value={pos} placeholder="서울 성동구 ..." /></div>
				<button class="btn p w" disabled={loading} onclick={submitCreate}>매장 만들기</button>
			{:else}
				<div class="f"><label>초대코드</label><input bind:value={inviteCode} placeholder="점주에게 받은 코드" /></div>
				<button class="btn p w" disabled={loading} onclick={submitJoin}>참여하기</button>
			{/if}

			{#if err}<p class="f err" style="margin-top:8px">{err}</p>{/if}
		</div>
	</div>
</div>
