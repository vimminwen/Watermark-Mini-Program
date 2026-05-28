import {
	apiGetOpenId
} from '@/api/api.js';

const getOpenId = (forceRefresh = false) => {
	return new Promise((resolve, reject) => {
		if (forceRefresh) {
			console.log("强制刷新，清除旧缓存");
			uni.removeStorageSync("openIdStorage");
			uni.removeStorageSync("sessionKeyStorage");
		}

		const cachedOpenId = uni.getStorageSync("openIdStorage");
		const cachedSessionKey = uni.getStorageSync("sessionKeyStorage");

		if (!forceRefresh && cachedOpenId && cachedSessionKey) {
			console.log("使用缓存 openId 和 sessionKey");
			resolve({
				openId: cachedOpenId,
				sessionKey: cachedSessionKey
			});
			return;
		}

		console.log("重新获取 openId 和 sessionKey...");
		uni.login({
			provider: 'weixin',
			success: (res) => {
				if (!res.code) return reject(new Error("uni.login 未获取到 code"));

				apiGetOpenId(res.code).then(response => {
					try {
						if (!response.data || !response.data.data) {
							throw new Error("接口返回格式错误");
						}

						let wechatData;
						if (typeof response.data.data === 'string') {
							wechatData = JSON.parse(response.data.data);
						} else {
							wechatData = response.data.data;
						}

						const {
							openid,
							session_key
						} = wechatData;

						if (!openid || !session_key) {
							throw new Error("未获取到 openid/session_key");
						}

						uni.setStorageSync("openIdStorage", openid);
						uni.setStorageSync("sessionKeyStorage", session_key);

						console.log("成功获取并存储 openId 和 sessionKey");
						resolve({
							openId: openid,
							sessionKey: session_key
						});
					} catch (error) {
						console.error("解析 openId 失败:", error);
						reject(error);
					}
				}).catch(reject);
			},
			fail: (err) => {
				console.error("uni.login 失败:", err);
				reject(err);
			}
		});
	});
};

export {
	getOpenId
};

export default getOpenId;
