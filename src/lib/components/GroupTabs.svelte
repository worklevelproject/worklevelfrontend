<script>
	import { page } from '$app/state';

	/** @type {{tabs: [string, string][]}} 그룹 목록 화면 탭 스트립. 소속 화면(tabs의 href)일 때만
	 * 보이고, 그 아래 상세/편집 라우트에서는 자동으로 숨는다. */
	let { tabs } = $props();

	const showTabs = $derived(tabs.some(([href]) => href === page.url.pathname));
</script>

{#if showTabs}
	<div class="seg lg" style="margin-bottom:20px">
		{#each tabs as [href, label] (href)}
			<a class={page.url.pathname === href ? 'on' : ''} href={href}>{label}</a>
		{/each}
	</div>
{/if}

<style>
	.seg a {
		height: 32px;
		padding: 0 16px;
		border-radius: 3px;
		color: var(--pewter);
		font-size: 14px;
		font-weight: 500;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: background-color var(--t), color var(--t);
	}
	.seg a.on {
		background: var(--white);
		color: var(--carbon);
	}
</style>
