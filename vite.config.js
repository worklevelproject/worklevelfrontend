import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// 기본 Vite 규칙은 "VITE_" 접두사 붙은 값만 클라이언트 번들에 노출한다(서버 전용 시크릿이
	// 실수로 딸려나가는 걸 막는 안전장치). 이 프로젝트는 .env에 시크릿을 두지 않는 순수 SPA라
	// 접두사를 프로젝트 자체 이름들로 바꿨다 — 새 env 변수를 추가할 땐 여기 목록에도 추가해야
	// import.meta.env로 읽힌다.
	envPrefix: ['API_BASE_URL', 'CDN_BASE_URL', 'OAUTH2_CALLBACK_URL'],
	server: {
		port: 5173
	}
});
