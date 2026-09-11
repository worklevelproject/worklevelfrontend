<script>
	import { drawer, closeDrawer } from '../stores/drawer.js';
</script>

<div class="dim" class:show={$drawer} onclick={closeDrawer} role="presentation"></div>
<div class="drawer" class:show={$drawer} role="dialog" aria-modal="true" tabindex="-1">
	{#if $drawer}
		{@const Comp = $drawer.component}
		<Comp {...$drawer.props} />
	{/if}
</div>
