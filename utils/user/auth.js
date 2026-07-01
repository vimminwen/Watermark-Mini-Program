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

/** 非会员可免费体验次数上限（已用次数达到该值则不可继续） */
export const TRIAL_USE_LIMIT = 2;

const MEMBER_RECHARGE_URL = '/pages/member/recharge';

/** 解析后端返回的体验次数，无效时返回 null */
const parseTrialNum = (value) => {
	if (value === null || value === undefined || value === '') return null;
	const num = Number(value);
	if (!Number.isFinite(num) || num < 0) return null;
	return Math.floor(num);
};

/** 拉取非会员已用体验次数，失败或无效返回 null */
const fetchTrialNum = async (userId) => {
	const userInfoRes = await apiGetUserInfo(userId);
	const raw =
		userInfoRes?.data?.data?.num ??
		userInfoRes?.data?.num ??
		userInfoRes?.data?.data?.trialNum ??
		userInfoRes?.data?.trialNum;
	return parseTrialNum(raw);
};

/** 非会员是否仍有体验次数（获取不到次数视为已用完） */
const canUseByTrial = ({ isVip, trialNum }) => {
	if (isVip) return true;
	if (trialNum === null || trialNum === undefined) return false;
	return trialNum < TRIAL_USE_LIMIT;
};

/** 体验次数用尽弹窗，确定后跳转会员充值 */
export const showTrialExhaustedModal = () => {
	uni.showModal({
		title: '提示',
		content: '体验次数已经用完，是否开通会员',
		confirmText: '开通会员',
		success: (res) => {
			if (res.confirm) {
				uni.navigateTo({ url: MEMBER_RECHARGE_URL });
			}
		}
	});
};

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
			let trialNum = null;
			try {
				trialNum = await fetchTrialNum(userId);
			} catch (err) {
				console.error('获取体验次数失败：', err);
			}
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
		return {
			isVip: false,
			expirationTime: 0,
			trialNum: null
		};
	}
}

/**
 * 上传图片前权限检查（登录 + 会员/体验次数）
 * @returns {Promise<Boolean>} 是否允许继续选图
 */
export async function beforeUploadCheck() {
	if (!checkLogin()) return false;

	try {
		const result = await checkMemberAndTrial();
		if (canUseByTrial(result)) return true;
		showTrialExhaustedModal();
		return false;
	} catch (err) {
		console.error('上传权限检查失败：', err);
		showTrialExhaustedModal();
		return false;
	}
}

/**
 * 请求前权限检查（会员/体验次数）
 * @returns {Promise<Boolean>} 是否有权限继续操作
 */
export async function beforeRequestCheck() {
	return beforeUploadCheck();
}

/**
 * 体验次数 +1 操作
 * @returns {Promise<void>}
 */
export async function addTrialNum() {
	const userId = uni.getStorageSync('userIdStorage');

	if (!userId) {
		console.error('【addTrialNum】错误：用户未登录，无 userId');
		return;
	}

	try {
		const currentNum = await fetchTrialNum(userId);
		if (currentNum === null) {
			console.error('【addTrialNum】无法获取有效体验次数，跳过更新');
			return;
		}

		await apiModifyMemberNum({
			userId,
			num: currentNum + 1
		});
	} catch (err) {
		console.error('【addTrialNum】次数更新失败：', err);
	}
}

/**
 * 功能使用成功后记录体验次数（非会员 +1，不阻塞 UI）
 */
export const recordTrialUseAfterSuccess = () => {
	onCreateSuccess().catch((err) => {
		console.error('【recordTrialUseAfterSuccess】', err);
	});
};

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
	beforeUploadCheck,
	beforeRequestCheck,
	addTrialNum,
	recordTrialUseAfterSuccess,
	guardWriteAction,
	onCreateSuccess,
	clearVipCache,
	showTrialExhaustedModal,
	TRIAL_USE_LIMIT
};