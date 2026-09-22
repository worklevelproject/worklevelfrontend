<script>
	// 🧪 목업: 점주 화면에서 "다른 사람의 공개 workPassport 보기"(task.md 2)를 미리 자리 잡아둔
	// 화면이다. 실제로는 GET /members/{memberId}/passports를 쓰면 되는데(lib/api/passport.js의
	// getPublicPassports), 그 memberId를 직원 응답(EmployeeDetailResponse/EmployeeSummaryResponse)이
	// 안 줘서(alias로만 식별 - 회원 실제 정보 비노출 설계) 지금은 이 ticket이 실제로 누구인지 연결할
	// 수 없다. 백엔드가 memberId를 내려주면(또는 ticketId→memberId 조회 API가 생기면)
	// getPublicPassports(memberId)로 바꿔 끼우면 된다.
	import DrawerShell from '../DrawerShell.svelte';
	import { RESIGNATION_TYPE, REHIRE_INTENT } from '$lib/utils/labels.js';
	import { fmt } from '$lib/utils/date.js';
	import { closeDrawer } from '$lib/stores/drawer.js';

	/** @type {{alias: string}} */
	let { alias } = $props();

	const mockPassports = [
		{
			id: -1,
			storeName: '카페 봄날 홍대점',
			resignationType: 'CONTRACT_EXPIRED',
			lastWorkDate: '2026-02-14',
			totalWorkMinutes: 312 * 60,
			workPeriodDays: 210,
			onTimeRate: 96,
			noShowCount: 0,
			responseRate: 0.92,
			taskCompletionRate: 0.88,
			rehireIntent: 'YES',
			ownerComment: '성실하고 바쁜 시간대 대응이 좋았어요.',
			approvedAt: '2026-02-20T10:00:00'
		}
	];
</script>

<DrawerShell title="{alias}님의 workPassport">
	{#snippet children()}
		<p class="tiny muted" style="margin-bottom:12px">
			🧪 목업 데이터예요 — 백엔드가 직원 응답에 회원 식별자(memberId)를 내려주면 실제
			GET /members/{'{memberId}'}/passports로 바꿔요. 지금은 그 사람이 공개로 설정한
			workPassport만 이렇게 보이게 될 예정이에요.
		</p>
		{#each mockPassports as p (p.id)}
			<div class="card w" style="margin-bottom:12px">
				<div class="sec-h"><h3>{p.storeName}</h3></div>
				<p class="tiny muted" style="margin:-4px 0 10px">
					{RESIGNATION_TYPE[p.resignationType]} · 마지막 근무일 {fmt(p.lastWorkDate)} · 승인 {fmt(p.approvedAt.slice(0, 10))}
				</p>
				<div class="kv x3">
					<div><b class="num">{(p.totalWorkMinutes / 60).toFixed(1)}h</b><span>누적 근무시간</span></div>
					<div><b class="num">{p.workPeriodDays}</b><span>근무 기간(일)</span></div>
					<div><b class="num">{p.onTimeRate}%</b><span>정시출근율</span></div>
				</div>
				<p class="tiny muted" style="margin-top:8px">{REHIRE_INTENT[p.rehireIntent]}</p>
				{#if p.ownerComment}<p style="margin-top:8px">{p.ownerComment}</p>{/if}
			</div>
		{:else}
			<div class="empty">공개된 workPassport가 없어요</div>
		{/each}
	{/snippet}
	{#snippet foot()}
		<button class="btn p" onclick={closeDrawer}>닫기</button>
	{/snippet}
</DrawerShell>
