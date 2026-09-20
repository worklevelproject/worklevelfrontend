<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.js';
	import { testMembers, loadTestMembers, rememberTestMember } from '$lib/stores/testMembers.js';
	import { refreshNotifications } from '$lib/stores/notifications.js';
	import { showToast } from '$lib/stores/toast.js';
	import { counterpartPath } from '$lib/utils/viewMap.js';

	let busyId = $state(/** @type {number | 'owner' | null} */ (null));

	// 테스트 멤버로 보는 중이어도 세션의 jobRole은 STAFF라, acting 여부로 "점주 본인"인지 판단한다
	// (대리 접근은 점주만 할 수 있다).
	const visible = $derived($session.jobRole === 'OWNER' || !!$session.acting);
	const actingTicketId = $derived($session.acting ? $session.ticketId : null);

	onMount(() => {
		if ($session.storeId) loadTestMembers($session.storeId);
	});

	async function toMember(m) {
		if (busyId !== null || actingTicketId === m.ticketId) return;
		busyId = m.ticketId;
		try {
			await session.enterActing(m);
			rememberTestMember($session.storeId, m.ticketId);
			refreshNotifications();
			await goto(counterpartPath(page.url.pathname, 'staff'));
		} catch (e) {
			showToast(e?.message || '테스트 멤버로 들어가지 못했어요');
		} finally {
			busyId = null;
		}
	}
	async function toOwner() {
		if (busyId !== null || !$session.acting) return;
		busyId = 'owner';
		try {
			await session.exitActing();
			refreshNotifications();
			await goto(counterpartPath(page.url.pathname, 'owner'));
		} catch (e) {
			showToast(e?.message || '점주 화면으로 돌아가지 못했어요');
		} finally {
			busyId = null;
		}
	}
</script>

{#if visible}
	<div class="vsw" aria-label="보는 사람 전환">
		<div class="lbl">보는 사람</div>
		<button class="chip {$session.acting ? '' : 'on'}" disabled={busyId !== null} onclick={toOwner}>점주 (나)</button>
		{#each $testMembers as m (m.ticketId)}
			<button class="chip {actingTicketId === m.ticketId ? 'on' : ''}" disabled={busyId !== null} onclick={() => toMember(m)}>{m.alias}</button>
		{:else}
			<div class="tiny muted" style="padding:2px 4px">테스트 멤버가 없어요</div>
		{/each}
	</div>
{/if}

<style>
	.vsw {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 10px 12px 12px;
		margin: 0 0 8px;
		border-bottom: 1px solid var(--cloud);
	}
	.lbl {
		width: 100%;
		font-size: 11px;
		color: var(--pewter);
		font-weight: 500;
	}
	.chip {
		height: 28px;
		padding: 0 10px;
		border-radius: 14px;
		background: var(--ash);
		color: var(--graphite);
		font-size: 12px;
		font-weight: 500;
		transition: background-color var(--t), color var(--t);
	}
	.chip:hover:not(:disabled) {
		color: var(--carbon);
	}
	.chip.on {
		background: var(--carbon);
		color: #fff;
	}
	.chip:disabled {
		opacity: 0.6;
	}
</style>
