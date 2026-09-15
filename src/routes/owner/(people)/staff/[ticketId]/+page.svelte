<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';
	import { getEmployeeDetail, getEmployeeStats, updateEmployeeInfo, removeEmployee } from '$lib/api/store.js';
	import { getList as getDocList } from '$lib/api/contractDocument.js';
	import { getStoreSalary } from '$lib/api/cost.js';
	import { mock } from '$lib/stores/mock.js';
	import { deductionFor } from '$lib/utils/payroll.js';
	import { won } from '$lib/utils/format.js';
	import { fmt } from '$lib/utils/date.js';
	import { DOCUMENT_TYPE } from '$lib/utils/labels.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';

	const ticketId = Number(page.params.ticketId);

	let detail = $state(/** @type {any} */ (null));
	let stat = $state(/** @type {any} */ (null));
	let salaryRow = $state(/** @type {any} */ (null));
	let docs = $state(/** @type {any[]} */ ([]));
	let editing = $state(false);
	let form = $state({ jobRole: 'STAFF', hourlyWage: 0, workStartDate: '', availableStartTime: '09:00', availableEndTime: '18:00' });
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
			availableStartTime: d.availableStartTime?.slice(0, 5) || '09:00',
			availableEndTime: d.availableEndTime?.slice(0, 5) || '18:00'
		};
	}
	onMount(load);

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
				availableStartTime: form.availableStartTime,
				availableEndTime: form.availableEndTime
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

	function onRemove() {
		confirmBox(`${detail.alias}님을 내보낼까요?`, '이 직원의 티켓이 비활성화돼요. 확인된 근무 기록은 남아요.', '내보내기', async () => {
			try {
				await removeEmployee($session.storeId, ticketId);
				showToast('내보냈어요');
				goto('/owner/staff');
			} catch (e) {
				showToast(e?.message || '실패했어요');
			}
		}, true);
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
				<div class="eyebrow">{detail.jobRole} · 입사 {detail.workStartDate || '—'}{detail.isRepeated ? ' · 재입사 이력 있음' : ''}</div>
				<h1>{detail.alias}</h1>
			</div>
		</div>
		<div class="acts">
			<a class="btn s" href="/owner/staff/{ticketId}/resignation">퇴사처리</a>
			<button class="btn d" onclick={onRemove}>내보내기</button>
			<button class="btn p" onclick={() => (editing = !editing)}>{editing ? '취소' : '정보 수정'}</button>
		</div>
	</div>

	<div class="cols">
		<div>
			{#if editing}
				<div class="card w">
					<div class="f">
						<label>직무</label>
						<div class="opts">
							{#each ['STAFF', 'MANAGER'] as r (r)}
								<button class={form.jobRole === r ? 'on' : ''} onclick={() => (form.jobRole = r)}>{r === 'STAFF' ? '일반직원' : '매니저'}</button>
							{/each}
						</div>
					</div>
					<div class="f"><label>시급</label><input type="number" bind:value={form.hourlyWage} /></div>
					<div class="f"><label>근무시작일</label><input bind:value={form.workStartDate} placeholder="YYYY-MM-DD" /></div>
					<div class="f">
						<div class="inline">
							<div class="f" style="margin:0"><label>기본 가능 시작</label><input bind:value={form.availableStartTime} /></div>
							<div class="f" style="margin:0"><label>기본 가능 종료</label><input bind:value={form.availableEndTime} /></div>
						</div>
					</div>
					{#if err}<p class="f err">{err}</p>{/if}
					<button class="btn p w" disabled={saving} onclick={save}>저장</button>
				</div>
			{/if}

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
				<div class="sec-h"><h3>서류</h3></div>
				{#each docs as d (d.contractDocumentId)}
					<div class="doc">
						<div>
							<div class="t">{DOCUMENT_TYPE[d.documentType] || d.documentType}</div>
							<div class="s">만료 {d.expiryDate}</div>
						</div>
					</div>
				{:else}
					<div class="empty">등록된 서류가 없어요</div>
				{/each}
				<p class="tiny muted" style="margin-top:10px">서류 등록·파일은 직원 본인만 할 수 있어요. 사장님에게는 만료일자만 보여요.</p>
			</div>
		</div>
	</div>
{/if}
