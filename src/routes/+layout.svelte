<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { tryRestoreSession } from '$lib/api/bootstrap.js';
	import { authReady } from '$lib/stores/authReady.js';
	import Toast from '$lib/components/Toast.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import DrawerHost from '$lib/components/DrawerHost.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';

	let { children } = $props();

	onMount(async () => {
		await tryRestoreSession();
		authReady.set(true);
	});
</script>

{@render children?.()}

<Toast />
<ConfirmModal />
<DrawerHost />
<LoadingOverlay />
