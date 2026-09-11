<script>
	import { onMount, onDestroy } from 'svelte';
	import Icon from './Icon.svelte';
	import { notifications, unreadCount, refreshNotifications } from '$lib/stores/notifications.js';
	import { logout } from '$lib/api/auth.js';
	import { session } from '$lib/stores/session.js';
	import { goto } from '$app/navigation';

	/** @type {{title: string}} */
	let { title } = $props();

	let showNotif = $state(false);
	let now = $state(new Date());
	let timer;
	onMount(() => {
		timer = setInterval(() => (now = new Date()), 30000);
	});
	onDestroy(() => clearInterval(timer));

	const DOW = ['일', '월', '화', '수', '목', '금', '토'];
	const dateLabel = $derived(
		`${now.getMonth() + 1}월 ${now.getDate()}일 ${DOW[now.getDay()]} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
	);

	async function doLogout() {
		await logout();
		session.clear();
		await goto('/login');
	}
</script>

<header class="top">
	<span class="crumb">{title}</span>
	<span class="tiny muted" style="margin-left:8px">{dateLabel}</span>
	<span class="sp"></span>
	<div style="position:relative">
		<button
			class="iconbtn"
			aria-label="알림"
			onclick={() => {
				showNotif = !showNotif;
				if (showNotif) refreshNotifications();
			}}
		>
			<Icon name="bell" />
			{#if $unreadCount}<span class="n">{$unreadCount}</span>{/if}
		</button>
		<div class="pop" class:show={showNotif}>
			<div class="ph"><b>알림</b></div>
			{#each $notifications.slice(0, 6) as n (n.alarmTargetId)}
				<div class="notif" class:read={n.readCheck}>
					<span class="dot"></span>
					<span class="main">
						<div class="t">{n.title}</div>
					</span>
				</div>
			{:else}
				<div class="empty">알림이 없어요</div>
			{/each}
		</div>
	</div>
	<a class="iconbtn" aria-label="설정" href={($session.jobRole === 'OWNER' ? '/owner' : '/staff') + '/settings'}>
		<Icon name="gear" />
	</a>
	<button class="btn s sm" onclick={doLogout}>로그아웃</button>
</header>
