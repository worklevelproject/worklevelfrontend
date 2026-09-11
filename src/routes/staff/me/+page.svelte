<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getMyProfile, updateMyAlias } from '$lib/api/store.js';
	import { getList as getDocList } from '$lib/api/contractDocument.js';
	import { getMyWorkRequests } from '$lib/api/work.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import { showToast } from '$lib/stores/toast.js';
	import { DOCUMENT_TYPE } from '$lib/utils/labels.js';
	import { fmt, todayISO } from '$lib/utils/date.js';
	import ContractDocDrawer from '$lib/components/drawers/ContractDocDrawer.svelte';
	import CorrectionDrawer from '$lib/components/drawers/CorrectionDrawer.svelte';

	let profile = $state(/** @type {any} */ (null));
	let docs = $state(/** @type {any[]} */ ([]));
	let recentWorks = $state(/** @type {any[]} */ ([]));
	let editingAlias = $state(false);
	let aliasInput = $state('');

	async function load() {
		const [p, dl, accepted] = await Promise.all([
			getMyProfile($session.storeId),
			getDocList($session.ticketId),
			getMyWorkRequests($session.storeId, 'ACCEPT')
		]);
		profile = p;
		docs = dl;
		aliasInput = p.alias;
		recentWorks = accepted.filter((w) => w.workStartTime.slice(0, 10) <= todayISO()).sort((a, b) => b.workStartTime.localeCompare(a.workStartTime)).slice(0, 6);
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

	function correctFor(w) {
		openDrawer(CorrectionDrawer, { workRequestId: w.workRequestId, date: w.workStartTime.slice(0, 10), onDone: load });
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
					<thead><tr><th>날짜</th><th>시간</th><th></th></tr></thead>
					<tbody>
						{#each recentWorks as w (w.workRequestId)}
							<tr>
								<td class="t">{fmt(w.workStartTime.slice(0, 10))}</td>
								<td class="num">{w.workStartTime.slice(11, 16)}–{w.workEndTime.slice(11, 16)}</td>
								<td><button class="link" onclick={() => correctFor(w)}>기록 고치기</button></td>
							</tr>
						{:else}
							<tr><td colspan="3"><div class="empty">기록이 없어요</div></td></tr>
						{/each}
					</tbody>
				</table>
				<p class="tiny muted" style="margin-top:12px">출퇴근 시각 상세 조회 API가 직원에게는 아직 없어서, 실제 출퇴근 시각은 여기 표시되지 않아요.<span class="mock-badge">API 미비</span></p>
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
