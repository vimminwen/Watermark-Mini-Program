import OSS from '@/utils/image/aliyun.js';

const randomString = (len = 16) => {
	const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
	let pwd = '';
	for (let i = 0; i < len; i++) {
		pwd += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return pwd;
};

const AUDIO_EXT_SET = new Set(['mp3', 'm4a', 'wav', 'aac', 'amr', 'flac', 'ogg']);

const resolveUploadMeta = (filePath, mediaType = '') => {
	const ext = /\.(\w+)(\?|$)/i.exec(filePath)?.[1]?.toLowerCase() || '';
	const isAudio =
		mediaType === 'audio' || (ext && AUDIO_EXT_SET.has(ext));
	if (isAudio) {
		return {
			ext: ext || 'mp3',
			folder: 'djia/audio'
		};
	}
	return {
		ext: ext || 'mp4',
		folder: 'djia/video'
	};
};

/**
 * 上传本地音视频到 OSS（视频转文字等）
 * @param {string} filePath
 * @param {'video'|'audio'|''} [mediaType]
 */
export const uploadMediaToOss = (filePath, mediaType = '') => {
	return new Promise((resolve, reject) => {
		if (!filePath) {
			reject(new Error('文件路径为空'));
			return;
		}

		const { ext, folder } = resolveUploadMeta(filePath, mediaType);
		const key = `${folder}/${Date.now()}_${randomString(8)}.${ext}`;

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

/**
 * 上传本地视频到 OSS
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export const uploadVideoToOss = (filePath) => uploadMediaToOss(filePath, 'video');
