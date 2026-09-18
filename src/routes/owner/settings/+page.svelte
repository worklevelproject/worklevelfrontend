<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.js';
	import { mock, resetMock } from '$lib/stores/mock.js';
	import { getTemplates as getTimeTemplates, upsertTemplates } from '$lib/api/timeTemplate.js';
	import { getConfig, upsert as upsertTimeConfig } from '$lib/api/timeConfig.js';
	import { getStoreConfig, updateStoreConfig } from '$lib/api/store.js';
	import { logout } from '$lib/api/auth.js';
	import { withdraw } from '$lib/api/member.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';
	import { TIME_TYPE } from '$lib/utils/labels.js';

	const SEC = [
		['store', '매장 정보'],
		['slots', '근무 시간대'],
		['timeconfig', '근무 운영 설정'],
		['pay', '급여 규칙'],
		['notif', '알림'],
		['data', '데이터'],
		['account', '계정']
	];
	const secKeys = SEC.map(([k]) => k);
	/** TIME_TEMPLATE 알람 클릭 시 ?sec=slots로 들어온다(alarmNav.js 참고) - 유효한 섹션 키가
	 * 아니면 무시하고 기본값(store)으로 둔다. */
	const initialSec = page.url.searchParams.get('sec');
	let sec = $state(secKeys.includes(initialSec) ? initialSec : 'store');

	let slots = $state(/** @type {any[]} */ ([]));
	let timeConfig = $state(/** @type {any} */ (null));
	let storeConfig = $state(/** @type {any} */ (null));
	let savingSlots = $state(false);
	let savingConfig = $state(false);
	let savingStore = $state(false);

	onMount(async () => {
		try {
			slots = await getTimeTemplates($session.storeId);
		} catch {
			slots = [];
		}
		try {
			timeConfig = await getConfig($session.storeId);
		} catch {
			timeConfig = { minStaff: 1, responseDeadlineMinutes: 720, submitDeadlineDayOfWeek: 'THURSDAY' };
		}
		try {
			storeConfig = await getStoreConfig($session.storeId);
		} catch {
			storeConfig = { name: $session.storeName, address: '', tel: '' };
		}
	});

	async function saveStoreConfig() {
		if (!storeConfig.name?.trim()) return showToast('매장 이름을 적어 주세요');
		savingStore = true;
		try {
			storeConfig = await updateStoreConfig($session.storeId, {
				name: storeConfig.name.trim(),
				address: storeConfig.address?.trim() || null,
				tel: storeConfig.tel?.trim() || null
			});
			await session.selectStore($session.storeId);
			showToast('저장했어요');
		} catch (e) {
			showToast(e?.message || '저장에 실패했어요');
		} finally {
			savingStore = false;
		}
	}

	function slotFor(type) {
		return slots.find((s) => s.timeType === type) || { timeType: type, startTime: '09:00', endTime: '18:00' };
	}
	function setSlotTime(type, field, value) {
		const idx = slots.findIndex((s) => s.timeType === type);
		if (idx >= 0) slots[idx] = { ...slots[idx], [field]: value };
		else slots = [...slots, { timeType: type, startTime: '09:00', endTime: '18:00', [field]: value }];
	}

	async function saveSlots() {
		savingSlots = true;
		try {
			slots = await upsertTemplates(
				$session.storeId,
				['OPEN', 'NORMAL', 'CLOSE'].map((t) => {
					const s = slotFor(t);
					return { timeType: t, startTime: s.startTime, endTime: s.endTime };
				})
			);
			showToast('저장했어요 · 이 시간대로 등록된 직원 되는 시간은 초기화돼요');
		} catch (e) {
			showToast(e?.message || '저장에 실패했어요');
		} finally {
			savingSlots = false;
		}
	}

	async function saveTimeConfig() {
		savingConfig = true;
		try {
			timeConfig = await upsertTimeConfig($session.storeId, {
				minStaff: Number(timeConfig.minStaff),
				responseDeadlineMinutes: Number(timeConfig.responseDeadlineMinutes),
				submitDeadlineDayOfWeek: timeConfig.submitDeadlineDayOfWeek
			});
			showToast('저장했어요');
		} catch (e) {
			showToast(e?.message || '저장에 실패했어요');
		} finally {
			savingConfig = false;
		}
	}

	function tog(obj, key) {
		obj[key] = !obj[key];
	}

	function onWithdraw() {
		confirmBox('계정을 탈퇴할까요?', '카카오 연동이 풀리고 되돌릴 수 없어요.', '탈퇴', async () => {
			await withdraw();
			session.clear();
			await goto('/login');
		}, true);
	}

	async function doLogout() {
		await logout();
		session.clear();
		await goto('/login');
	}

	const DOWS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
	const DOW_KO = { MONDAY: '월', TUESDAY: '화', WEDNESDAY: '수', THURSDAY: '목', FRIDAY: '금', SATURDAY: '토', SUNDAY: '일' };
</script>

<svelte:head><title>설정 · WORKLEVEL</title></svelte:head>

<div class="hdr"><div><div class="eyebrow">{$session.storeName}</div><h1>설정</h1></div></div>

