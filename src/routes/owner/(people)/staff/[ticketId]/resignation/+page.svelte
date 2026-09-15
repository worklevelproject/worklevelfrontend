<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.js';
	import {
		startOrResumeResignation,
		getResignationForOwner,
		confirmResignationType,
		saveResignationEvaluation,
		sendResignationToEmployee
	} from '$lib/api/resignation.js';
	import { RESIGNATION_TYPE, RESIGNATION_STATUS, REHIRE_INTENT, resignationPillClass } from '$lib/utils/labels.js';
	import { fmt } from '$lib/utils/date.js';
	import { showToast } from '$lib/stores/toast.js';

	const ticketId = Number(page.params.ticketId);

	const SCORE_FIELDS = [
		{ key: 'punctualityScore', label: '출근 정시성' },
		{ key: 'posOperationScore', label: 'POS 운영 숙련도' },
		{ key: 'rushHandlingScore', label: '바쁜 시간대 대응' },
		{ key: 'mistakeScore', label: '실수 적음' },
		{ key: 'complaintScore', label: '컴플레인 없음' },
		{ key: 'teamworkScore', label: '팀워크' }
	];
	const TIERS = [
		{ v: 0, t: '매우 나쁨' },
		{ v: 3, t: '나쁨' },
		{ v: 7, t: '좋음' },
		{ v: 10, t: '매우 좋음' }
	];

	let loading = $state(true);
	let notStarted = $state(false);
	let proc = $state(/** @type {any} */ (null));
	let evalForm = $state(/** @type {any} */ ({}));
	let busy = $state(false);
	let err = $state('');

	function syncEvalForm() {
		evalForm = {
			punctualityScore: proc.punctualityScore,
			posOperationScore: proc.posOperationScore,
			rushHandlingScore: proc.rushHandlingScore,
			mistakeScore: proc.mistakeScore,
			complaintScore: proc.complaintScore,
			teamworkScore: proc.teamworkScore,
			rehireIntent: proc.rehireIntent
		};
	}

	async function load() {
		loading = true;
		err = '';
		try {
			proc = await getResignationForOwner($session.storeId, ticketId);
			notStarted = false;
			syncEvalForm();
		} catch (e) {
			if (e?.status === 404) {
				notStarted = true;
				proc = null;
			} else {
				err = e?.message || '불러오기에 실패했어요';
			}
		} finally {
			loading = false;
		}
	}
	onMount(load);

	async function start() {
		busy = true;
		err = '';
		try {
			proc = await startOrResumeResignation($session.storeId, ticketId);
			notStarted = false;
			syncEvalForm();
		} catch (e) {
			err = e?.message || '시작에 실패했어요';
		} finally {
			busy = false;
		}
	}

	async function pickType(t) {
		busy = true;
		err = '';
		try {
			proc = await confirmResignationType($session.storeId, ticketId, t);
			syncEvalForm();
		} catch (e) {
			err = e?.message || '저장에 실패했어요';
		} finally {
			busy = false;
		}
	}

	async function saveDraft() {
		busy = true;
		err = '';
		try {
			proc = await saveResignationEvaluation($session.storeId, ticketId, evalForm);
			syncEvalForm();
			showToast('임시저장했어요');
		} catch (e) {
			err = e?.message || '저장에 실패했어요';
		} finally {
			busy = false;
		}
	}

	const evalComplete = $derived(
		SCORE_FIELDS.every((f) => evalForm[f.key] !== null && evalForm[f.key] !== undefined) && !!evalForm.rehireIntent
	);

	async function send() {
		busy = true;
		err = '';
		try {
			// 전송 전 마지막 입력값이 서버에 반영되도록 먼저 저장
			proc = await saveResignationEvaluation($session.storeId, ticketId, evalForm);
			proc = await sendResignationToEmployee($session.storeId, ticketId);
			showToast('직원에게 확인 요청을 보냈어요');
		} catch (e) {
			err = e?.message || '전송에 실패했어요';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>퇴사처리 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow"><a href="/owner/staff/{ticketId}">← 직원 상세로</a></div>
		<h1>퇴사처리{proc ? ` · ${proc.ticketAlias}` : ''}</h1>
	</div>
	{#if proc}<span class="pill {resignationPillClass(proc.status)}">{RESIGNATION_STATUS[proc.status]}</span>{/if}
</div>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else if notStarted}
	<div class="card w">
		<p class="muted">아직 이 직원의 퇴사처리 프로세스가 시작되지 않았어요. 시작하면 지금까지의 근무 지표(근무시간·정시출근율·결근 횟수·근무요청 수락률·task 완료율·마지막 근무일)가 그 시점 값으로 고정돼요.</p>
		{#if err}<p class="f err">{err}</p>{/if}
		<button class="btn p w" disabled={busy} onclick={start} style="margin-top:12px">퇴사처리 시작하기</button>
	</div>
{:else if proc}
	<div class="sec">
		<div class="sec-h"><h3>근무 지표 스냅샷</h3></div>
		<div class="kv x3">
			<div><b class="num">{(proc.totalWorkMinutes / 60).toFixed(1)}h</b><span>누적 근무시간</span></div>
			<div><b class="num">{proc.workPeriodDays ?? '—'}</b><span>근무 기간(일)</span></div>
			<div><b class="num">{proc.onTimeRate?.toFixed(0)}%</b><span>정시출근율</span></div>
			<div><b class="num">{proc.noShowCount}</b><span>결근 횟수</span></div>
			<div><b class="num">{(proc.acceptRate * 100)?.toFixed(0)}%</b><span>근무요청 수락률</span></div>
			<div><b class="num">{(proc.taskCompletionRate * 100)?.toFixed(0)}%</b><span>할 일 완료율</span></div>
		</div>
		<p class="tiny muted" style="margin-top:8px">마지막 근무일 {proc.lastWorkDate ? fmt(proc.lastWorkDate) : '—'} · 시작 시점에 고정된 값이라 이후 근무해도 바뀌지 않아요</p>
	</div>

	{#if proc.status === 'STAT_CHECK'}
		<div class="card w">
			<div class="f">
				<label>퇴사 구분</label>
				<div class="opts">
					{#each Object.entries(RESIGNATION_TYPE) as [k, v] (k)}
						<button disabled={busy} onclick={() => pickType(k)}>{v}</button>
					{/each}
				</div>
			</div>
			{#if err}<p class="f err">{err}</p>{/if}
		</div>
	{:else}
		<div class="sec">
			<div class="sec-h"><h3>퇴사 구분</h3></div>
			<span class="pill off">{RESIGNATION_TYPE[proc.resignationType] || '—'}</span>
		</div>
	{/if}

	{#if proc.status === 'OWNER_EVALUATION'}
		<div class="card w">
			<div class="sec-h"><h3>사장님 평가</h3></div>
			{#each SCORE_FIELDS as f (f.key)}
				<div class="f">
					<label>{f.label}</label>
					<div class="opts">
						{#each TIERS as tier (tier.v)}
							<button class={evalForm[f.key] === tier.v ? 'on' : ''} disabled={busy} onclick={() => (evalForm[f.key] = tier.v)}>{tier.t}</button>
						{/each}
					</div>
				</div>
			{/each}
			<div class="f">
				<label>재고용 의향</label>
				<div class="opts">
					{#each Object.entries(REHIRE_INTENT) as [k, v] (k)}
						<button class={evalForm.rehireIntent === k ? 'on' : ''} disabled={busy} onclick={() => (evalForm.rehireIntent = k)}>{v}</button>
					{/each}
				</div>
			</div>
			{#if err}<p class="f err">{err}</p>{/if}
			<div class="inline" style="margin-top:12px">
				<button class="btn s" disabled={busy} onclick={saveDraft}>임시저장</button>
				<button class="btn p" disabled={busy || !evalComplete} onclick={send}>직원에게 보내기</button>
			</div>
			{#if !evalComplete}<p class="tiny muted" style="margin-top:6px">7문항을 모두 채워야 보낼 수 있어요</p>{/if}
		</div>
	{:else if proc.status === 'EMPLOYEE_CONFIRM' || proc.status === 'APPROVED'}
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
			<div class="issue wait">
				<div class="bar"></div>
				<div class="main"><div class="t">직원의 확인을 기다리는 중이에요{proc.employeeFixRequestReason ? ` · 이전 수정요청: ${proc.employeeFixRequestReason}` : ''}</div></div>
			</div>
		{:else}
			<div class="issue info">
				<div class="bar"></div>
				<div class="main"><div class="t">퇴사 확정됨 · {proc.approvedAt ? fmt(proc.approvedAt.slice(0, 10)) : ''}</div></div>
			</div>
		{/if}
	{/if}
{:else}
	<div class="empty">{err || '불러오기에 실패했어요'}</div>
{/if}
