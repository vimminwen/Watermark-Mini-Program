import OSS from '@/utils/image/aliyun.js';

const randomString = (len = 16) => {
	const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
	let pwd = '';
	for (let i = 0; i < len; i++) {
		pwd += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return pwd;
};

/**
 * 上传本地视频到 OSS
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export const uploadVideoToOss = (filePath) => {
	return new Promise((resolve, reject) => {
		if (!filePath) {
			reject(new Error('视频路径为空'));
			return;
		}

		const ext = /\.(\w+)(\?|$)/.exec(filePath)?.[1] || 'mp4';
		const key = `djia/video/${Date.now()}_${randomString(8)}.${ext}`;

		uni.uploadFile({
			url: OSS.host,
			filePath,
			name: 'file',
			formData: {
				key,
				policy: OSS.policyBase64,
				OSSAccessKeyId: OSS.accessid,
				success_action_status: '200',
				signature: OSS.signature
			},
			success: (res) => {
				if (res.statusCode === 200 || res.statusCode === 204) {
					resolve(`${OSS.host}/${key}`);
					return;
				}
				reject(new Error(`上传失败(${res.statusCode})`));
			},
			fail: (err) => reject(err)
		});
	});
};
