<script>
	import { drawer, closeDrawer } from '../stores/drawer.js';
</script>

<div class="dim" class:show={$drawer.open} onclick={closeDrawer} role="presentation"></div>
<div class="drawer" class:show={$drawer.open} role="dialog" aria-modal="true" tabindex="-1">
	{#if $drawer.open}
		{@const Comp = $drawer.component}
		<Comp {...$drawer.props} />
	{/if}
</div>
