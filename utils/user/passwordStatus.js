/**
 * 根据用户信息中的 password 字段判断是否已设置登录密码
 * 后端约定：password === "true" 表示已设置；"" / "false" 等均表示未设置
 */
export const parseHasPassword = (value) => {
	if (value === true) {
		return true;
	}
	if (value === false || value == null || value === '') {
		return false;
	}
	if (typeof value === 'string') {
		return value.toLowerCase() === 'true';
	}
	return false;
};

/** 从用户对象解析是否已设置密码（优先接口返回的 password 字段） */
export const resolveHasPassword = (user, fallback = false) => {
	if (!user || typeof user !== 'object') {
		return fallback;
	}
	if (Object.prototype.hasOwnProperty.call(user, 'password')) {
		return parseHasPassword(user.password);
	}
	if (typeof user.hasPassword === 'boolean') {
		return user.hasPassword;
	}
	return fallback;
};
