import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// SPA 빌드: 백엔드는 REST API만 제공하고, 이 프론트는 정적 파일로 어디서든 서빙 가능해야 한다.
		// (worklevel-src 프로토타입도 "더블클릭하면 바로 열리는" 정적 파일이었던 것과 같은 방향)
		adapter: adapter({
			fallback: 'index.html'
		})
	}
};

export default config;
