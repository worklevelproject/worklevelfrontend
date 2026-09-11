<script>
	import ProtectedLayout from '$lib/components/ProtectedLayout.svelte';
	let { children } = $props();
</script>

<ProtectedLayout owner={false}>
	{@render children?.()}
</ProtectedLayout>
