import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging';
import { firebaseConfig, FIREBASE_VAPID_KEY, isFirebaseConfigured } from './config.js';
import { registerFcmToken } from '../api/fcmToken.js';
import { ApiError } from '../api/client.js';

let messagingPromise;

/** 이 브라우저가 FCM 웹 푸시를 지원하고, 설정값도 채워져 있을 때만 messaging 인스턴스를
 * 만든다(Safari 등 미지원 브라우저나 로컬 개발 중 .env 미설정 상태에서 조용히 꺼진 채로
 * 동작하게 하려는 목적 — 둘 중 하나라도 아니면 이후 모든 함수가 아무 일도 하지 않는다). */
function getMessagingInstance() {
	if (!messagingPromise) {
		messagingPromise = (async () => {
			if (!isFirebaseConfigured || typeof window === 'undefined') return null;
			if (!(await isSupported().catch(() => false))) return null;
			const app = getApps()[0] ?? initializeApp(firebaseConfig);
			return getMessaging(app);
		})();
	}
	return messagingPromise;
}

/** 알림 권한을 요청하고(이미 허용/거부된 상태면 그 값 그대로), 허용됐으면 이 기기의 FCM
 * 토큰을 발급받아 백엔드에 등록한다. 서비스워커 등록도 여기서 함께 처리한다. 실패해도
 * 앱 사용 자체엔 지장이 없어야 하므로 예외를 던지지 않고 조용히 넘어간다. */
export async function setupPushNotifications() {
	try {
		const messaging = await getMessagingInstance();
		if (!messaging) return;
		if (Notification.permission === 'default') {
			await Notification.requestPermission();
		}
		if (Notification.permission !== 'granted') return;

		const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
		await registerToken(messaging, registration);
	} catch (e) {
		console.warn('FCM 푸시 설정 실패(무시하고 진행):', e);
	}
}

async function registerToken(messaging, registration, { retried = false } = {}) {
	const token = await getToken(messaging, { vapidKey: FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
	if (!token) return;
	try {
		await registerFcmToken(token);
	} catch (e) {
		// 410: 서버 장부에서 soft delete된 토큰값 - SDK가 캐시해둔 토큰을 버리고 한 번만 재발급 시도
		if (e instanceof ApiError && e.status === 410 && !retried) {
			await deleteToken(messaging);
			await registerToken(messaging, registration, { retried: true });
			return;
		}
		throw e;
	}
}

/** 앱이 포그라운드(탭이 열려 활성 상태)일 때 도착한 푸시를 받는다. 백그라운드/탭 비활성
 * 상태의 푸시는 static/firebase-messaging-sw.js가 대신 처리한다(OS 알림으로 표시).
 * @param {(payload: {notification?: {title?: string, body?: string}, data?: Record<string,string>}) => void} callback
 * @returns {Promise<() => void>} 리스너 해제 함수(구독 실패 시 no-op)
 */
export async function onForegroundAlarmPush(callback) {
	const messaging = await getMessagingInstance();
	if (!messaging) return () => {};
	return onMessage(messaging, callback);
}
