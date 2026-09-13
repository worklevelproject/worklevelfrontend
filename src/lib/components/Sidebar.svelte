<script>
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { session } from '$lib/stores/session.js';
	import { unreadCount } from '$lib/stores/notifications.js';

	/** @type {{owner: boolean}} */
	let { owner } = $props();

	// v8 프로토타입의 4메뉴(오늘/근무/직원/매장) 그대로 - 각 그룹 하위 화면은 URL은 그대로 두고
	// GroupTabs로 탭 전환된다(owner/(work|people|store)/+layout.svelte 참고).
	const OWNER_GROUPS = [
		['오늘', [['/owner/today', '오늘', 'home']]],
		[
			'근무',
			[
				['/owner/shifts', '근무표', 'cal'],
				['/owner/attendance', '출퇴근', 'clock']
			]
		],
		[
			'직원',
			[
				['/owner/staff', '직원', 'users'],
				['/owner/payroll', '급여', 'won'],
				['/owner/talent', '사람 구하기', 'search']
			]
		],
		[
			'매장',
			[
				['/owner/tasks', '할 일', 'check'],
				['/owner/notices', '공지 · 인수인계', 'bell'],
				['/owner/recipes', '레시피', 'cup'],
				['/owner/sales', '매출', 'won']
			]
		]
	];
	const STAFF_GROUPS = [
		[
			'내 근무',
			[
				['/staff/today', '오늘', 'home'],
				['/staff/schedule', '근무표', 'cal'],
				['/staff/avail', '다음 주 되는 시간', 'clock'],
				['/staff/tasks', '할 일', 'check'],
				['/staff/pay', '내 급여', 'won']
			]
		],
		[
			'매장',
			[
				['/staff/notices', '공지', 'bell'],
				['/staff/recipes', '레시피', 'cup'],
				['/staff/me', '내 정보', 'user']
			]
		]
	];

	const groups = $derived(owner ? OWNER_GROUPS : STAFF_GROUPS);
	const base = $derived(owner ? '/owner' : '/staff');
	const isOn = (href) => page.url.pathname === href || page.url.pathname.startsWith(href + '/');
</script>

<aside class="side">
	<div class="mark">WORKLEVEL</div>
	<button class="storebtn" disabled>
		<span class="ic">{$session.storeName?.slice(0, 2) || '매장'}</span>
		<span class="n">
			<b>{$session.storeName || '매장'}</b>
			<span>{owner ? '점주' : $session.alias}</span>
		</span>
	</button>
	{#each groups as [g, items] (g)}
		<div class="grp">{g}</div>
		<nav class="nav">
			{#each items as [href, label, icon] (href)}
				<a class={isOn(href) ? 'on' : ''} href={href}><Icon name={icon} />{label}</a>
			{/each}
		</nav>
	{/each}
	<div class="bottom">
		<nav class="nav">
			<a class={page.url.pathname === base + '/notifications' ? 'on' : ''} href={base + '/notifications'}>
				<Icon name="bell" />알림
				{#if $unreadCount}<span class="n">{$unreadCount}</span>{/if}
			</a>
			<a class={page.url.pathname === base + '/settings' ? 'on' : ''} href={base + '/settings'}>
				<Icon name="gear" />설정
			</a>
		</nav>
		<a class="me" href={base + '/settings'}>
			<span class="avatar">{owner ? '점주' : ($session.alias || '').slice(0, 2)}</span>
			<span class="n">
				<b>{owner ? '점주' : $session.alias}</b>
				<span>{$session.storeName}</span>
			</span>
		</a>
	</div>
</aside>

<style>
	.nav a {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 40px;
		padding: 0 12px;
		border-radius: 4px;
		font-weight: 500;
		color: var(--graphite);
		position: relative;
		text-decoration: none;
	}
	.nav a:hover {
		background: var(--ash);
		color: var(--carbon);
	}
	.nav a.on {
		background: var(--ash);
		color: var(--carbon);
	}
	.nav a.on::before {
		content: '';
		position: absolute;
		left: 0;
		top: 10px;
		bottom: 10px;
		width: 3px;
		border-radius: 2px;
		background: var(--blue);
	}
</style>
