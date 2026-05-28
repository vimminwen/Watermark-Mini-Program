/** 接口是否业务成功 */
export const isApiSuccess = (body) => {
	if (!body) return false;
	if (body.success === true) return true;
	const code = body.code;
	if (code === undefined || code === null) return false;
	if (typeof code === 'number') return code === 200 || code === 0;
	if (typeof code === 'string') {
		return ['success', 'ok', '200', '0'].includes(code.toLowerCase());
	}
	return false;
};

/** 登录接口是否成功（须能解析出 token） */
export const isLoginSuccess = (body) => {
	if (!body || typeof body !== 'object') return false;
	const { token } = extractLoginSession(body);
	return !!token;
};

/** 从登录响应中提取 token、userId */
export const extractLoginSession = (body) => {
	if (!body || typeof body !== 'object') {
		return { token: '', userId: '', payload: null };
	}

	const rawData = body.data ?? body;
	let payload = null;
	let userId = '';

	if (rawData != null && typeof rawData === 'object' && !Array.isArray(rawData)) {
		payload = rawData;
		userId = rawData.userId ?? rawData.id ?? '';
	} else if (rawData != null && rawData !== '') {
		userId = rawData;
	}

	userId = userId || body.userId || body.id || '';

	const token = (
		payload?.accessToken ??
		payload?.token ??
		payload?.dajiaWatermarkToken ??
		payload?.countdownDayToken ??
		body.accessToken ??
		body.token ??
		body.dajiaWatermarkToken ??
		body.countdownDayToken ??
		''
	);

	return {
		token: token ? String(token) : '',
		userId: userId != null && userId !== '' ? String(userId) : '',
		payload
	};
};

/** 注册接口是否成功（data 可能为新建用户 id） */
export const isRegisterSuccess = (body) => {
	if (!body || typeof body !== 'object') return false;
	if (isApiSuccess(body)) return true;
	return isUserExistsMessage(getApiMessage(body, ''));
};

/** 从注册响应中取 userId */
export const extractRegisterUserId = (body) => {
	if (!body || typeof body !== 'object') return '';
	const data = body.data;
	if (data != null && data !== '' && typeof data !== 'object') {
		return String(data);
	}
	if (data && typeof data === 'object') {
		const id = data.userId ?? data.id;
		if (id != null && id !== '') return String(id);
	}
	return '';
};

/** 是否「未注册 / 用户不存在」类提示，需要走自动注册 */
export const isNotRegisteredMessage = (message) => {
	const text = String(message || '').toLowerCase();
	return /未注册|未找到|不存在|not\s*regist|用户不存在|账号不存在|请先注册|请注册账号|请注册/.test(text);
};

/** 注册时用户已存在，可直接尝试登录 */
export const isUserExistsMessage = (message) => {
	const text = String(message || '').toLowerCase();
	return /已存在|已注册|重复注册/.test(text);
};

export const getApiMessage = (body, fallback = '操作失败') => {
	if (!body || typeof body !== 'object') return fallback;
	return body.message || body.msg || fallback;
};

export const shouldAutoRegister = (body, error) => {
	const messages = [
		body?.message,
		body?.msg,
		error?.message,
		error?.data?.message,
		error?.data?.msg
	];
	return messages.some((msg) => isNotRegisteredMessage(msg));
};
