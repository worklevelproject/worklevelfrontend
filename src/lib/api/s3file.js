import { get, post } from './client.js';

export const createUploadPresign = (body) => post('/s3-files/presign', body); // {fileName, contentType, bucketType}
export const createDownloadPresign = (s3FileId) => get(`/s3-files/${s3FileId}/download-presign`);
export const createProtectedAccess = (s3FileIds) => post('/s3-files/protected-access', { s3FileIds });

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
