<script>
	import GroupTabs from '$lib/components/GroupTabs.svelte';

	let { children } = $props();

	// URL은 그대로 두고 v8 프로토타입의 "매장" 메뉴(할 일+공지·인수인계+레시피+매출 탭)를
	// 재현한다. recipes/[id] 편집·상세 화면은 tabs 목록에 없으므로 탭 스트립이 자동으로 숨는다.
	const TABS = [
		['/owner/tasks', '할 일'],
		['/owner/notices', '공지 · 인수인계'],
		['/owner/recipes', '레시피'],
		['/owner/sales', '매출']
	];
</script>

<GroupTabs tabs={TABS} />
{@render children()}
