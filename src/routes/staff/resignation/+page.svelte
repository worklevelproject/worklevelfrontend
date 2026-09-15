<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';
	import { getResignationForEmployee, confirmResignationByEmployee, requestResignationFix } from '$lib/api/resignation.js';
	import { RESIGNATION_TYPE, RESIGNATION_STATUS, REHIRE_INTENT, resignationPillClass } from '$lib/utils/labels.js';
	import { fmt } from '$lib/utils/date.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';

	const SCORE_FIELDS = [
		{ key: 'punctualityScore', label: '출근 정시성' },
		{ key: 'posOperationScore', label: 'POS 운영 숙련도' },
		{ key: 'rushHandlingScore', label: '바쁜 시간대 대응' },
		{ key: 'mistakeScore', label: '실수 적음' },
		{ key: 'complaintScore', label: '컴플레인 없음' },
		{ key: 'teamworkScore', label: '팀워크' }
	];

	let loading = $state(true);
	let none = $state(false);
	let proc = $state(/** @type {any} */ (null));
	let reason = $state('');
	let busy = $state(false);
	let err = $state('');

	async function load() {
		loading = true;
		err = '';
		try {
			proc = await getResignationForEmployee($session.storeId);
			none = false;
		} catch (e) {
			if (e?.status === 404) {
				none = true;
				proc = null;
			} else {
				err = e?.message || '불러오기에 실패했어요';
			}
		} finally {
			loading = false;
		}
	}
	onMount(load);

	function confirmOk() {
		confirmBox(
			'퇴사를 확정할까요?',
			'확인하는 즉시 퇴사가 확정되고 이 매장 접근 권한이 사라져요. 되돌릴 수 없어요.',
			'확정하기',
			async () => {
				try {
					await confirmResignationByEmployee($session.storeId);
					showToast('퇴사가 확정됐어요');
					goto('/staff/today');
				} catch (e) {
					showToast(e?.message || '실패했어요');
				}
			},
			true
		);
	}

	async function sendFix() {
		if (!reason.trim()) return (err = '수정을 원하는 내용을 적어 주세요');
		busy = true;
		err = '';
		try {
			proc = await requestResignationFix($session.storeId, reason.trim());
			reason = '';
			showToast('수정요청을 보냈어요 · 사장님이 다시 평가해요');
		} catch (e) {
			err = e?.message || '전송에 실패했어요';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>퇴사처리 확인 · WORKLEVEL</title></svelte:head>

<div class="hdr"><div><h1>퇴사처리 확인</h1></div></div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else if none}
	<div class="empty">진행 중인 퇴사처리가 없어요</div>
{:else if proc}
	<span class="pill {resignationPillClass(proc.status)}">{RESIGNATION_STATUS[proc.status]}</span>

	<div class="sec">
		<div class="sec-h"><h3>근무 지표</h3></div>
		<div class="kv x3">
			<div><b class="num">{(proc.totalWorkMinutes / 60).toFixed(1)}h</b><span>누적 근무시간</span></div>
			<div><b class="num">{proc.workPeriodDays ?? '—'}</b><span>근무 기간(일)</span></div>
			<div><b class="num">{proc.onTimeRate?.toFixed(0)}%</b><span>정시출근율</span></div>
			<div><b class="num">{proc.noShowCount}</b><span>결근 횟수</span></div>
			<div><b class="num">{(proc.acceptRate * 100)?.toFixed(0)}%</b><span>근무요청 수락률</span></div>
			<div><b class="num">{(proc.taskCompletionRate * 100)?.toFixed(0)}%</b><span>할 일 완료율</span></div>
		</div>
		<p class="tiny muted" style="margin-top:8px">퇴사 구분: {RESIGNATION_TYPE[proc.resignationType] || '—'} · 마지막 근무일 {proc.lastWorkDate ? fmt(proc.lastWorkDate) : '—'}</p>
	</div>

	<div class="sec">
		<div class="sec-h"><h3>사장님 평가</h3></div>
		<div class="kv x3">
			{#each SCORE_FIELDS as f (f.key)}
				<div><b class="num">{proc[f.key] ?? '—'}</b><span>{f.label}</span></div>
			{/each}
		</div>
		<p class="tiny muted" style="margin-top:8px">{REHIRE_INTENT[proc.rehireIntent] || '—'}</p>
	</div>

	{#if proc.status === 'EMPLOYEE_CONFIRM'}
		<div class="card w">
			<p class="muted">평가 내용을 확인했다면 확정하고, 잘못된 부분이 있으면 수정을 요청하세요. 확정하면 되돌릴 수 없어요.</p>
			<div class="inline" style="margin-top:12px">
				<button class="btn p" onclick={confirmOk}>확인했어요 · 퇴사 확정</button>
			</div>
			<div class="f" style="margin-top:16px">
				<label>수정요청</label>
				<textarea bind:value={reason} rows="3" placeholder="예: 평가 항목 중 팀워크 점수가 실제와 달라요"></textarea>
			</div>
			{#if err}<p class="f err">{err}</p>{/if}
			<button class="btn s" disabled={busy} onclick={sendFix}>수정요청 보내기</button>
		</div>
	{:else if proc.status === 'APPROVED'}
		<div class="issue info">
			<div class="bar"></div>
			<div class="main"><div class="t">퇴사 확정됨 · {proc.approvedAt ? fmt(proc.approvedAt.slice(0, 10)) : ''}</div></div>
		</div>
	{/if}
{/if}
