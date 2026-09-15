import { get, post } from './client.js';

/** PROTECTED 파일을 실제로 조회해주는 Cloudflare Worker 주소. 비어 있으면 PROTECTED 이미지를 못 띄운다. */
export const CDN_BASE_URL = import.meta.env.CDN_BASE_URL || '';

export const createUploadPresign = (body) => post('/s3-files/presign', body); // {fileName, contentType, bucketType}
export const createDownloadPresign = (s3FileId) => get(`/s3-files/${s3FileId}/download-presign`);
export const createProtectedAccess = (s3FileIds) => post('/s3-files/protected-access', { s3FileIds });

/**
 * PROTECTED 파일들을 실제 이미지 바이트까지 받아 blob object URL로 반환한다.
 * `POST /s3-files/protected-access`로 파일마다 {key, token}을 발급받은 뒤, CDN Worker에
 * `${CDN_BASE_URL}/${key}`를 커스텀 헤더 `token: <token>`으로 요청한다(Authorization 아님 —
 * Worker가 `request.headers.get("token")`으로 읽고, HS256 서명·`sub===key`·`approved===true`·
 * 만료를 검증한다). `<img src>`에 직접 걸 수 없는 커스텀 헤더 요청이라 fetch로 받아 object URL로
 * 바꿔야 한다 — 다 쓴 뒤에는 `URL.revokeObjectURL`로 정리해야 한다(컴포넌트 destroy 시점 등).
 * @param {number[]} s3FileIds
 * @returns {Promise<Record<number, string>>} s3FileId -> blob object URL
 */
export async function loadProtectedImages(s3FileIds) {
	if (!s3FileIds?.length) return {};
	if (!CDN_BASE_URL) throw new Error('CDN 주소(CDN_BASE_URL)가 설정되지 않았어요');
	const accesses = await createProtectedAccess(s3FileIds);
	const entries = await Promise.all(
		accesses.map(async (a) => {
			const res = await fetch(`${CDN_BASE_URL}/${a.key}`, { headers: { token: a.token } });
			if (!res.ok) throw new Error('이미지를 불러오지 못했어요');
			const blob = await res.blob();
			return [a.s3FileId, URL.createObjectURL(blob)];
		})
	);
	return Object.fromEntries(entries);
}

/**
 * presign 발급 → 그 URL로 PUT 업로드까지 한 번에 처리하는 헬퍼.
 * bucketType: 'PUBLIC' | 'PRIVATE' | 'PROTECTED'
 * @returns {Promise<number>} s3FileId
 */
export async function uploadFile(file, bucketType) {
	const presign = await createUploadPresign({
		fileName: file.name,
		contentType: file.type || 'application/octet-stream',
		bucketType
	});
	const res = await fetch(presign.presignedUrl, {
		method: 'PUT',
		headers: { 'Content-Type': file.type || 'application/octet-stream' },
		body: file
	});
	if (!res.ok) throw new Error('파일 업로드 실패');
	// S3FileWebhookController가 업로드 완료를 비동기로 반영하므로, 완료 처리에는 약간의 지연이 있을 수 있다.
	return presign.s3FileId;
}
