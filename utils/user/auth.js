import {
	apiGetUserInfo,
	apiGetUserVip,
	apiModifyMemberNum
} from '@/api/api.js';
import {
	hasValidToken
} from '@/utils/request.js';
import {
	isActiveVipMember,
	parseExpirationTime,
	parseVipApiData
} from '@/utils/user/useVipInfo.js';

/** 读取本地 VIP 缓存（兼容字符串 JSON） */
const readVipCache = () => {
	const raw = uni.getStorageSync('userVipInfoStorage');
	if (!raw) return null;
	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	}
	return raw;
};

/** 根据 VIP 接口数据判断是否有效会员 */
const isVipFromData = (vipData) => isActiveVipMember(vipData);

/**
 * 登录状态检查（仅用户主动操作时可弹窗引导登录）
 * @param {Boolean} showToast - 是否显示登录提示弹窗
 * @returns {Boolean} 是否已登录
 */
export const checkLogin = (showToast = true) => {
	const userId = uni.getStorageSync("userIdStorage");
	if (!hasValidToken() || !userId) {
		if (showToast) {
			uni.showModal({
				title: '请登录后体验完整功能',
				content: '是否前往登录？',
				success: function(res) {
					if (res.confirm) {
						uni.navigateTo({
							url: "/pages/user/login"
						});
					}
				}
			});
		}
		return false;
	}
	return true;
};

/**
 * 获取VIP信息（优先缓存）
 * @returns {Promise<Object>} VIP信息
 */
async function getVipInfo() {
	const cachedVip = readVipCache();

	// 缓存仍为有效会员时直接使用（与会员页 parseExpirationTime 逻辑一致）
	if (cachedVip && isVipFromData(cachedVip)) {
		return cachedVip;
	}

	try {
		const res = await apiGetUserVip();
		const vipData = parseVipApiData(res);
		if (vipData) {
			uni.setStorageSync("userVipInfoStorage", vipData);
			return vipData;
		}
	} catch (err) {
		console.error('获取VIP信息失败：', err);
	}

	return cachedVip || {};
}

/**
 * 统一检查会员 + 体验次数
 * @returns {Promise<{isVip: boolean, expirationTime: number, trialNum: number}>}
 */
export async function checkMemberAndTrial() {
	// 先检查登录，没登录直接抛错/返回默认值
	if (!checkLogin(false)) {
		return {
			isVip: false,
			expirationTime: 0,
			trialNum: 0
		};
	}

	const userId = uni.getStorageSync("userIdStorage");
	try {
		const vipData = await getVipInfo();
		const isVip = isVipFromData(vipData);
		const exp = vipData?.expirationTime ?? vipData?.expireTime ?? vipData?.expireAt;
		const expirationTime = parseExpirationTime(exp);

		if (!isVip) {
			const userInfoRes = await apiGetUserInfo(userId);
			const trialNum = Number(userInfoRes.data?.data?.num) ?? 0;
			return {
				isVip: false,
				expirationTime: 0,
				trialNum
			};
		}

		return {
			isVip: true,
			expirationTime,
			trialNum: 0
		};
	} catch (err) {
		console.error('checkMemberAndTrial 请求异常：', err);
		// 接口异常时返回默认安全值，防止页面崩溃
		return {
			isVip: false,
			expirationTime: 0,
			trialNum: 0
		};
	}
}

/**
 * 请求前权限检查（会员/体验次数）
 * @returns {Promise<Boolean>} 是否有权限继续操作
 */
export async function beforeRequestCheck() {
	// 先检查登录
	if (!checkLogin()) return false;

	try {
		const {
			isVip,
			trialNum
		} = await checkMemberAndTrial();

		// 是会员 OR 体验次数 < 2 → 允许使用
		if (isVip || trialNum < 2) return true;

		// 体验次数用完
		uni.showModal({
			title: '提示',
			content: '体验次数已用完，开通会员继续使用',
			confirmText: '去开通',
			success: (res) => {
				if (res.confirm) {
					uni.navigateTo({
						url: '/pages/my/member/index'
					});
				}
			}
		});
		return false;

	} catch (err) {
		console.error('权限检查失败：', err);
		return false;
	}
}

/**
 * 体验次数 +1 操作
 * @returns {Promise<void>}
 */
export async function addTrialNum() {
	const token = uni.getStorageSync("token")
	const userId = uni.getStorageSync('userIdStorage');

	if (!userId) {
		console.error('【addTrialNum】错误：用户未登录，无 userId');
		return;
	}

	try {
		// 调用接口获取当前次数
		const res = await apiGetUserInfo(userId);
		console.log('获取用户信息接口返回：', res);

		// 安全取值
		const currentNum = Number(res.data?.data?.num) || 0;
		console.log('当前体验次数：', currentNum);

		const newNum = currentNum + 1;

		const resNum = await apiModifyMemberNum({
			userId: userId,
			num: newNum
		});

	} catch (err) {
		console.error('【addTrialNum】次数更新失败：', err);
	}
}

/**
 * 用户写操作前置守卫（登录 + 新建时的会员/体验次数）
 * @param {'create'|'update'|'delete'} action
 * @returns {Promise<boolean>}
 */
export async function guardWriteAction(action = 'update') {
	if (action === 'create') {
		return beforeRequestCheck();
	}
	return checkLogin();
}

/**
 * 新建类操作成功后，非会员增加体验次数
 */
export async function onCreateSuccess() {
	try {
		const {
			isVip
		} = await checkMemberAndTrial();
		if (!isVip) {
			await addTrialNum();
		}
	} catch (err) {
		console.error('【onCreateSuccess】体验次数更新失败：', err);
	}
}

/** 支付/开通会员成功后调用，强制下次重新拉 /vip */
export const clearVipCache = () => {
	try {
		uni.removeStorageSync('userVipInfoStorage');
	} catch (e) {
		console.warn('[clearVipCache]', e);
	}
};

export default {
	checkLogin,
	checkMemberAndTrial,
	beforeRequestCheck,
	addTrialNum,
	guardWriteAction,
	onCreateSuccess,
	clearVipCache
};