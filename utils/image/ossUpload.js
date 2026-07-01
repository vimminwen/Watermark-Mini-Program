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
 * 上传本地文件到 OSS
 * @param {string} filePath
 * @param {{ prefix?: string, ext?: string }} options
 */
export const uploadFileToOss = (filePath, options = {}) => {
	return new Promise((resolve, reject) => {
		if (!filePath) {
			reject(new Error('文件路径为空'));
			return;
		}

		const ext = options.ext || /\.(\w+)(\?|$)/.exec(filePath)?.[1] || 'bin';
		const prefix = options.prefix || 'djia/files';
		const key = `${prefix}/${Date.now()}_${randomString(8)}.${ext}`;

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

/** 上传本地图片到 OSS */
export const uploadImageToOss = (filePath) => {
	return uploadFileToOss(filePath, { prefix: 'djia/upscale', ext: /\.(\w+)(\?|$)/.exec(filePath)?.[1] || 'jpg' });
};

/** 上传 PDF 到 OSS */
export const uploadPdfToOss = (filePath) => uploadFileToOss(filePath, { prefix: 'djia/pdf', ext: 'pdf' });
