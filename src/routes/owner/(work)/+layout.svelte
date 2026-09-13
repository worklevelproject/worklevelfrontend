<script>
	import GroupTabs from '$lib/components/GroupTabs.svelte';

	let { children } = $props();

	// URL은 그대로 두고 v8 프로토타입의 "근무" 메뉴(근무표+출퇴근 탭)를 재현한다.
	const TABS = [
		['/owner/shifts', '근무표'],
		['/owner/attendance', '출퇴근']
	];
</script>

<GroupTabs tabs={TABS} />
{@render children()}
