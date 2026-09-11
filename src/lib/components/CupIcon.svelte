<script>
	/** @type {{color?: string}} */
	let { color = '#8E8E8E' } = $props();
</script>

<svg viewBox="0 0 64 72" aria-hidden="true">
	<path d="M10 14h44l-4 44a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill={color} />
	<path d="M8 10h48v6H8z" fill="#171A20" opacity=".85" />
	<path d="M14 30h36" stroke="rgba(255,255,255,.35)" stroke-width="2" />
</svg>
