import { apiGetUserInfo } from '@/api/api.js';
import { extractLoginSession } from '@/utils/user/authHelper.js';
import { clearAuthStorage } from '@/utils/user/authStorage.js';
import { resolveHasPassword } from '@/utils/user/passwordStatus.js';

/** 从接口 body 取错误文案 */
export const getApiMessage = (body, fallback = '操作失败') => {
	return body?.message || body?.msg || fallback;
};

/**
 * 登录/注册成功后写入本地会话
 * @param {Object} body - res.data（业务层）
 */
export const persistAuthSession = (body) => {
	const { token, userId, payload } = extractLoginSession(body);
	const data = payload ?? body?.data ?? body ?? {};

	if (!token) {
		console.warn('[persistAuthSession] 未获取到 token', body);
		return { token: '', userId, userInfo: null };
	}

	uni.setStorageSync('token', token);
	if (userId) {
		uni.setStorageSync('userIdStorage', userId);
	}

	const userInfo = {
		id: userId || '',
		phone: data.phone ?? '',
		nickname: data.nickname ?? '云途汇水印用户',
		avatar: data.image ?? data.avatar ?? '/static/logo.png',
		level: data.level ?? '普通用户',
		expireDate: data.expireDate ?? '',
		useCount: Number(data.num) || 0,
		favorites: Number(data.favorites) || 0,
		points: Number(data.points) || 0,
		hasPassword: resolveHasPassword(data, false)
	};

	uni.setStorageSync('userInfo', userInfo);
	uni.setStorageSync('userInfoStorage', data);

	return { token, userId, userInfo };
};

/** 清除本地登录态（退出登录 / 注销账号后调用） */
export const clearAuthSession = () => {
	clearAuthStorage();
};

/** 登录后拉取最新用户信息并合并到本地 */
export const refreshUserProfile = async (userId) => {
	const id = userId ?? uni.getStorageSync('userIdStorage');
	if (!id) return null;

	try {
		const res = await apiGetUserInfo(id);
		const body = res.data;
		const user = body?.data ?? body;
		if (!user || typeof user !== 'object') return null;

		const prev = uni.getStorageSync('userInfo') || {};
		const userInfo = {
			...prev,
			id: String(user.id ?? id),
			phone: user.phone ?? prev.phone,
			nickname: user.nickname ?? prev.nickname,
			avatar: user.image ?? user.avatar ?? prev.avatar,
			useCount: Number(user.num) || prev.useCount || 0,
			email: user.email ?? prev.email ?? '',
			hasPassword: resolveHasPassword(user, resolveHasPassword(prev, false))
		};
		uni.setStorageSync('userInfo', userInfo);
		uni.setStorageSync('userInfoStorage', user);
		return userInfo;
	} catch (e) {
		console.warn('[refreshUserProfile]', e);
		return null;
	}
};
