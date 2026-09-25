<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';
	import { consentPrivacy, getMyPersonalInfo, saveMyPersonalInfo } from '$lib/api/privacy.js';
	import { showToast } from '$lib/stores/toast.js';

	// 초대 코드로 가입한 직원이 처음 한 번 거치는 화면: 개인정보 수집·이용 동의 + 기본 인적사항 입력.
	// 동의 전에는 직원 화면에 들어갈 수 없다(ProtectedLayout 가드, session.privacyConsented).
	// 동의와 개인정보는 회원 단위라 한 번 하면 모든 매장에 적용되고, 개인정보는 서버에 암호화 저장된다.
	// 동의 문구를 고치면 lib/api/privacy.js의 PRIVACY_CONSENT_VERSION도 바꾼다.

	/** 이미 동의·입력을 마친 사람이 "내 정보 > 개인정보"로 들어와 고치는 경우 */
	const alreadyConsented = $session.privacyConsented;

	let name = $state('');
	let phone = $state('');
	let birth = $state('');
	let agreed = $state(alreadyConsented);
	let saving = $state(false);
	let err = $state('');

	onMount(async () => {
		if (!alreadyConsented) return;
		try {
			const info = await getMyPersonalInfo($session.storeId);
			name = info?.realName || '';
			phone = info?.phone || '';
			birth = info?.birthDate || '';
		} catch {
			/* 아직 입력 전이면 빈 칸으로 둔다 */
		}
	});

	async function submit() {
		if (!agreed) return (err = '개인정보 수집·이용에 동의해야 시작할 수 있어요');
		if (!name.trim()) return (err = '이름을 적어 주세요');
		if (!/^01\d-?\d{3,4}-?\d{4}$/.test(phone.trim())) return (err = '휴대전화 번호를 확인해 주세요');
		if (!birth) return (err = '생년월일을 넣어 주세요');
		saving = true;
		err = '';
		try {
			// 개인정보 입력은 동의한 뒤에만 가능하다
			if (!alreadyConsented) {
				await consentPrivacy($session.storeId);
				session.markPrivacyConsented();
			}
			await saveMyPersonalInfo($session.storeId, { realName: name.trim(), phone: phone.trim(), birthDate: birth });
			showToast(alreadyConsented ? '저장했어요' : '환영해요!');
			await goto(alreadyConsented ? '/staff/me' : '/staff/today');
		} catch (e) {
			err = e?.message || '저장하지 못했어요';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>개인정보 입력 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">{$session.storeName} · {alreadyConsented ? '내 정보' : '처음 한 번만 입력해요'}</div>
		<h1>{alreadyConsented ? '내 개인정보' : '시작하기 전에'}</h1>
	</div>
</div>

<div class="card w" style="max-width:640px;padding:24px 28px">
	<h3 style="margin-bottom:12px">개인정보 수집·이용 동의 (필수)</h3>
	<div class="note" style="margin-bottom:12px">
		<b style="font-weight:500;color:var(--carbon)">수집 항목</b> 이름, 휴대전화 번호, 생년월일<br />
		<b style="font-weight:500;color:var(--carbon)">수집·이용 목적</b> 근무 일정 관리, 출퇴근 기록, 급여 계산과 지급, 매장과의 연락, 근로계약 관련 서류 관리<br />
		<b style="font-weight:500;color:var(--carbon)">보유·이용 기간</b> 퇴사일로부터 3년(근로기준법 제42조에 따른 근로자 명부·계약 서류 보존 기간). 기간이 지나면 지체 없이 파기해요.<br />
		<b style="font-weight:500;color:var(--carbon)">동의를 거부할 권리</b> 동의하지 않을 수 있어요. 다만 근무·급여 관리에 꼭 필요한 정보라, 동의하지 않으면 직원 화면을 쓸 수 없어요.
	</div>
	<label class="tiny" style="display:flex;gap:8px;align-items:center;margin-bottom:20px;cursor:pointer">
		<input type="checkbox" bind:checked={agreed} disabled={alreadyConsented} />
		위 내용을 읽었고 개인정보 수집·이용에 동의해요{alreadyConsented ? ' (동의함)' : ''}
	</label>

	<div class="f"><label for="pv-name">이름 (실명)</label><input id="pv-name" bind:value={name} maxlength="50" autocomplete="name" /></div>
	<div class="f"><label for="pv-phone">휴대전화 번호</label><input id="pv-phone" bind:value={phone} inputmode="tel" placeholder="010-0000-0000" autocomplete="tel" /></div>
	<div class="f"><label for="pv-birth">생년월일</label><input id="pv-birth" type="date" bind:value={birth} /></div>
	{#if err}<p class="f err">{err}</p>{/if}
	<button class="btn p" disabled={saving} onclick={submit}>{alreadyConsented ? '저장' : '동의하고 시작하기'}</button>
	<p class="tiny muted" style="margin-top:12px">입력한 정보는 암호화해 저장하고, 내가 일하는 매장의 점주만 볼 수 있어요. 한 번 입력하면 모든 매장에 똑같이 쓰여요. 표시 이름(별칭)은 다른 직원에게 보이는 이름이라 여기와 따로예요.</p>
</div>
