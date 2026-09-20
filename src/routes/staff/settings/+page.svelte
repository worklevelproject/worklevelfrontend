<script>
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';
	import { mock } from '$lib/stores/mock.js';
	import { logout } from '$lib/api/auth.js';
	import { withdraw } from '$lib/api/member.js';
	import { confirmBox } from '$lib/stores/confirm.js';

	const SEC = [
		['account', '계정'],
		['notif', '알림'],
		['privacy', '내 기록 · 공개 범위']
	];
	let sec = $state('account');

	function tog(obj, key) {
		obj[key] = !obj[key];
	}

	function onWithdraw() {
		confirmBox('계정을 탈퇴할까요?', '확인된 경력과 모든 기록이 지워지고 되돌릴 수 없어요.', '탈퇴', async () => {
			await withdraw();
			session.clear();
			await goto('/login');
		}, true);
	}
	async function doLogout() {
		await logout();
		session.clear();
		await goto('/login');
	}
</script>

<svelte:head><title>설정 · WORKLEVEL</title></svelte:head>

<div class="hdr"><div><div class="eyebrow">{$session.alias}</div><h1>설정</h1></div></div>

<div style="display:grid;grid-template-columns:200px minmax(0,1fr);gap:32px;align-items:start">
	<div class="setnav">
		{#each SEC as [k, l] (k)}<button class={sec === k ? 'on' : ''} onclick={() => (sec = k)}>{l}</button>{/each}
	</div>
	<div class="card w" style="padding:24px 28px">
		{#if sec === 'account'}
			<h3 style="margin-bottom:16px">계정</h3>
			<div class="setrow"><div><div class="t">로그아웃</div></div><button class="btn o sm" onclick={doLogout}>로그아웃</button></div>
			{#if $session.acting}
				<div class="note">테스트 멤버로 보는 중이라 계정 탈퇴는 숨겼어요. 탈퇴는 점주 본인 계정에만 적용돼요.</div>
			{:else}
				<div class="setrow"><div><div class="t">계정 탈퇴</div></div><button class="btn d sm" onclick={onWithdraw}>탈퇴</button></div>
			{/if}
		{:else if sec === 'notif'}
			<h3 style="margin-bottom:16px">알림<span class="mock-badge">목업</span></h3>
			{#each [['shiftReply', '새 근무 배정'], ['taskDone', '새 할 일'], ['recipeSeen', '레시피 바뀜'], ['docExpiry', '서류 만료']] as [k, l] (k)}
				<div class="setrow"><div><div class="t">{l}</div></div><button class="toggle {$mock.notifSettings[k] ? 'on' : ''}" onclick={() => tog($mock.notifSettings, k)}></button></div>
			{/each}
		{:else if sec === 'privacy'}
			<h3 style="margin-bottom:16px">내 기록 · 공개 범위</h3>
			<div class="note">
				그만둘 때 사장님이 정리한 근무 기록을 확인하고, 다음 매장에 보여줄지 매장별로 고를 수 있는 흐름은 아직 백엔드에 없어요(퇴사 시점 평판 확정 절차 미구현).
				<span class="mock-badge">미구현</span>
			</div>
		{/if}
	</div>
</div>
