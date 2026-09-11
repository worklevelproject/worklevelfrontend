<script>
	import Icon from './Icon.svelte';
	import { closeDrawer } from '../stores/drawer.js';

	/** @type {{title: string, children?: import('svelte').Snippet, foot?: import('svelte').Snippet}} */
	let { title, children, foot } = $props();
</script>

<div class="sh">
	<h3>{title}</h3>
	<button class="iconbtn" onclick={closeDrawer} aria-label="닫기"><Icon name="x" /></button>
</div>
<div class="body">
	{@render children?.()}
</div>
{#if foot}
	<div class="foot">
		{@render foot()}
	</div>
{/if}
