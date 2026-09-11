<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { rejectWorkRequest } from '$lib/api/work.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';

	/** @type {{workRequestId: number, onDone?: () => void}} */
	let { workRequestId, onDone } = $props();

	let reason = $state('개인 일정');
	let saving = $state(false);

	async function submit() {
		saving = true;
		try {
			await rejectWorkRequest($session.storeId, workRequestId, reason);
			showToast('사장님께 보냈어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			showToast(e?.message || '실패했어요');
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title="어려워요">
	{#snippet children()}
		<div class="f">
			<label>이유</label>
			<div class="opts">
				{#each ['개인 일정', '학교 일정', '몸이 안 좋아요', '다른 근무와 겹쳐요'] as r (r)}
					<button class={reason === r ? 'on' : ''} onclick={() => (reason = r)}>{r}</button>
				{/each}
			</div>
		</div>
		<p class="tiny muted">어렵다고 하면 사장님이 다른 직원을 구해요.</p>
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>보내기</button>
	{/snippet}
</DrawerShell>
