import Crypto from './crypto.js';
import './hmac.js';
import './sha1.js';
import { Base64 } from './base64.js';
import ossConfig from './aliyun.config.js';

const buildPolicyBase64 = () => {
	const expireAt = new Date();
	expireAt.setHours(expireAt.getHours() + 24);
	const policyText = {
		expiration: expireAt.toISOString(),
		conditions: [['content-length-range', 0, 1024 * 1024 * 20]]
	};
	return Base64.encode(JSON.stringify(policyText));
};

const buildSignature = (policyBase64, accessKey) => {
	const bytes = Crypto.HMAC(Crypto.SHA1, policyBase64, accessKey, { asBytes: true });
	return Crypto.util.bytesToBase64(bytes);
};

const policyBase64 = buildPolicyBase64();
const signature = buildSignature(policyBase64, ossConfig.accesskey);

const OSS = {
	name: 'aliyun',
	signature,
	host: ossConfig.osshost,
	accessid: ossConfig.accessid,
	policyBase64,
	uploadFileSize: ossConfig.uploadFileSize ?? 1024 * 1000 * 5
};

export default OSS;
