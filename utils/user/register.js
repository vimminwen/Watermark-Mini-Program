// 微信快捷登录时的自动注册工具
import {
	apiRegister,
	apiPhoneLogin
} from '@/api/api.js';
import { getOpenId } from './openId.js';
import {
	isApiSuccess,
	isUserExistsMessage
} from './authHelper.js';

/**
 * 生成默认密码（微信快捷注册留空，后续可在个人中心设置）
 */
const generateDefaultPassword = () => '';

/**
 * 生成默认昵称（微信用户+手机号后4位）
 */
const generateDefaultNickname = (phone) => {
	const suffix = phone ? phone.slice(-4) : Math.floor(Math.random() * 10000);
	return `微信用户${suffix}`;
};

/**
 * openId + 手机号快捷登录
 */
const loginByOpenIdAndPhone = async (openId, phone) => {
	const loginRes = await apiPhoneLogin({
		openId,
		phone
	});
	const loginData = loginRes.data;
	if (!isApiSuccess(loginData)) {
		throw {
			message: loginData?.message || loginData?.msg || '自动登录失败',
			type: 'BUSINESS_ERROR',
			data: loginData
		};
	}
	return loginData;
};

/**
 * 自动注册并登录（微信手机号快捷登录未注册时调用）
 * @param {string} phone - 手机号
 * @param {string} [openId] - 微信 openId
 */
const autoRegisterAndLogin = async (phone, openId) => {
	const finalOpenId = openId || (await getOpenId()).openId;
	const nickname = generateDefaultNickname(phone);
	const password = generateDefaultPassword();

	console.log('开始自动注册:', { openId: finalOpenId, phone, nickname });

	uni.showLoading({
		title: '正在自动注册账号...',
		mask: true
	});

	try {
		const registerRes = await apiRegister({
			phone,
			password,
			nickname,
			email: '',
			image: '',
			openId: finalOpenId
		});

		const registerData = registerRes.data;
		console.log('自动注册接口返回:', registerData);

		if (!isApiSuccess(registerData) && !isUserExistsMessage(registerData?.message)) {
			throw new Error(registerData?.message || '注册失败');
		}
	} catch (error) {
		const msg = error?.message || error?.data?.message || '';
		if (error?.type === 'BUSINESS_ERROR' && isUserExistsMessage(msg)) {
			console.log('用户已存在，跳过注册直接登录');
		} else if (!isUserExistsMessage(msg)) {
			console.error('自动注册失败:', error);
			throw error;
		}
	}

	uni.showLoading({
		title: '注册完成，正在自动登录...',
		mask: true
	});
	console.log('自动注册完成，使用 openId 快捷登录...');
	return loginByOpenIdAndPhone(finalOpenId, phone);
};

export {
	generateDefaultPassword,
	generateDefaultNickname,
	autoRegisterAndLogin,
	loginByOpenIdAndPhone
};

export default autoRegisterAndLogin;
