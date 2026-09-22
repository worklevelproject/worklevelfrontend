<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.js';
	import { getEmployeeDetail, getEmployeeStats, updateEmployeeInfo } from '$lib/api/store.js';
	import { getList as getDocList } from '$lib/api/contractDocument.js';
	import { getStoreSalary } from '$lib/api/cost.js';
	import { mock } from '$lib/stores/mock.js';
	import { deductionFor } from '$lib/utils/payroll.js';
	import { won } from '$lib/utils/format.js';
	import { fmt } from '$lib/utils/date.js';
	import { DOCUMENT_TYPE, JOB_ROLE, EDITABLE_JOB_ROLES, DAY_KEYS, DAY_LABEL, daysLabel } from '$lib/utils/labels.js';
	import { showToast } from '$lib/stores/toast.js';
	import { openDrawer } from '$lib/stores/drawer.js';
	import ContractDocDrawer from '$lib/components/drawers/ContractDocDrawer.svelte';
	import ContractDocViewDrawer from '$lib/components/drawers/ContractDocViewDrawer.svelte';
	import PassportViewDrawer from '$lib/components/drawers/PassportViewDrawer.svelte';

	const ticketId = Number(page.params.ticketId);

	let detail = $state(/** @type {any} */ (null));
	let stat = $state(/** @type {any} */ (null));
	let salaryRow = $state(/** @type {any} */ (null));
	let docs = $state(/** @type {any[]} */ ([]));
	let editing = $state(false);
	let form = $state({ jobRole: 'STAFF', hourlyWage: 0, workStartDate: '', availableDays: /** @type {string[]} */ ([]) });
	let saving = $state(false);
	let err = $state('');

	async function load() {
		const [d, stats, dl, salary] = await Promise.all([
			getEmployeeDetail($session.storeId, ticketId),
			getEmployeeStats($session.storeId, true),
			getDocList(ticketId),
			getStoreSalary($session.storeId)
		]);
		detail = d;
		stat = stats.content.find((s) => s.ticketId === ticketId) || null;
		salaryRow = salary.find((s) => s.ticketId === ticketId) || null;
		docs = dl;
		form = {
			jobRole: d.jobRole,
			hourlyWage: d.hourlyWage || 0,
			workStartDate: d.workStartDate || '',
			availableDays: [...(d.availableDays || [])]
		};
	}
	onMount(load);

	function toggleDay(k) {
		form.availableDays = form.availableDays.includes(k) ? form.availableDays.filter((x) => x !== k) : [...form.availableDays, k];
	}

	const pay = $derived(
		salaryRow ? deductionFor(salaryRow.totalPay + salaryRow.weeklyAllowanceAmount, $mock.paySettings.deduct) : null
	);

	async function save() {
		saving = true;
		err = '';
		try {
			detail = await updateEmployeeInfo($session.storeId, ticketId, {
				jobRole: form.jobRole,
				hourlyWage: Number(form.hourlyWage),
				workStartDate: form.workStartDate || null,
				availableDays: form.availableDays
			});
			editing = false;
			showToast('저장했어요');
			load();
		} catch (e) {
			err = e?.message || '저장에 실패했어요';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>{detail?.alias || '직원'} · WORKLEVEL</title></svelte:head>

{#if !detail}
	<div class="empty">불러오는 중…</div>
{:else}
	<div class="hdr">
		<div style="display:flex;gap:16px;align-items:center">
			<div class="avatar lg">{detail.alias?.slice(1)}</div>
			<div>
				<div class="eyebrow">{JOB_ROLE[detail.jobRole] || detail.jobRole} · 입사 {detail.workStartDate || '—'}{detail.isRepeated ? ' · 재입사 이력 있음' : ''}</div>
				<h1>{detail.alias}</h1>
			</div>
		</div>
		<div class="acts">
			<button class="btn s" onclick={() => openDrawer(PassportViewDrawer, { alias: detail.alias })}>workPassport 보기</button>
			<a class="btn s" href="/owner/staff/{ticketId}/resignation">퇴사처리</a>
			<button class="btn p" onclick={() => (editing = !editing)}>{editing ? '취소' : '정보 수정'}</button>
		</div>
	</div>

	<div class="cols">
		<div>
			<div class="sec">
				<div class="sec-h"><h3>시급</h3></div>
				<div class="kv x3">
					<div><b class="num">{won(detail.hourlyWage || 0)}</b><span>현재 적용 중</span></div>
					{#if detail.pendingHourlyWage != null}
						<div><b class="num">{won(detail.pendingHourlyWage)}</b><span>{fmt(detail.pendingHourlyWageApplyDate)}부터 적용 예정</span></div>
					{/if}
				</div>
			</div>
			{#if editing}
				<div class="card w">
					<div class="f">
						<label>직무</label>
						<div class="opts">
							{#each EDITABLE_JOB_ROLES as r (r)}
								<button class={form.jobRole === r ? 'on' : ''} onclick={() => (form.jobRole = r)}>{JOB_ROLE[r]}</button>
							{/each}
						</div>
					</div>
					<div class="f"><label>시급</label><input type="number" bind:value={form.hourlyWage} /></div>
					<div class="f"><label>근무시작일</label><input bind:value={form.workStartDate} placeholder="YYYY-MM-DD" /></div>
					<div class="f">
						<label>기본 근무 요일</label>
						<div class="opts">
							{#each DAY_KEYS as k (k)}
								<button class={form.availableDays.includes(k) ? 'on' : ''} onclick={() => toggleDay(k)}>{DAY_LABEL[k]}</button>
							{/each}
						</div>
					</div>
					{#if err}<p class="f err">{err}</p>{/if}
					<button class="btn p w" disabled={saving} onclick={save}>저장</button>
				</div>
			{/if}

			<div class="sec">
				<div class="sec-h"><h3>기본 근무 요일</h3></div>
				<div class="kv"><div><b>{daysLabel(detail.availableDays)}</b><span>근무표에서 이 요일에 이 직원이 후보로 떠요</span></div></div>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>이번 주 근무 · 이번달 급여</h3></div>
				{#if stat}
					<div class="kv x3">
						<div><b class="num">{(stat.weeklyWorkMinutes / 60).toFixed(1)}h</b><span>이번 주 확정</span></div>
						<div><b class="num">{stat.onTimeRate?.toFixed(0)}%</b><span>정시출근율</span></div>
						<div><b class="num">{(stat.confirmedWorkMinutes / 60).toFixed(0)}h</b><span>누적 확인 시간</span></div>
					</div>
				{/if}
				{#if pay}
					<p class="tiny muted">이번달 실지급 예상 {won(pay.net)} (수당·주휴수당은 실제 계산값, 공제만 추정)</p>
				{:else}
					<p class="tiny muted">이번달 근무 기록이 아직 없어요</p>
				{/if}
			</div>

			<div class="sec">
				<div class="sec-h"><h3>활동 이력</h3></div>
				<div class="rows">
					{#each detail.activities || [] as a (a.id)}
						<div class="row"><div class="main"><div class="t">{fmt(a.joinedAt)} 입사{a.leftAt ? ` → ${fmt(a.leftAt)} 퇴사` : ' · 재직 중'}</div></div></div>
					{:else}
						<div class="empty">이력이 없어요</div>
					{/each}
				</div>
			</div>
		</div>
		<div>
			<div class="sec">
				<div class="sec-h"><h3>서류</h3><button class="link b" onclick={() => openDrawer(ContractDocDrawer, { ticketId, onDone: load })}>등록</button></div>
				{#each docs as d (d.contractDocumentId)}
					<button class="doc" onclick={() => openDrawer(ContractDocViewDrawer, { ticketId, contractDocumentId: d.contractDocumentId })}>
						<div>
							<div class="t">{DOCUMENT_TYPE[d.documentType] || d.documentType}</div>
							<div class="s">만료 {d.expiryDate}</div>
						</div>
					</button>
				{:else}
					<div class="empty">등록된 서류가 없어요</div>
				{/each}
				<p class="tiny muted" style="margin-top:10px">서류는 사장님과 직원 본인이 등록할 수 있어요. 누르면 파일을 볼 수 있어요.</p>
			</div>
		</div>
	</div>
{/if}
