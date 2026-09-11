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
			const store = await createStore({ name: name.trim(), tel: tel.trim(), pos: pos.trim() });
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
			// TicketResponse에는 storeId가 없어서, 방금 발급된 alias/직무만으로는 storeId를 못 얻는다.
			// 그래서 가입 직후엔 매장 홈으로 보내는 대신 안내만 하고, storeId 입력을 한 번 더 받는다.
			showToast('가입됐어요');
			err = '가입은 됐어요. 매장 관리자에게 매장 번호(storeId)를 확인해 아래에 입력해 주세요.';
			needsStoreId = true;
		} catch (e) {
			err = e?.message || '초대코드가 올바르지 않아요';
		} finally {
			loading = false;
		}
	}

	let needsStoreId = $state(false);
	let manualStoreId = $state('');
	async function confirmStoreId() {
		if (!manualStoreId) return;
		loading = true;
		try {
			await session.selectStore(Number(manualStoreId));
			await goto(get(isOwner) ? '/owner/today' : '/staff/today');
		} catch (e) {
			err = e?.message || '매장을 찾을 수 없어요';
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
			{:else if !needsStoreId}
				<div class="f"><label>초대코드</label><input bind:value={inviteCode} placeholder="점주에게 받은 코드" /></div>
				<button class="btn p w" disabled={loading} onclick={submitJoin}>참여하기</button>
			{:else}
				<div class="f">
					<label for="manualStoreId">매장 번호 (storeId)</label>
					<input id="manualStoreId" bind:value={manualStoreId} inputmode="numeric" />
				</div>
				<button class="btn p w" disabled={loading} onclick={confirmStoreId}>들어가기</button>
			{/if}

			{#if err}<p class="f err" style="margin-top:8px">{err}</p>{/if}
		</div>
	</div>
</div>
