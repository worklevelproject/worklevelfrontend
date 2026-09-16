/** 환경변수로 받은 base URL에 스킴(`https://`)이 빠져 있으면 자동으로 붙인다.
 * 스킴 없이 `${base}${path}`처럼 문자열을 이어 붙이면 브라우저가 절대 URL이 아니라
 * 현재 페이지 기준 상대 경로로 해석해버려서(예: `/owner/recipes/<도메인>/...`처럼 깨짐)
 * fetch/리다이렉트가 엉뚱한 곳으로 나간다. */
export function withScheme(url) {
	if (!url) return url;
	return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
