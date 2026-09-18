/** Firebase 콘솔의 "웹 앱" 설정값. 서버 시크릿이 아니라 공개돼도 안전한 값들이라 클라이언트
 * 번들에 그대로 노출한다(.env.example 참고). 값이 비어 있으면(개발 중 아직 안 채운 경우)
 * messaging.js가 조용히 초기화를 건너뛴다. */
export const firebaseConfig = {
	apiKey: import.meta.env.FIREBASE_API_KEY || '',
	authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN || '',
	projectId: import.meta.env.FIREBASE_PROJECT_ID || '',
	storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET || '',
	messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID || '',
	appId: import.meta.env.FIREBASE_APP_ID || ''
};

export const FIREBASE_VAPID_KEY = import.meta.env.FIREBASE_VAPID_KEY || '';

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId && FIREBASE_VAPID_KEY);
