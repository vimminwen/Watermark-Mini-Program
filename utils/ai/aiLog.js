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

/** 提交接口占位 text（如 "[]"）表示尚未完成，需用 aiLogId 轮询 */
export const isPlaceholderAiText = (value) => {
	if (value == null) return true;
	const trimmed = String(value).trim();
	if (!trimmed) return true;
	if (trimmed === '[]' || trimmed === '{}') return true;
	if (/^(null|undefined)$/i.test(trimmed)) return true;
	if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed) && parsed.length === 0) return true;
			if (
				parsed &&
				typeof parsed === 'object' &&
				!Array.isArray(parsed) &&
				Object.keys(parsed).length === 0
			) {
				return true;
			}
		} catch (e) {
			// ignore
		}
	}
	return false;
};

/** 将 JSON 字幕/分段数组拼成纯文本 */
export const flattenTextSegments = (payload) => {
	if (payload == null) return '';
	if (typeof payload === 'string') {
		const trimmed = payload.trim();
		if (!trimmed || isPlaceholderAiText(trimmed)) return '';
		if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
			try {
				return flattenTextSegments(JSON.parse(trimmed));
			} catch (e) {
				return trimmed;
			}
		}
		return trimmed;
	}
	if (!Array.isArray(payload)) {
		if (typeof payload === 'object') {
			const one =
				payload.text ??
				payload.Text ??
				payload.content ??
				payload.sentence ??
				payload.line ??
				'';
			return String(one || '').trim();
		}
		return '';
	}
	if (!payload.length) return '';
	const lines = payload
		.map((item) => {
			if (typeof item === 'string') return item.trim();
			if (item && typeof item === 'object') {
				return String(
					item.text ?? item.Text ?? item.content ?? item.sentence ?? item.line ?? ''
				).trim();
			}
			return '';
		})
		.filter(Boolean);
	return lines.join('\n');
};

const pickPlainText = (value) => {
	if (value == null) return '';
	if (Array.isArray(value)) {
		return flattenTextSegments(value);
	}
	if (typeof value !== 'string') return '';
	const trimmed = value.trim();
	if (!trimmed || /^https?:\/\//i.test(trimmed)) return '';
	if (isPlaceholderAiText(trimmed)) return '';
	if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
		const fromJson = flattenTextSegments(trimmed);
		if (fromJson) return fromJson;
		return '';
	}
	return trimmed;
};

/** 从 ai-log 或提交响应中解析 OCR/转写文本 */
export const resolveAiLogText = (body) => {
	if (!body || typeof body !== 'object') return '';

	const data = body.data ?? body.result ?? body;

	if (Array.isArray(data)) {
		return flattenTextSegments(data);
	}

	const direct = pickPlainText(data);
	if (direct) return direct;

	if (data && typeof data === 'object') {
		const fields = [
			data.text,
			data.content,
			data.result,
			data.output,
			data.ocrText,
			data.recognizedText,
			data.transformationText
		];
		for (const item of fields) {
			const text = pickPlainText(item);
			if (text) return text;
		}

		if (typeof data.content === 'string' && (data.content.startsWith('{') || data.content.startsWith('['))) {
			try {
				return resolveAiLogText({ data: JSON.parse(data.content) });
			} catch (e) {
				// ignore
			}
		}
	}

	return '';
};

/** 任务是否已有文本结果 */
export const isAiLogTextReady = (body) => !!resolveAiLogText(body);

/**
 * 解析图文/视频转文字提交响应：有效文本直接返回，否则用 aiLogId 轮询
 */
export const parseTextTransformationSubmit = (body) => {
	const aiLogId = extractAiLogId(body);
	const text = resolveAiLogText(body);
	if (text && !isPlaceholderAiText(text)) {
		return { text, aiLogId: '' };
	}
	return { text: '', aiLogId };
};

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
	const resolveResult = options.resolve ?? resolveAiLogResultUrl;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const res = await fetchAiLog(id);
		const body = res?.data;

		if (!body) {
			throw new Error('查询任务失败');
		}

		if (isAiLogFailed(body)) {
			throw new Error(getAiLogErrorMessage(body));
		}

		const result = resolveResult(body);
		if (result) {
			return result;
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
