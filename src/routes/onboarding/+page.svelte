<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { createStore, getMyTickets, joinStore } from '$lib/api/store.js';
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
	let inviteCode = $state('');
	let joining = $state(false);
	let joinErr = $state('');

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

	/** 직원 시작 경로: 점주에게 받은 초대 코드로 매장에 들어간다 */
	async function submitJoin() {
		if (!inviteCode.trim()) return (joinErr = '초대 코드를 입력해 주세요');
		joining = true;
		joinErr = '';
		try {
			setActing(null);
			const t = await joinStore(inviteCode.trim());
			await session.selectStore(t.storeId);
			showToast('매장에 들어왔어요');
			// 직원은 개인정보 수집·이용 동의와 기본 정보 입력부터 거친다
			await goto(t.jobRole === 'OWNER' ? '/owner/today' : '/staff/welcome');
		} catch (e) {
			joinErr = e?.status === 404 ? '맞는 초대 코드가 없어요' : e?.message || '참여하지 못했어요';
		} finally {
			joining = false;
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

<!-- 시작 화면: 왼쪽 검은 소개 패널 없이 한 화면에 내 매장 / 직원 참여 / 매장 만들기를 보여준다 -->
<div class="onb">
	<div class="onb-h">
		<div class="mark">WORKLEVEL</div>
		<h1>{tickets.length ? '어디로 들어갈까요?' : '시작해 볼까요?'}</h1>
		<p class="muted">{tickets.length ? '기존 매장으로 들어가거나, 초대 코드로 참여하거나, 새 매장을 만들 수 있어요.' : '직원이면 점주에게 받은 초대 코드로 참여하고, 점주면 매장을 만들어요.'}</p>
	</div>
	<div class="onb-g">
		{#if !loadingTickets && tickets.length}
			<div class="card w">
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

		<div class="card w">
			<h3 style="margin-bottom:16px">초대 코드로 참여 (직원)</h3>
			<div class="f"><label for="invite">초대 코드</label><input id="invite" bind:value={inviteCode} placeholder="점주에게 받은 코드" onkeydown={(e) => e.key === 'Enter' && !e.isComposing && submitJoin()} /></div>
			<button class="btn p w" disabled={joining} onclick={submitJoin}>참여하기</button>
			{#if joinErr}<p class="f err" style="margin-top:8px">{joinErr}</p>{/if}
		</div>

		<div class="card w">
			<h3 style="margin-bottom:16px">매장 만들기 (점주)</h3>
			<div class="f"><label for="sname">매장 이름</label><input id="sname" bind:value={name} placeholder="성수 블렌드" /></div>
			<div class="f"><label for="stel">전화</label><input id="stel" bind:value={tel} placeholder="02-000-0000" /></div>
			<div class="f"><label for="saddr">주소</label><input id="saddr" bind:value={pos} placeholder="서울 성동구 ..." /></div>
			<button class="btn p w" disabled={loading} onclick={submitCreate}>매장 만들기</button>
			<p class="tiny muted" style="margin-top:8px">매장을 만들면 직원 화면을 써볼 수 있는 테스트 멤버 5명이 함께 만들어져요.</p>
			{#if err}<p class="f err" style="margin-top:8px">{err}</p>{/if}
		</div>
	</div>
</div>
