<script>
	import { onMount } from 'svelte';
	import { getMyPassports, setPassportPublic } from '$lib/api/passport.js';
	import { RESIGNATION_TYPE, REHIRE_INTENT } from '$lib/utils/labels.js';
	import { fmt } from '$lib/utils/date.js';
	import { showToast } from '$lib/stores/toast.js';

	const SCORE_FIELDS = [
		{ key: 'punctualityScore', label: '출근 정시성' },
		{ key: 'posOperationScore', label: 'POS 운영 숙련도' },
		{ key: 'rushHandlingScore', label: '바쁜 시간대 대응' },
		{ key: 'mistakeScore', label: '실수 적음' },
		{ key: 'complaintScore', label: '컴플레인 없음' },
		{ key: 'teamworkScore', label: '팀워크' }
	];

	let passports = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	let togglingId = $state(/** @type {number | null} */ (null));

	async function load() {
		loading = true;
		passports = await getMyPassports();
		loading = false;
	}
	onMount(load);

	async function toggle(p) {
		togglingId = p.id;
		try {
			const updated = await setPassportPublic(p.id, !p.isPublic);
			passports = passports.map((x) => (x.id === updated.id ? updated : x));
			showToast(updated.isPublic ? '공개로 바꿨어요' : '비공개로 바꿨어요');
		} catch (e) {
			showToast(e?.message || '바꾸지 못했어요');
		} finally {
			togglingId = null;
		}
	}
</script>

<div class="hdr">
	<div>
		<div class="eyebrow">가게와 무관하게 내 계정 기준으로 보여요</div>
		<h1>마이페이지</h1>
	</div>
</div>

<div class="sec">
	<div class="sec-h"><h3>내 workPassport</h3></div>
	<p class="tiny muted" style="margin-bottom:12px">
		퇴사 처리가 완료된 근무 이력이에요. 공개로 바꾸면 다른 사람이 내 이름 없이(회원 단위로) 이 기록을 볼 수 있어요.
	</p>
	{#if loading}
		<div class="empty">불러오는 중…</div>
	{:else if !passports.length}
		<div class="empty">아직 확정된 workPassport가 없어요</div>
	{:else}
		{#each passports as p (p.id)}
			<div class="card w" style="margin-bottom:12px">
				<div class="sec-h">
					<h3>{p.storeName}</h3>
					<button class="toggle {p.isPublic ? 'on' : ''}" disabled={togglingId === p.id} onclick={() => toggle(p)}></button>
				</div>
				<p class="tiny muted" style="margin:-4px 0 10px">
					{RESIGNATION_TYPE[p.resignationType] || p.resignationType} · 마지막 근무일 {p.lastWorkDate ? fmt(p.lastWorkDate) : '—'} · 승인 {p.approvedAt ? fmt(p.approvedAt.slice(0, 10)) : '—'} · {p.isPublic ? '공개 중' : '비공개'}
				</p>
				<div class="kv x3">
					<div><b class="num">{(p.totalWorkMinutes / 60).toFixed(1)}h</b><span>누적 근무시간</span></div>
					<div><b class="num">{p.workPeriodDays ?? '—'}</b><span>근무 기간(일)</span></div>
					<div><b class="num">{p.onTimeRate?.toFixed(0)}%</b><span>정시출근율</span></div>
					<div><b class="num">{p.noShowCount}</b><span>결근 횟수</span></div>
					<div><b class="num">{(p.responseRate * 100)?.toFixed(0)}%</b><span>근무 제안 응답률</span></div>
					<div><b class="num">{(p.taskCompletionRate * 100)?.toFixed(0)}%</b><span>할 일 완료율</span></div>
				</div>
				<div class="kv x3" style="margin-top:8px">
					{#each SCORE_FIELDS as f (f.key)}
						<div><b class="num">{p[f.key] ?? '—'}</b><span>{f.label}</span></div>
					{/each}
				</div>
				<p class="tiny muted" style="margin-top:8px">{REHIRE_INTENT[p.rehireIntent] || '—'}</p>
				{#if p.ownerComment}<p style="margin-top:8px;white-space:pre-line">{p.ownerComment}</p>{/if}
			</div>
		{/each}
	{/if}
</div>
