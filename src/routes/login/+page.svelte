<script>
	import { goToKakaoLogin } from '$lib/api/auth.js';
</script>

<svelte:head><title>로그인 · WORKLEVEL</title></svelte:head>

<div class="login">
	<div class="l">
		<div class="mark">WORKLEVEL</div>
		<h1>카페의 오늘을 관리하고, 근무 데이터를 경력으로.</h1>
		<p>근무표·출퇴근·할 일·레시피를 한곳에서. 쌓인 기록은 퇴사 시점에 직원의 확인된 경력이 됩니다.</p>
	</div>
	<div class="r">
		<div class="box">
			<h2>로그인</h2>
			<p class="muted">카카오 계정으로 로그인합니다</p>
			<button class="kakao-btn" onclick={goToKakaoLogin}>카카오로 시작하기</button>
			<p class="tiny muted" style="margin-top:16px">
				처음이면 카카오 로그인 후 자동으로 회원가입돼요. 매장은 다음 화면에서 만들거나 초대코드로 들어갈 수 있어요.
			</p>
		</div>
	</div>
</div>
