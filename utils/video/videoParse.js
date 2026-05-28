/** 从分享文案中提取链接 */
export const extractShareUrl = (text) => {
	const raw = String(text || '').trim();
	if (!raw) return '';

	const match = raw.match(/https?:\/\/[^\s\u4e00-\u9fa5「」【】]+/i);
	if (match) {
		return match[0].replace(/[，。！？；：、）\])}'"<>]+$/, '');
	}
	return /^https?:\/\//i.test(raw) ? raw : '';
};

/** 统一解析接口返回为页面可用结构 */
export const normalizeParseResult = (body) => {
	if (!body || typeof body !== 'object') return null;

	const data = body.data ?? body.result ?? body;
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		return null;
	}

	const videoUrl =
		data.videoUrl ??
		data.video ??
		data.playUrl ??
		data.play_url ??
		data.down ??
		data.url ??
		'';

	if (!videoUrl) return null;

	return {
		title: data.title ?? data.desc ?? data.description ?? '无标题',
		cover: data.cover ?? data.pic ?? data.image ?? data.coverUrl ?? data.thumb ?? '',
		videoUrl: String(videoUrl),
		author: data.author ?? data.nickname ?? data.name ?? data.userName ?? ''
	};
};
