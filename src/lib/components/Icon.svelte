<script>
	// worklevel-src의 ICO 객체를 그대로 옮김 (03-shell-owner-pages.js)
	const ICO = {
		home: 'M3 12l9-8 9 8M5 10v10h14V10',
		user: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 3.6-6 8-6s8 2 8 6',
		cal: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
		check: 'M5 12l4 4L19 6',
		search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
		cup: 'M6 4h12l-2 16H8zM5 9h14',
		clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
		won: 'M3 7h18M3 12h18M6 4l3 16 3-12 3 12 3-16',
		bell: 'M6 8a6 6 0 0 1 12 0v5l2 3H4l2-3zM10 19a2 2 0 0 0 4 0',
		gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h-1M21 12h-1M12 4V3M12 21v-1M6.3 6.3l-.7-.7M18.4 18.4l-.7-.7M6.3 17.7l-.7.7M18.4 5.6l-.7.7',
		back: 'M15 5l-7 7 7 7',
		chev: 'M9 5l7 7-7 7',
		x: 'M6 6l12 12M18 6L6 18',
		users: 'M17 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0zM8 21c0-3 2.7-5 6-5s6 2 6 5M7 11a3 3 0 1 0-4 0M1 21c0-3 2-5 5-5'
	};

	/** @type {{name: keyof typeof ICO, class?: string}} */
	let { name, class: klass = 'i' } = $props();
</script>

<svg class={klass} viewBox="0 0 24 24"><path d={ICO[name]} /></svg>
