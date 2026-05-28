const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pickHttpUrl = (value) => {
	if (typeof value !== 'string') return '';
	const trimmed = value.trim();
	return /^https?:\/\//i.test(trimmed) ? trimmed : '';
};

/** 从提交任务响应中提取 aiLogId */
export const extractAiLogId = (body) => {
	if (!body || typeof body !== 'object') return '';
	const raw = body.data;
	if (raw == null || raw === '') return '';

	if (typeof raw === 'object' && !Array.isArray(raw)) {
		const id = raw.aiLogId ?? raw.id ?? raw.logId;
		if (id != null && id !== '') {
			return String(id).trim();
		}
		return '';
	}

	return String(raw).trim();
};

/** 从 ai-log 响应中解析结果 URL（优先 content 字段） */
export const resolveAiLogResultUrl = (body) => {
	if (!body || typeof body !== 'object') return '';

	const data = body.data ?? body.result ?? body;

	const direct = pickHttpUrl(data);
	if (direct) return direct;

	if (data && typeof data === 'object') {
		const fields = [
			data.content,
			data.resultUrl,
			data.url,
			data.imageUrl,
			data.outputUrl,
			data.cutoutUrl,
			data.videoUrl,
			data.image,
			data.output,
			data.result
		];
		for (const item of fields) {
			const url = pickHttpUrl(item);
			if (url) return url;
		}

		if (typeof data.result === 'string' && data.result.startsWith('{')) {
			try {
				return resolveAiLogResultUrl({ data: JSON.parse(data.result) });
			} catch (e) {
				// ignore
			}
		}
	}

	return '';
};

const normalizeStatus = (body) => {
	const data = body?.data;
	const status = data?.status ?? data?.state ?? body?.status ?? body?.state ?? '';
	return String(status).toLowerCase();
};

/** ai-log 是否已失败 */
export const isAiLogFailed = (body) => {
	const status = normalizeStatus(body);
	if (['failed', 'fail', 'error', 'cancel', 'cancelled', 'disable', 'disabled', '2', '-1'].includes(status)) {
		return true;
	}
	const data = body?.data;
	if (data && typeof data === 'object' && (data.error || data.errorMsg || data.failReason)) {
		return true;
	}
	return false;
};

/** 任务是否已有可展示结果 */
export const isAiLogReady = (body) => !!resolveAiLogResultUrl(body);

export const getAiLogErrorMessage = (body, fallback = 'AI 处理失败') => {
	if (!body || typeof body !== 'object') return fallback;
	const data = body.data;
	if (data && typeof data === 'object') {
		return data.errorMsg || data.error || data.failReason || data.message || body.message || fallback;
	}
	return body.message || body.msg || fallback;
};

/**
 * 轮询 ai-log 直到 data.content 等字段出现结果 URL
 * @param {(id: string) => Promise<any>} fetchAiLog
 * @param {string} aiLogId
 */
export const pollAiLogResult = async (fetchAiLog, aiLogId, options = {}) => {
	const id = String(aiLogId || '').trim();
	if (!id) {
		throw new Error('任务 ID 无效');
	}

	const interval = options.interval ?? 2000;
	const maxAttempts = options.maxAttempts ?? 60;
	const onProgress = options.onProgress;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const res = await fetchAiLog(id);
		const body = res?.data;

		if (!body) {
			throw new Error('查询任务失败');
		}

		if (isAiLogFailed(body)) {
			throw new Error(getAiLogErrorMessage(body));
		}

		const resultUrl = resolveAiLogResultUrl(body);
		if (resultUrl) {
			return resultUrl;
		}

		if (onProgress) {
			onProgress(attempt, maxAttempts);
		}

		if (attempt < maxAttempts) {
			await sleep(interval);
		}
	}

	throw new Error('处理超时，请稍后重试');
};
