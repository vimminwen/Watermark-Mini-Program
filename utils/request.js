import {
	baseUrl
} from '@/utils/http.js';
import { parseJsonPreserveLongIntegers } from '@/utils/http/jsonBigInt.js';
import {
	clearAuthStorage,
	getStoredToken,
	hasStoredToken
} from '@/utils/user/authStorage.js';

// 请求超时设置（15秒）
const timeout = 15000;

/** 后端鉴权请求头名称 */
export const TOKEN_HEADER_NAME = 'dajia-watermark-token';

/** 不向用户弹出的错误文案（仅打日志） */
export const isSilentErrorMessage = (msg) => {
	const text = String(msg || '')
	return /服务器内部错误|internal\s*server\s*error|未能读取到有效\s*token|token\s*无效|无效\s*token|请先登录|未授权|unauthorized/i.test(
		text
	)
}

const showErrorToast = (title, options = {}) => {
	if (isSilentErrorMessage(title)) {
		console.warn('[请求错误已静默]', title)
		return
	}
	uni.showToast({
		title,
		icon: 'none',
		duration: 2000,
		...options
	})
}

export function hasValidToken() {
	return hasStoredToken();
}

/** 响应是否表示 token 已失效（Sa-Token 常返回 500 + NotLoginException） */
export function isTokenInvalidResponse(resData, statusCode) {
	if (!resData || typeof resData !== 'object') {
		return statusCode === 401;
	}
	if (statusCode === 401) return true;
	if (resData.code === 401 || resData.status === 401) return true;

	const msg = String(resData.message || resData.msg || resData.error || '');
	const exception = String(resData.exception || '');
	const combined = `${msg} ${exception}`;

	return /notloginexception/i.test(exception) ||
		/token\s*无效|无效\s*token|未能读取到有效\s*token|请先登录|未登录|not\s*login|登录已过期|登录状态/i.test(
			combined
		);
}

/** 未登录拦截错误（不弹提示，由用户点击功能时 auth.js 引导登录） */
export const isNoTokenError = (error) => error?.type === 'NO_TOKEN';

/** 规范化请求路径（用于白名单匹配） */
function normalizeRequestPath(url) {
	if (!url) return '';
	let path = String(url).trim().split('?')[0];
	if (/^https?:\/\//i.test(path)) {
		const match = path.match(/^https?:\/\/[^/]+(\/.*)?$/i);
		path = match?.[1] || '/';
	}
	if (!path.startsWith('/')) path = `/${path}`;
	return path.replace(/\/+$/, '') || '/';
}

/**
 * 登录/注册流程相关接口，无 token 也允许请求
 */
export function isAuthExemptRequest(url, method = 'GET') {
	if (!url) return false;
	const path = normalizeRequestPath(url);
	const upperMethod = String(method).toUpperCase();

	// 微信 openId、手机号
	if (path.startsWith('/user/openId/')) return true;
	if (path === '/wx/getPhoneNumber') return true;

	// 账号密码登录、手机号快捷登录
	if (path === '/uaa' && upperMethod === 'POST') return true;
	if (path === '/user/login/openId' && upperMethod === 'POST') return true;

	// 注册、账号密码登录
	if (path === '/user' && upperMethod === 'POST') return true;
	if (path === '/user/login' && upperMethod === 'POST') return true;

	// 忘记密码 / 修改密码（未登录忘记密码时 oldPassword 传空；忘记密码不带 token）
	if (path === '/user/password' && upperMethod === 'PUT') return true;
	if (path === '/user/updatePassword' && upperMethod === 'PUT') return true;

	// 公开只读（未登录可浏览，不弹登录提示）
	if (path.startsWith('/weather/')) return true;
	if (path.startsWith('/festival/')) return true;
	if (path.startsWith('/history')) return true;

	return false;
}

function getDefaultHeader(options = {}) {
	const headers = {
		'Content-Type': 'application/json'
	};
	// 登录/注册等接口不要带过期 token，否则后端可能直接返回「请先登录」
	if (!options.omitToken) {
		const token = getStoredToken();
		if (token) {
			headers[TOKEN_HEADER_NAME] = token;
		}
	}
	return headers;
}

/**
 * token 失效：清除登录缓存（无 refresh 接口，需用户重新登录）
 * 注意：不会自动刷新 token
 */
