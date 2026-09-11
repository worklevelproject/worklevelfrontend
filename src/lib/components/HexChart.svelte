<script>
	const AXES = ['신뢰도', '숙련도', '업무 속도', '정확도', '응대력', '협업력'];

	/** @type {{values: number[], size?: number}} */
	let { values, size = 240 } = $props();

	const c = size / 2;
	const r = size * 0.34;
	const ang = (i) => -Math.PI / 2 + (i * Math.PI) / 3;
	const rings = [0.25, 0.5, 0.75, 1].map((k) =>
		[0, 1, 2, 3, 4, 5].map((i) => `${(c + r * k * Math.cos(ang(i))).toFixed(1)},${(c + r * k * Math.sin(ang(i))).toFixed(1)}`).join(' ')
	);
	const shape = $derived(
		[0, 1, 2, 3, 4, 5]
			.map((i) => {
				const k = values[i] / 10;
				return `${(c + r * k * Math.cos(ang(i))).toFixed(1)},${(c + r * k * Math.sin(ang(i))).toFixed(1)}`;
			})
			.join(' ')
	);
	const labels = [0, 1, 2, 3, 4, 5].map((i) => ({
		x: (c + (r + 22) * Math.cos(ang(i))).toFixed(1),
		y: (c + (r + 22) * Math.sin(ang(i))).toFixed(1),
		name: AXES[i]
	}));
</script>

<svg viewBox="0 0 {size} {size}" role="img" aria-label="능력지표">
	{#each rings as pts (pts)}<polygon class="hex-grid" points={pts} />{/each}
	<polygon class="hex-shape" points={shape} />
	{#each labels as l, i (l.name)}
		<text class="hex-label" x={l.x} y={Number(l.y) - 4} text-anchor="middle">{l.name}</text>
		<text class="hex-val" x={l.x} y={Number(l.y) + 9} text-anchor="middle">{values[i]}</text>
	{/each}
</svg>
