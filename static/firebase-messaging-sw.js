// 백그라운드(탭이 닫혔거나 비활성 상태)에서 도착한 FCM 푸시를 OS 알림으로 띄우고, 그 알림을
// 클릭했을 때 앱을 열어 해당 알람으로 이동시키는 서비스워커.
//
// 서비스워커는 .env를 읽을 수 없어서(빌드 시 치환되는 import.meta.env가 여기선 동작하지 않음)
// 아래 firebaseConfig를 직접 채워 둔다 — 이 값들은 서버 시크릿이 아니라 공개돼도 안전한 값
// (Firebase 콘솔 웹 앱 설정)이라 하드코딩해도 문제없다. src/lib/firebase/config.js와 같은 값이어야 한다.
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
	apiKey: 'AIzaSyB7wmc9FSLs9AsiDazGZZ-m4m5I_Z3-NYM',
	authDomain: 'worklv-642e9.firebaseapp.com',
	projectId: 'worklv-642e9',
	storageBucket: 'worklv-642e9.firebasestorage.app',
	messagingSenderId: '17872629728',
	appId: '1:17872629728:web:b47db4429627a1acbf0585'
});

const messaging = firebase.messaging();

// AlarmPushService(백엔드)는 data로 {alarmId, refType, refId?, storeId?}를 실어 보낸다
// (refId/storeId는 브로드캐스트 알람 등에서 nullable). 클릭 시 이 값들을 그대로 쿼리스트링에
// 실어 앱을 열고, 실제 이동(+필요하면 매장 전환)은 로그인된 앱 쪽 goToPushAlarm이 처리한다
// (서비스워커는 인증 토큰에 접근할 수 없어 API를 직접 못 부른다).
messaging.onBackgroundMessage((payload) => {
	const title = payload.notification?.title || '새 알림';
	const body = payload.notification?.body || '';
	const { alarmId, refType, refId, storeId } = payload.data || {};

	const url = alarmId
		? `/?${new URLSearchParams({ openAlarmId: alarmId, ...(refType && { refType }), ...(refId && { refId }), ...(storeId && { storeId }) })}`
		: '/';

	self.registration.showNotification(title, { body, data: { url } });
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url || '/';
	const targetUrl = new URL(url, self.location.origin).href;

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			const existing = clientList.find((c) => c.url.startsWith(self.location.origin));
			if (existing) {
				if ('navigate' in existing) existing.navigate(targetUrl);
				return existing.focus();
			}
			return self.clients.openWindow(targetUrl);
		})
	);
});