function handleUnauthorized(reason = '未授权') {
	try {
		clearAuthStorage();
		console.warn('[request] 登录态已失效，已清除本地 token:', reason);
	} catch (error) {
		console.error('[handleUnauthorized]', error);
	}
}

/**
 * 自动隐藏 loading
 */
function autoHideLoading() {
	try {
		uni.hideLoading();
	} catch (e) {
		// 忽略 hideLoading 可能的错误
	}
}

/**
 * 统一的请求方法（带超时自动中断 + 自动管理loading）
 * @param {Object} config - 请求配置
 * @returns {Promise} 请求结果
 */
export function request(config = {}) {
	return new Promise(async (resolve, reject) => {
		let requestTask = null; // 保存请求任务引用
		let timeoutTimer = null; // 超时定时器
		let isCompleted = false; // 标记请求是否已完成

		try {
			const {
				url,
				data,
				params,
				method = 'GET',
				header = {}, // 用户自定义 header
				silentErrorToast = false,
				skipAuthCheck = false,
				omitToken = false,
				preserveBigInt = false
			} = config;

			const authExempt = skipAuthCheck || isAuthExemptRequest(url, method);
			const shouldOmitToken = omitToken || (authExempt && !hasValidToken());

			// 未登录且非登录/注册类接口：静默拦截，不弹任何提示
			if (!authExempt && !hasValidToken()) {
				console.warn('[request] 未登录，已拦截请求:', method, url);
				reject({
					message: '请先登录',
					type: 'NO_TOKEN'
				});
				return;
			}

			// 构建完整URL
			let finalUrl = baseUrl + url;

			// 处理查询参数
			if (params && Object.keys(params).length > 0) {
				const queryString = Object.keys(params)
					.filter(key => params[key] !== undefined && params[key] !== null)
					.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
					.join('&');

				if (queryString) {
					finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
				}
			}

			// 超时处理函数
			const handleTimeout = () => {
				if (!isCompleted) {
					isCompleted = true;

					// 主动中止请求
					try {
						if (requestTask) {
							requestTask.abort();
						}
					} catch (abortError) {
						console.error('[中止请求失败]', abortError);
					}

					// 自动隐藏loading，防止一直转圈
					autoHideLoading();

					console.warn('[请求超时中断]', {
						url: finalUrl,
						method,
						timeout: `${timeout}ms`
					});

					// 显示超时提示
					uni.showToast({
						title: '请求超时，请重试',
						icon: "error",
						duration: 2500
					});

					reject({
						message: '请求超时',
						type: 'TIMEOUT'
					});
				}
			};

			// 发起请求并保存任务引用
			requestTask = uni.request({
				url: finalUrl,
				data,
				method,
				timeout,
				dataType: preserveBigInt ? 'text' : 'json',
				header: {
					// 已登录时仍附带 token（如个人中心改密码）；忘记密码等场景可 omitToken
					...getDefaultHeader({ omitToken: shouldOmitToken }),
					...header
				},
				success: (res) => {
					// 清除超时定时器
					if (timeoutTimer) {
						clearTimeout(timeoutTimer);
						timeoutTimer = null;
					}

					// 防止重复处理
					if (isCompleted) return;
					isCompleted = true;

					try {
						let resData = res.data;

						if (preserveBigInt && typeof resData === 'string') {
							try {
								resData = parseJsonPreserveLongIntegers(resData);
								res.data = resData;
							} catch (parseErr) {
								console.error('[JSON 解析失败]', parseErr, res.data);
								reject({
									message: '响应解析失败',
									type: 'PARSE_ERROR'
								});
								return;
							}
						}

						const { statusCode } = res;

						if (statusCode === 200) {
							if (isTokenInvalidResponse(resData, statusCode)) {
								autoHideLoading();
								handleUnauthorized(resData?.message || 'token 无效');
								reject({
									message: resData?.message || resData?.msg || '登录已过期，请重新登录',
									type: 'TOKEN_INVALID',
									data: resData
								});
								return;
							}

							// 检查业务错误码
							const isSuccess = (code) => {
								if (code === undefined || code === null) return true;
								if (typeof code === 'number') return code === 200 ||
									code === 0;
								if (typeof code === 'string') return ['success', 'ok',
									'200', '0'
								].includes(code.toLowerCase());
								return true;
							};

							if (!isSuccess(resData?.code)) {
								autoHideLoading();
								const errorMsg = resData?.message || resData?.msg || '请求失败';
								if (isTokenInvalidResponse(resData, statusCode)) {
									handleUnauthorized(errorMsg);
									reject({
										message: errorMsg || '登录已过期，请重新登录',
										type: 'TOKEN_INVALID',
										data: resData
									});
									return;
								}
								if (!silentErrorToast) {
									showErrorToast(errorMsg);
								}
								reject({
									message: errorMsg,
									type: 'BUSINESS_ERROR',
									data: resData
								});
								return;
							}

							// 成功返回
							resolve(res);
						} else {
							// HTTP错误（保留响应体，供快捷登录「请注册」等场景判断）
							autoHideLoading();
							const resData = res.data;
							if (isTokenInvalidResponse(resData, statusCode)) {
								handleUnauthorized(resData?.message || resData?.error);
								reject({
									message: resData?.message || '登录已过期，请重新登录',
									type: 'TOKEN_INVALID',
									statusCode,
									data: resData
								});
								return;
							}
							const bodyMsg = resData?.message || resData?.msg;
							let errorMsg = bodyMsg || '请求失败';
							switch (statusCode) {
								case 404:
									if (!bodyMsg) errorMsg = '请求的资源不存在';
									break;
								case 500:
									if (!bodyMsg) errorMsg = '服务器内部错误';
									break;
								case 502:
									if (!bodyMsg) errorMsg = '网关错误';
									break;
								case 503:
									if (!bodyMsg) errorMsg = '服务暂不可用';
									break;
								default:
									if (!bodyMsg) errorMsg = `请求失败(${statusCode})`;
							}

							// HTTP 错误不弹 toast，由业务页自行处理
							reject({
								message: errorMsg,
								type: 'HTTP_ERROR',
								statusCode,
								data: resData
							});
						}
					} catch (error) {
						autoHideLoading();
						console.error('[响应处理异常]', error);
						reject({
							message: '数据处理异常',
							type: 'PARSE_ERROR'
						});
					}
				},
				fail: (err) => {
					// 清除超时定时器
					if (timeoutTimer) {
						clearTimeout(timeoutTimer);
						timeoutTimer = null;
					}

					// 防止重复处理
					if (isCompleted) return;
					isCompleted = true;

					// 自动隐藏loading
					autoHideLoading();

					// 错误信息处理
					let errorMessage = '网络连接失败';
					let errorType = 'NETWORK_ERROR';

					if (err.errMsg) {
						const errMsg = err.errMsg;

						if (errMsg.includes('request:fail timeout')) {
							errorMessage = '请求超时，请重试';
							errorType = 'TIMEOUT';
						} else if (errMsg.includes('request:fail abort')) {
							errorMessage = '请求已取消';
							errorType = 'ABORT';
						} else if (errMsg.includes('request:fail')) {
							errorMessage = '网络连接失败，请检查网络';
							errorType = 'NETWORK_ERROR';
						}
					}

					console.error('[请求失败]', {
						url: finalUrl,
						type: errorType,
						message: errorMessage,
						error: err
					});

					// 如果不是超时（超时已经显示了toast），显示错误提示
					if (errorType !== 'TIMEOUT') {
						showErrorToast(errorMessage, {
							icon: 'error',
							duration: 2500
						});
					}

					reject({
						message: errorMessage,
						type: errorType,
						originalError: err
					});
				},
				complete: () => {
					// 清除超时定时器
					if (timeoutTimer) {
						clearTimeout(timeoutTimer);
						timeoutTimer = null;
					}

					// 如果还没完成，强制完成并隐藏loading
					if (!isCompleted) {
						isCompleted = true;
						autoHideLoading();
						reject({
							message: '请求异常终止',
							type: 'UNKNOWN_ERROR'
						});
					}
				}
			});

			// 主动超时检测（双保险）
			timeoutTimer = setTimeout(handleTimeout, timeout + 500);

		} catch (error) {
			// 清除超时定时器
			if (timeoutTimer) {
				clearTimeout(timeoutTimer);
				timeoutTimer = null;
			}

			isCompleted = true;
			autoHideLoading();

			console.error('[请求异常]', error);

			showErrorToast('请求异常');

			reject({
				message: '请求异常',
				type: 'REQUEST_ERROR'
			});
		}
	});
}