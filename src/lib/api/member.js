import { del, patch } from './client.js';

export const withdraw = () => del('/members/me');
export const updateNickname = (nickname) => patch('/members/me/nickname', { nickname });
