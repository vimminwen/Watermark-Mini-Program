import {
	request
} from '@/utils/request.js';

// 定义 post 和 get 函数
const post = (url, data) => request({
	url,
	data,
	method: 'POST'
});

const get = (url, data) => request({
	url,
	data
});

const del = (url, data) => request({
	url,
	data,
	method: 'DELETE'
});

const put = (url, data) => request({
	url,
	data,
	method: 'PUT'
});

// 获取openId
export const apiGetOpenId = code => {
	const url = `/user/openId/${code}`;
	return get(url);
};

// 解密手机号
export const apiDecryptPhone = data => post('/wx/decryptPhone', data);

// 手机号快捷登录（未注册等由 wechatAuth 内自动注册，不弹全局 toast）
export const apiPhoneLogin = data => request({
	url: '/user/login/openId',
	data,
	method: 'POST',
	silentErrorToast: true,
	skipAuthCheck: true
});

// 登录（错误提示由登录页自行展示）
export const apiLogin = data => request({
	url: '/user/login',
	data,
	method: 'POST',
	silentErrorToast: true,
	skipAuthCheck: true
});

// 注册（错误提示由注册页自行展示）
export const apiRegister = data => request({
	url: '/user',
	data,
	method: 'POST',
	silentErrorToast: true,
	skipAuthCheck: true
});

// 获取当前用户信息（token 失效等仅打日志，不弹 toast）
export const apiGetUserInfo = (userId) =>
	request({
		url: `/user/${userId}`,
		silentErrorToast: true
	});

// 修改用户信息
export const apiModifyUserInfo = data => put('/user', data);

// 修改/重置密码（body: phone, password, oldPassword 忘记密码时 oldPassword 传空）
export const apiModifyUserPw = data => request({
	url: '/user/password',
	data,
	method: 'PUT',
	silentErrorToast: true
});

// 注销账号
export const apiDelUser = () => del('/user/delete');

// 预创建VIP订单
export const apiAddOrder = data => post('/pay/preOrder', data);

// 根据 userId 查询支付记录
export const apiGetPayHistory = userId => get(`/pay/history/${userId}`);

// 查询用户vip
export const apiGetUserVip = () => get('/vip');

// 非会员每次用功能修改次数
export const apiModifyMemberNum = data => put('/user/num', data);

// 短视频链接解析（body: { url }）
export const apiParseVideo = data => request({
	url: '/video/parse',
	data,
	method: 'POST',
	silentErrorToast: true
});

// 图片无损放大（body: { imageUrl, scale }）
export const apiImageUpscale = data => request({
	url: '/image/upscale',
	data,
	method: 'POST',
	silentErrorToast: true
});

// 跨次元相机（风格转换，返回 aiLogId）
export const apiCrossDimensionCamera = (data) =>
	request({
		url: '/front/ai/style-transfer',
		data,
		method: 'POST',
		silentErrorToast: true,
		preserveBigInt: true
	});

// 视频消除（返回 aiLogId，需保留大整数精度）
export const apiSubtitleRemoval = (data) =>
	request({
		url: '/front/ai/subtitle-removal',
		data,
		method: 'POST',
		silentErrorToast: true,
		preserveBigInt: true
	});

// 智能抠图（data 为雪花 ID，需保留大整数精度）
export const apiCutout = (data) =>
	request({
		url: '/front/ai/cutout',
		data,
		method: 'POST',
		silentErrorToast: true,
		preserveBigInt: true
	});

// 根据id查询日志（响应中可能含雪花 ID）
export const apiGetAiLog = (aiLogId) =>
	request({
		url: `/ai-log/${String(aiLogId)}`,
		method: 'GET',
		silentErrorToast: true,
		preserveBigInt: true
	});

// 智能消除笔（返回 aiLogId，需保留大整数精度）
export const apiSmartErase = (data) =>
	request({
		url: '/front/ai/smartErase',
		data,
		method: 'POST',
		silentErrorToast: true,
		preserveBigInt: true
	});

// 无损放大（返回 aiLogId，需保留大整数精度）
export const apiImageLosslessZoomSubmit = (data) =>
	request({
		url: '/front/ai/imageLosslessZoomSubmit',
		data,
		method: 'POST',
		silentErrorToast: true,
		preserveBigInt: true
	});

// 图片提取文字（可能直接返回文本，或返回 aiLogId 需轮询）
export const apiImageTextExtraction = (data) =>
	request({
		url: '/front/ai/imageTransformationText',
		data,
		method: 'POST',
		silentErrorToast: true,
		preserveBigInt: true
	});

// 视频转文字（可能直接返回文本，或返回 aiLogId 需轮询）
export const apiVideoTransformationTextForUrl = (data) =>
	request({
		url: '/front/ai/videoTransformationTextForUrl',
		data,
		method: 'POST',
		silentErrorToast: true,
		preserveBigInt: true
	});