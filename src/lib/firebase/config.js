/** Firebase 콘솔의 "웹 앱" 설정값. 서버 시크릿이 아니라 공개돼도 안전한 값들이라 클라이언트
 * 번들에 그대로 노출한다. static/firebase-messaging-sw.js의 firebaseConfig와 같은 값이어야 한다. */
export const firebaseConfig = {
	apiKey: 'AIzaSyB7wmc9FSLs9AsiDazGZZ-m4m5I_Z3-NYM',
	authDomain: 'worklv-642e9.firebaseapp.com',
	projectId: 'worklv-642e9',
	storageBucket: 'worklv-642e9.firebasestorage.app',
	messagingSenderId: '17872629728',
	appId: '1:17872629728:web:b47db4429627a1acbf0585'
};

/** 웹 푸시 인증서(클라우드 메시징 > 웹 구성)의 공개키. */
export const FIREBASE_VAPID_KEY =
	'BFgNp3jvw3PnVT4VV7jv6WPl85gxEOpqOkIFfbKCrvACfjCvPzxwVKfZcAHR0TcLY35hTZ9sElp18kEwNbFGohM';

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId && FIREBASE_VAPID_KEY);