<div style="display:grid;grid-template-columns:200px minmax(0,1fr);gap:32px;align-items:start">
	<div class="setnav">
		{#each SEC as [k, l] (k)}
			<button class={sec === k ? 'on' : ''} onclick={() => (sec = k)}>{l}</button>
		{/each}
	</div>
	<div class="card w" style="padding:24px 28px">
		{#if sec === 'store' && storeConfig}
			<h3 style="margin-bottom:16px">매장 정보</h3>
			<div class="f" style="max-width:420px"><label>매장 이름</label><input bind:value={storeConfig.name} /></div>
			<div class="f" style="max-width:420px"><label>주소</label><input bind:value={storeConfig.address} /></div>
			<div class="f" style="max-width:420px"><label>전화번호</label><input bind:value={storeConfig.tel} /></div>
			<button class="btn p" disabled={savingStore} onclick={saveStoreConfig}>저장</button>
		{:else if sec === 'slots'}
			<h3 style="margin-bottom:16px">근무 시간대</h3>
			<p class="muted" style="margin-bottom:16px">시간대는 직원의 되는 시간 입력, 근무 넣기 화면에 쓰여요.</p>
			{#each ['OPEN', 'NORMAL', 'CLOSE'] as t (t)}
				<div class="f" style="max-width:420px">
					<label>{TIME_TYPE[t]}</label>
					<div class="inline">
						<input value={slotFor(t).startTime?.slice(0, 5)} onchange={(e) => setSlotTime(t, 'startTime', e.target.value)} />
						<input value={slotFor(t).endTime?.slice(0, 5)} onchange={(e) => setSlotTime(t, 'endTime', e.target.value)} />
					</div>
				</div>
			{/each}
			<button class="btn p" disabled={savingSlots} onclick={saveSlots}>저장</button>
		{:else if sec === 'timeconfig' && timeConfig}
			<h3 style="margin-bottom:16px">근무 운영 설정</h3>
			<div class="f" style="max-width:420px"><label>시간대별 최소 인원</label><input type="number" min="0" bind:value={timeConfig.minStaff} /></div>
			<div class="f" style="max-width:420px"><label>근무 요청 답 기한 (분)</label><input type="number" min="0" bind:value={timeConfig.responseDeadlineMinutes} /></div>
			<div class="f" style="max-width:420px">
				<label>되는 시간 입력 마감 요일</label>
				<div class="opts">
					{#each DOWS as d (d)}
						<button class={timeConfig.submitDeadlineDayOfWeek === d ? 'on' : ''} onclick={() => (timeConfig.submitDeadlineDayOfWeek = d)}>{DOW_KO[d]}</button>
					{/each}
				</div>
			</div>
			<button class="btn p" disabled={savingConfig} onclick={saveTimeConfig}>저장</button>
		{:else if sec === 'pay'}
			<h3 style="margin-bottom:16px">급여 규칙<span class="mock-badge">목업</span></h3>
			<div class="setrow"><div><div class="t">급여 지급일</div></div>
				<div class="opts">{#each [5, 10, 15, 25] as d (d)}<button class={$mock.paySettings.payday === d ? 'on' : ''} onclick={() => ($mock.paySettings.payday = d)}>{d}일</button>{/each}</div>
			</div>
			<div class="setrow"><div><div class="t">주휴수당 자동 계산</div></div><button class="toggle {$mock.paySettings.weeklyHoliday ? 'on' : ''}" onclick={() => tog($mock.paySettings, 'weeklyHoliday')}></button></div>
			<div class="setrow"><div><div class="t">야간수당(22~06시 ×1.5)</div></div><button class="toggle {$mock.paySettings.night ? 'on' : ''}" onclick={() => tog($mock.paySettings, 'night')}></button></div>
			<div class="setrow"><div><div class="t">연장수당(주 40h 초과 ×1.5)</div></div><button class="toggle {$mock.paySettings.overtime ? 'on' : ''}" onclick={() => tog($mock.paySettings, 'overtime')}></button></div>
			<div class="setrow"><div><div class="t">공제 방식</div></div>
				<div class="opts">{#each [['3.3', '3.3%'], ['4대', '4대보험'], ['none', '없음']] as [v, l] (v)}<button class={$mock.paySettings.deduct === v ? 'on' : ''} onclick={() => ($mock.paySettings.deduct = v)}>{l}</button>{/each}</div>
			</div>
		{:else if sec === 'notif'}
			<h3 style="margin-bottom:16px">알림<span class="mock-badge">목업</span></h3>
			{#each [['shiftReply', '근무 요청 답'], ['taskDone', '할 일 완료·답'], ['docExpiry', '서류 만료 30일 전'], ['dailySummary', '아침 요약']] as [k, l] (k)}
				<div class="setrow"><div><div class="t">{l}</div></div><button class="toggle {$mock.notifSettings[k] ? 'on' : ''}" onclick={() => tog($mock.notifSettings, k)}></button></div>
			{/each}
		{:else if sec === 'data'}
			<h3 style="margin-bottom:16px">데이터</h3>
			<div class="setrow">
				<div><div class="t">목업 데이터 초기화</div><div class="s">매출·공지·인수인계·사람구하기·급여 설정만 초기화돼요(실제 근무·직원 데이터는 그대로)</div></div>
				<button class="btn o sm" onclick={() => confirmBox('목업 데이터를 초기화할까요?', '', '초기화', () => { resetMock(); showToast('초기화했어요'); })}>초기화</button>
			</div>
		{:else if sec === 'account'}
			<h3 style="margin-bottom:16px">계정</h3>
			<div class="setrow"><div><div class="t">로그아웃</div></div><button class="btn o sm" onclick={doLogout}>로그아웃</button></div>
			<div class="setrow"><div><div class="t">계정 탈퇴</div><div class="s">모든 매장 티켓이 무효화돼요</div></div><button class="btn d sm" onclick={onWithdraw}>탈퇴</button></div>
		{/if}
	</div>
</div>
