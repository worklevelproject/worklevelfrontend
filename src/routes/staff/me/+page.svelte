<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getMyProfile, updateMyAlias } from '$lib/api/store.js';
	import { getList as getDocList } from '$lib/api/contractDocument.js';
	import { getMyAttendanceHistory } from '$lib/api/attendance.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { DOCUMENT_TYPE, ATTENDANCE_STATUS, attendancePillClass } from '$lib/utils/labels.js';
	import { fmt, toHM } from '$lib/utils/date.js';
	import { createPagedList } from '$lib/utils/pagedList.svelte.js';
	import ContractDocDrawer from '$lib/components/drawers/ContractDocDrawer.svelte';
	import CorrectionDrawer from '$lib/components/drawers/CorrectionDrawer.svelte';

	let profile = $state(/** @type {any} */ (null));
	let docs = $state(/** @type {any[]} */ ([]));
	let editingAlias = $state(false);
	let aliasInput = $state('');

	// 실제 체크인/아웃 시각·근무시간이 담긴 본인 출퇴근 이력(신규 API) - "최근 근무"에 씀.
	const history = createPagedList((offset) => getMyAttendanceHistory($session.storeId, { offset }));

	async function load() {
		const [p, dl] = await Promise.all([getMyProfile($session.storeId), getDocList($session.ticketId), history.load()]);
		profile = p;
		docs = dl;
		aliasInput = p.alias;
	}
	onMount(load);

	async function saveAlias() {
		if (!aliasInput.trim()) return;
		await updateMyAlias($session.storeId, aliasInput.trim());
		await session.selectStore($session.storeId);
		editingAlias = false;
		showToast('바꿨어요');
		load();
	}

	function correctFor(a) {
		openDrawer(CorrectionDrawer, { workRequestId: a.workRequestId, date: a.workDate, onDone: load });
	}
</script>

<svelte:head><title>내 정보 · WORKLEVEL</title></svelte:head>

{#if !profile}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="hdr">
		<div style="display:flex;gap:16px;align-items:center">
			<div class="avatar lg">{profile.alias?.slice(1)}</div>
			<div><div class="eyebrow">{profile.jobRole} · 입사 {profile.workStartDate || '—'} · {$session.storeName}</div><h1>{profile.alias}</h1></div>
		</div>
		<div class="acts"><button class="btn o" onclick={() => (editingAlias = !editingAlias)}>표시 이름 바꾸기</button></div>
	</div>

	{#if editingAlias}
		<div class="f" style="max-width:300px"><label>이 매장에서 보일 이름</label><input bind:value={aliasInput} /></div>
		<button class="btn p sm" onclick={saveAlias}>저장</button>
	{/if}

	<div class="cols">
		<div>
			<div class="sec">
				<div class="sec-h"><h3>최근 근무</h3></div>
				<table class="tbl">
					<thead><tr><th>날짜</th><th>예정</th><th>실제 출퇴근</th><th>상태</th><th></th></tr></thead>
					<tbody>
						{#each history.items as a (a.workRequestId)}
							<tr>
								<td class="t">{fmt(a.workDate)}</td>
								<td class="num">{toHM(a.workStartTime)}–{toHM(a.workEndTime)}</td>
								<td class="num">{a.checkIn ? toHM(a.checkInTime) : '—'}{a.checkOut ? ' → ' + toHM(a.checkOutTime) : ''}</td>
								<td><span class="pill {attendancePillClass(a.status)}">{ATTENDANCE_STATUS[a.status] || a.status}</span></td>
								<td><button class="link" onclick={() => correctFor(a)}>기록 고치기</button></td>
							</tr>
						{:else}
							<tr><td colspan="5"><div class="empty">기록이 없어요</div></td></tr>
						{/each}
					</tbody>
				</table>
				{#if history.hasNext}<button class="btn s" style="margin-top:10px" onclick={history.loadMore}>더보기</button>{/if}
			</div>
		</div>
		<div>
			<div class="sec">
				<div class="sec-h"><h3>서류</h3><button class="link b" onclick={() => openDrawer(ContractDocDrawer, { ticketId: $session.ticketId, onDone: load })}>등록</button></div>
				{#each docs as d (d.contractDocumentId)}
					<div class="doc"><div><div class="t">{DOCUMENT_TYPE[d.documentType] || d.documentType}</div><div class="s">만료 {d.expiryDate}</div></div></div>
				{:else}
					<div class="empty">등록된 서류가 없어요</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
