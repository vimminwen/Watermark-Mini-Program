/**
 * 将超过 JS 安全整数范围的 JSON 数字转为字符串再解析，避免雪花 ID 精度丢失。
 * 例：2059189815500464141 在小程序里会变成 2059189815500464000
 */
const LONG_INT_MIN_LEN = 16;

export const stringifyLongJsonIntegers = (jsonText) => {
	if (typeof jsonText !== 'string' || !jsonText) return jsonText;
	return jsonText.replace(
		/:\s*(\d{16,})(\s*[,}\]])/g,
		': "$1"$2'
	);
};

export const parseJsonPreserveLongIntegers = (jsonText) => {
	const safeText = stringifyLongJsonIntegers(jsonText);
	return JSON.parse(safeText);
};
