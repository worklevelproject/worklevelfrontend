<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { createStore, getMyTickets } from '$lib/api/store.js';
	import { session, isOwner } from '$lib/stores/session.js';
	import { setActing } from '$lib/api/acting.js';
	import { showToast } from '$lib/stores/toast.js';
	import { get } from 'svelte/store';

	const JOB_ROLE_LABEL = { OWNER: '점주', MANAGER: '매니저', STAFF: '직원' };

	/** @type {{ticketId:number, storeId:number, storeName:string, jobRole:string, alias:string}[]} */
	let tickets = $state([]);
	let loadingTickets = $state(true);
	let enteringTicketId = $state(/** @type {number | null} */ (null));

	let name = $state('');
	let tel = $state('');
	let pos = $state('');
	let loading = $state(false);
	let err = $state('');

	onMount(async () => {
		try {
			tickets = await getMyTickets();
		} finally {
			loadingTickets = false;
		}
	});

	/** 기존에 가지고 있던 매장/역할(티켓)을 그대로 이어서 들어간다 — 새로 만들거나
	 * 참여하는 것과 달리 이미 발급된 티켓을 골라 계승하는 경로. */
	async function enterTicket(ticket) {
		enteringTicketId = ticket.ticketId;
		err = '';
		try {
			// "매장 전환"으로 온 경우 테스트 멤버 대리 접근은 끊고 고른 티켓 본인으로 들어간다
			setActing(null);
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
</script>

<svelte:head><title>매장 연결 · WORKLEVEL</title></svelte:head>

<div class="login">
	<div class="l">
		<div class="mark">WORKLEVEL</div>
		{#if tickets.length}
			<h1>어디로<br />들어갈까요?</h1>
			<p>기존에 있던 매장으로 들어가거나, 새 매장을 만들 수 있어요.</p>
		{:else}
			<h1>매장을 만들어요</h1>
			<p>매장을 만들면 직원 화면을 써볼 수 있는 테스트 멤버 5명이 함께 만들어져요.</p>
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
			<h3 style="margin-bottom:16px">매장 만들기 (점주)</h3>
				<div class="f"><label>매장 이름</label><input bind:value={name} placeholder="성수 블렌드" /></div>
				<div class="f"><label>전화</label><input bind:value={tel} placeholder="02-000-0000" /></div>
				<div class="f"><label>주소</label><input bind:value={pos} placeholder="서울 성동구 ..." /></div>
				<button class="btn p w" disabled={loading} onclick={submitCreate}>매장 만들기</button>

			{#if err}<p class="f err" style="margin-top:8px">{err}</p>{/if}
		</div>
	</div>
</div>
