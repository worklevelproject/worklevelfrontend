<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { reviveNoShow } from '$lib/api/work.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { fmt } from '$lib/utils/date.js';

	/** @type {{workAssignmentId: number, date: string, onDone?: () => void}} */
	let { workAssignmentId, date, onDone } = $props();

	let checkIn = $state('');
	let checkOut = $state('');
	let saving = $state(false);
	let err = $state('');

	async function submit() {
		if (!checkIn || !checkOut) return (err = '출근·퇴근 시각 둘 다 적어 주세요');
		saving = true;
		err = '';
		try {
			await reviveNoShow($session.storeId, workAssignmentId, {
				checkInTime: `${date}T${checkIn}:00`,
				checkOutTime: `${date}T${checkOut}:00`
			});
			showToast('결근 처리를 되돌렸어요');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '되돌리기에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title="결근 복구">
	{#snippet children()}
		<p class="tiny muted" style="margin-bottom:12px">{fmt(date)} 근무 · 실제 출퇴근 시각을 확정하면 지각/정상 출근으로 되돌아가요. 근무시간·정시출근율·결근 횟수가 그 자리에서 함께 반영돼요.</p>
		<div class="f"><div class="inline">
			<div class="f" style="margin:0"><label>실제 출근</label><input bind:value={checkIn} placeholder="HH:MM" /></div>
			<div class="f" style="margin:0"><label>실제 퇴근</label><input bind:value={checkOut} placeholder="HH:MM" /></div>
		</div></div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>되돌리기</button>
	{/snippet}
</DrawerShell>
