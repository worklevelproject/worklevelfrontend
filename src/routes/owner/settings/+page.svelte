<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.js';
	import { mock, resetMock } from '$lib/stores/mock.js';
	import { getTemplates as getTimeTemplates, upsertTemplates } from '$lib/api/timeTemplate.js';
	import { getStoreConfig, updateStoreConfig } from '$lib/api/store.js';
	import { logout } from '$lib/api/auth.js';
	import { withdraw } from '$lib/api/member.js';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';
	import { TIME_TYPE } from '$lib/utils/labels.js';

	// 운영 시간대는 매장 정보 안으로 합쳤고, 근무 운영 설정(최소 인원·응답 기한)은 화면에서 뺐다(피드백).
	const SEC = [
		['store', '매장 정보'],
		['pay', '급여 규칙'],
		['notif', '알림'],
		['data', '데이터'],
		['account', '계정']
	];
	const secKeys = SEC.map(([k]) => k);
	/** ?sec=<키>로 섹션을 고른다(TIME_TEMPLATE 알람, 사이드바의 점주 칩 등 - alarmNav.js/Sidebar 참고).
	 * 이미 설정 화면에 있을 때 링크를 눌러도 따라가도록 URL을 계속 본다. 유효한 키가 아니면 store. */
	let sec = $state('store');
	$effect(() => {
		const q = page.url.searchParams.get('sec');
		sec = secKeys.includes(q) ? q : 'store';
	});

	let slots = $state(/** @type {any[]} */ ([]));
	let storeConfig = $state(/** @type {any} */ (null));
	let savingSlots = $state(false);
	let savingStore = $state(false);

	onMount(async () => {
		try {
			slots = await getTimeTemplates($session.storeId);
		} catch {
			slots = [];
		}
		try {
			storeConfig = await getStoreConfig($session.storeId);
		} catch {
			storeConfig = { name: $session.storeName, address: '', tel: '', applyWeeklyHolidayAllowance: false, applyNightAllowance: false, applyHolidayAllowance: false };
		}
	});

	async function saveStoreConfig() {
		if (!storeConfig.name?.trim()) return showToast('매장 이름을 적어 주세요');
		savingStore = true;
		try {
			storeConfig = await updateStoreConfig($session.storeId, {
				name: storeConfig.name.trim(),
				address: storeConfig.address?.trim() || null,
				tel: storeConfig.tel?.trim() || null,
				applyWeeklyHolidayAllowance: !!storeConfig.applyWeeklyHolidayAllowance,
				applyNightAllowance: !!storeConfig.applyNightAllowance,
				applyHolidayAllowance: !!storeConfig.applyHolidayAllowance
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
				['OPEN', 'AFTERNOON', 'CLOSE'].map((t) => {
					const s = slotFor(t);
					return { timeType: t, startTime: s.startTime, endTime: s.endTime };
				})
			);
			showToast('저장했어요');
		} catch (e) {
			showToast(e?.message || '저장에 실패했어요');
		} finally {
			savingSlots = false;
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

			<h3 style="margin:32px 0 8px">운영 시간대</h3>
			<p class="muted" style="margin-bottom:16px">근무 넣기에서 시간대를 고르면 이 시간이 기본으로 채워져요.</p>
			{#each ['OPEN', 'AFTERNOON', 'CLOSE'] as t (t)}
				<div class="f" style="max-width:420px">
					<label>{TIME_TYPE[t]}</label>
					<div class="inline">
						<input value={slotFor(t).startTime?.slice(0, 5)} onchange={(e) => setSlotTime(t, 'startTime', e.target.value)} />
						<input value={slotFor(t).endTime?.slice(0, 5)} onchange={(e) => setSlotTime(t, 'endTime', e.target.value)} />
					</div>
				</div>
			{/each}
			<button class="btn p" disabled={savingSlots} onclick={saveSlots}>운영 시간대 저장</button>
		{:else if sec === 'pay'}
			<h3 style="margin-bottom:16px">수당 계산</h3>
			{#if storeConfig}
				<p class="muted" style="margin-bottom:8px">켠 수당만 급여 계산에 들어가요. 계산하는 시점의 설정이 그 기록에 함께 남아서, 나중에 바꿔도 이미 계산된 급여는 그대로예요.</p>
				<div class="setrow"><div><div class="t">주휴수당</div></div><button class="toggle {storeConfig.applyWeeklyHolidayAllowance ? 'on' : ''}" onclick={() => tog(storeConfig, 'applyWeeklyHolidayAllowance')}></button></div>
				<div class="setrow"><div><div class="t">야간수당</div></div><button class="toggle {storeConfig.applyNightAllowance ? 'on' : ''}" onclick={() => tog(storeConfig, 'applyNightAllowance')}></button></div>
				<div class="setrow"><div><div class="t">휴일수당</div></div><button class="toggle {storeConfig.applyHolidayAllowance ? 'on' : ''}" onclick={() => tog(storeConfig, 'applyHolidayAllowance')}></button></div>
				<button class="btn p" style="margin:12px 0 24px" disabled={savingStore} onclick={saveStoreConfig}>수당 설정 저장</button>
			{/if}
			<h3 style="margin-bottom:4px">급여 규칙<span class="mock-badge">목업</span></h3>
			<p class="muted" style="margin-bottom:8px">급여 지급일 3일 전, 1일 전, 당일에 알림을 드려요. 공제 방식은 직원 상세에서 직원마다 정해요.</p>
			<div class="setrow"><div><div class="t">급여 지급일</div></div>
				<div class="opts">{#each [5, 10, 15, 25] as d (d)}<button class={$mock.paySettings.payday === d ? 'on' : ''} onclick={() => ($mock.paySettings.payday = d)}>{d}일</button>{/each}</div>
			</div>
		{:else if sec === 'notif'}
			<h3 style="margin-bottom:16px">알림<span class="mock-badge">목업</span></h3>
			{#each [['shiftReply', '근무 요청 답'], ['taskDone', '할 일 완료·답'], ['docExpiry', '서류 만료 30일 전']] as [k, l] (k)}
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
