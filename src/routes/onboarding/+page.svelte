<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { createStore, joinByInviteCode, getMyTickets } from '$lib/api/store.js';
	import { session, isOwner } from '$lib/stores/session.js';
	import { showToast } from '$lib/stores/toast.js';
	import { get } from 'svelte/store';

	const JOB_ROLE_LABEL = { OWNER: '점주', MANAGER: '매니저', STAFF: '직원' };

	/** @type {{ticketId:number, storeId:number, storeName:string, jobRole:string, alias:string}[]} */
	let tickets = $state([]);
	let loadingTickets = $state(true);
	let enteringTicketId = $state(/** @type {number | null} */ (null));

	let tab = $state('create');
	let name = $state('');
	let tel = $state('');
	let pos = $state('');
	let inviteCode = $state('');
	let loading = $state(false);
	let err = $state('');

	onMount(async () => {
		try {
			tickets = await getMyTickets();
		} finally {
			loadingTickets = false;
		}
	});

	/** 기존에 가지고 있던 매장/역할(티켓)을 그대로 이어서 들어간다 — 새로 만들거나 초대코드로
	 * 참여하는 것과 달리 이미 발급된 티켓을 골라 계승하는 경로. */
	async function enterTicket(ticket) {
		enteringTicketId = ticket.ticketId;
		err = '';
		try {
			await session.selectStore(ticket.storeId);
			await goto(ticket.jobRole === 'OWNER' ? '/owner/today' : '/staff/today');
		} catch (e) {
			err = e?.message || '입장에 실패했어요';
		} finally {
			enteringTicketId = null;
		}
	}

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
		{#if tickets.length}
			<h1>어디로<br />들어갈까요?</h1>
			<p>기존에 있던 매장으로 들어가거나, 새 매장을 만들거나 초대코드로 참여할 수 있어요.</p>
		{:else}
			<h1>매장을 만들거나<br />초대코드로 들어가요</h1>
			<p>점주면 매장을 새로 만들고, 직원이면 점주에게 받은 초대코드로 들어가요.</p>
		{/if}
	</div>
	<div class="r">
		{#if !loadingTickets && tickets.length}
			<div class="box" style="margin-bottom:20px">
				<h3 style="margin-bottom:12px">내 매장</h3>
				{#each tickets as t (t.ticketId)}
					<button
						class="setrow"
						style="width:100%;text-align:left;cursor:pointer;background:none;border:0"
						disabled={enteringTicketId !== null}
						onclick={() => enterTicket(t)}
					>
						<div>
							<div class="t">{t.storeName}</div>
							<div class="s">{JOB_ROLE_LABEL[t.jobRole] || t.jobRole} · {t.alias}</div>
						</div>
						{#if enteringTicketId === t.ticketId}<span class="tiny muted">들어가는 중…</span>{/if}
					</button>
				{/each}
			</div>
		{/if}

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
