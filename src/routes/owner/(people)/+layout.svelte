<script>
	import GroupTabs from '$lib/components/GroupTabs.svelte';

	let { children } = $props();

	// URL은 그대로 두고 v8 프로토타입의 "직원" 메뉴(직원+급여 탭)를 재현한다. staff/[ticketId]
	// 상세 화면은 tabs 목록에 없으므로 탭 스트립이 자동으로 숨는다.
	const TABS = [
		['/owner/staff', '직원'],
		['/owner/payroll', '급여']
	];
</script>

<GroupTabs tabs={TABS} />
{@render children()}
