<script>
	import Sidebar from './Sidebar.svelte';
	import Topbar from './Topbar.svelte';

	/** @type {{owner: boolean, title: string, children?: import('svelte').Snippet}} */
	let { owner, title, children } = $props();
</script>

<div class="shell">
	<Sidebar {owner} />
	<div class="main">
		<Topbar {title} />
		<main class="page fade">
			{@render children?.()}
		</main>
	</div>
</div>
