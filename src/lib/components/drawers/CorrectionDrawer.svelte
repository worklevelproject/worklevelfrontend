<script>
	import DrawerShell from '../DrawerShell.svelte';
	import { session } from '$lib/stores/session.js';
	import { proposeAttendanceCorrection } from '$lib/api/work.js';
	import { closeDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { fmt } from '$lib/utils/date.js';

	/** @type {{workRequestId: number, date: string, onDone?: () => void}} */
	let { workRequestId, date, onDone } = $props();

	let checkIn = $state('');
	let checkOut = $state('');
	let reason = $state('체크인 빠짐');
	let saving = $state(false);
	let err = $state('');

	async function submit() {
		if (!checkIn && !checkOut) return (err = '출근이나 퇴근 시각 중 하나는 적어 주세요');
		saving = true;
		err = '';
		try {
			await proposeAttendanceCorrection($session.storeId, workRequestId, {
				checkInTime: checkIn ? `${date}T${checkIn}:00` : null,
				checkOutTime: checkOut ? `${date}T${checkOut}:00` : null,
				reason
			});
			showToast('보냈어요 · 사장님이 확인하면 반영');
			closeDrawer();
			onDone?.();
		} catch (e) {
			err = e?.message || '보내기에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<DrawerShell title="기록 고쳐달라고 하기">
	{#snippet children()}
		<p class="tiny muted" style="margin-bottom:12px">{fmt(date)} 근무 · 사장님이 승인해야 실제 기록에 반영돼요. 한 번만 제안할 수 있어요.</p>
		<div class="f"><label>왜</label>
			<div class="opts">
				{#each ['체크인 빠짐', '매니저가 잘못 입력', '앱 오류', '더 일한 시간 빠짐'] as r (r)}
					<button class={reason === r ? 'on' : ''} onclick={() => (reason = r)}>{r}</button>
				{/each}
			</div>
		</div>
		<div class="f"><div class="inline">
			<div class="f" style="margin:0"><label>실제 출근</label><input bind:value={checkIn} placeholder="HH:MM" /></div>
			<div class="f" style="margin:0"><label>실제 퇴근</label><input bind:value={checkOut} placeholder="HH:MM" /></div>
		</div></div>
		{#if err}<p class="f err">{err}</p>{/if}
	{/snippet}
	{#snippet foot()}
		<button class="btn s" onclick={closeDrawer}>취소</button>
		<button class="btn p" disabled={saving} onclick={submit}>보내기</button>
	{/snippet}
</DrawerShell>
