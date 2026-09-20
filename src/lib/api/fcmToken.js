import { post } from './client.js';

/** 이 브라우저의 FCM 토큰을 현재 로그인 세션에 등록한다. 백엔드가 soft delete된(만료
 * 취급된) 토큰값이면 410을 던지는데, 그 경우 SDK에서 토큰을 재발급받아 다시 호출해야
 * 한다(ApiError.status === 410로 호출부에서 구분). */
export const registerFcmToken = (token) => post('/fcm-tokens', { token });
