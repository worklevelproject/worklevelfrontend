<script>
	import ProtectedLayout from '$lib/components/ProtectedLayout.svelte';
	let { children } = $props();
</script>

<ProtectedLayout owner={true}>
	{@render children?.()}
</ProtectedLayout>
