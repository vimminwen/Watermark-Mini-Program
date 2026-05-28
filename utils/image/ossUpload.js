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
 * 上传本地图片到 OSS
 * @param {string} filePath
 * @returns {Promise<string>} 公网可访问 URL
 */
export const uploadImageToOss = (filePath) => {
	return new Promise((resolve, reject) => {
		if (!filePath) {
			reject(new Error('图片路径为空'));
			return;
		}

		const ext = /\.(\w+)(\?|$)/.exec(filePath)?.[1] || 'jpg';
		const key = `djia/upscale/${Date.now()}_${randomString(8)}.${ext}`;

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
