// 완전 클라이언트 렌더 SPA. accessToken은 메모리에만 있고 로그인 판단도 브라우저에서만
// 하므로, 서버사이드 렌더링/프리렌더링은 의미가 없다(백엔드 API 서버와 완전히 분리된 구조).
export const ssr = false;
export const prerender = false;
