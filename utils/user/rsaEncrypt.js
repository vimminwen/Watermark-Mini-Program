import JSEncrypt from '@/utils/user/jsencrypt.min.js';

/** 与后端 RSA 私钥配对的公钥（登录时加密手机号、密码） */
export const RSA_PUBLIC_KEY =
	'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDTmcukt1xs8QnDJkWaHUXS+VSe7nnzl9BYLCkwqDHpclCGiWLIoTREioueRCMBX0PvKXwMcJ/XIvswBsbp98wALjBmufnbTpTlnDloXhNIravDM9S5jaU8N4VcZEd2hQSlnoT4aJkyU470UAUHPqvKO/+lmha0/Mf0v9YdRIkwyQIDAQAB';

/**
 * RSA 公钥加密（PKCS#1）
 * @param {string} plainText
 */
export const encryptRsa = (plainText) => {
	if (plainText == null || plainText === '') {
		return '';
	}
	const encryptor = new JSEncrypt.JSEncrypt();
	encryptor.setPublicKey(RSA_PUBLIC_KEY);
	const encrypted = encryptor.encrypt(String(plainText));
	if (!encrypted) {
		throw new Error('数据加密失败，请重试');
	}
	return encrypted;
};

/** 登录接口：手机号、密码均需 RSA 加密 */
export const buildLoginPayload = (phone, password) => ({
	phone: encryptRsa(phone),
	password: encryptRsa(password)
});
