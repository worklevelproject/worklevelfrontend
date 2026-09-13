<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';
	import { getEmployeeStats, getInviteCode } from '$lib/api/store.js';
	import { DOC_EXPIRY_STATUS, docPillClass } from '$lib/utils/labels.js';
	import { won } from '$lib/utils/format.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';

	let activeTab = $state(true);
	let list = $state(/** @type {any[]} */ ([]));
	let sortKey = $state('alias');
	let loading = $state(true);
	let inviteCode = $state('');

	async function load() {
		loading = true;
		try {
			list = (await getEmployeeStats($session.storeId, activeTab)).content;
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		activeTab;
		load();
	});

	const sorted = $derived(
		[...list].sort((a, b) => {
			if (sortKey === 'alias') return a.alias.localeCompare(b.alias);
			if (sortKey === 'hours') return b.confirmedWorkMinutes - a.confirmedWorkMinutes;
			if (sortKey === 'ontime') return b.onTimeRate - a.onTimeRate;
			return a.workStartDate?.localeCompare(b.workStartDate || '') || 0;
		})
	);

	async function showInvite() {
		try {
			const r = await getInviteCode($session.storeId);
			inviteCode = r.inviteCode;
			confirmBox('직원 초대코드', `이 코드를 직원에게 전달해 주세요: ${r.inviteCode}\n직원은 로그인 후 매장 참여 화면에서 이 코드를 입력해요.`, '확인', () => {}, false);
		} catch (e) {
			showToast(e?.message || '초대코드를 불러오지 못했어요');
		}
	}
</script>

<svelte:head><title>직원 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">직원 {list.length}명</div>
		<h1>직원</h1>
	</div>
	<div class="acts">
		<div class="seg lg">
			<button class={activeTab ? 'on' : ''} onclick={() => (activeTab = true)}>일하는 중</button>
			<button class={!activeTab ? 'on' : ''} onclick={() => (activeTab = false)}>그만둔 직원</button>
		</div>
		<button class="btn p" onclick={showInvite}>초대코드 보기</button>
	</div>
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else}
	<table class="tbl">
		<thead>
			<tr>
				<th class="sort" onclick={() => (sortKey = 'alias')}>직원</th>
				<th>직무</th>
				<th>시급</th>
				<th class="sort" onclick={() => (sortKey = 'start')}>입사</th>
				<th class="sort" onclick={() => (sortKey = 'hours')}>확인된 시간</th>
				<th class="sort" onclick={() => (sortKey = 'ontime')}>정시출근</th>
				<th>이번 주</th>
				<th>계약서</th>
				<th>보건증</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each sorted as p (p.ticketId)}
				<tr class="click" onclick={() => goto(`/owner/staff/${p.ticketId}`)}>
					<td><div class="who"><div class="avatar">{p.alias?.slice(1)}</div><span class="t">{p.alias}</span></div></td>
					<td>{p.jobRole}</td>
					<td class="num">{p.hourlyWage?.toLocaleString() || '—'}원</td>
					<td class="num">{p.workStartDate || '—'}</td>
					<td class="num">{(p.confirmedWorkMinutes / 60).toFixed(0)}h</td>
					<td class="num">{p.onTimeRate?.toFixed(0)}%</td>
					<td class="num">{(p.weeklyWorkMinutes / 60).toFixed(1)}h</td>
					<td><span class="pill {docPillClass(p.contractStatus)}">{DOC_EXPIRY_STATUS[p.contractStatus]}</span></td>
					<td><span class="pill {docPillClass(p.healthCertificateStatus)}">{DOC_EXPIRY_STATUS[p.healthCertificateStatus]}</span></td>
					<td><span class="link">자세히 →</span></td>
				</tr>
			{:else}
				<tr><td colspan="10"><div class="empty">아직 없어요</div></td></tr>
			{/each}
		</tbody>
	</table>
{/if}
