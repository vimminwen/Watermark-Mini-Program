import { ref } from 'vue'
import { getApiMessage } from '@/utils/user/authHelper.js'

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`)

const nowTime = () => {
	const d = new Date()
	return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export const formatErrDetail = (err) => {
	if (!err) return '未知错误'
	const parts = []
	if (err.message) parts.push(`message: ${err.message}`)
	if (err.errMsg) parts.push(`errMsg: ${err.errMsg}`)
	if (err.type) parts.push(`type: ${err.type}`)
	if (err.statusCode != null) parts.push(`statusCode: ${err.statusCode}`)
	if (err.data) {
		try {
			const raw = typeof err.data === 'string' ? err.data : JSON.stringify(err.data)
			parts.push(`data: ${raw.slice(0, 300)}`)
		} catch (e) {
			parts.push('data: [无法序列化]')
		}
	}
	if (!parts.length) {
		try {
			return JSON.stringify(err).slice(0, 400)
		} catch (e) {
			return String(err)
		}
	}
	return parts.join('\n')
}

/** 提取面向用户的错误文案（仅 message，不含 type/data 等调试信息） */
export const resolveUserErrorMessage = (err, fallback = '操作失败') => {
	if (!err) return fallback
	if (typeof err === 'string') return err

	const dataMsg =
		err.data && typeof err.data === 'object' ? getApiMessage(err.data, '') : ''

	return (
		err.message ||
		dataMsg ||
		err.msg ||
		err.errMsg ||
		fallback
	)
}

/** 任务进行中 loading（已关闭，便于查看页面调试日志） */
export const showTaskLoading = (_options) => {
	// uni.showLoading(options)
}

export const hideTaskLoading = () => {
	// uni.hideLoading()
}

/** 页面内调试日志（临时排查真机问题） */
export const useDebugLog = (scope = 'app') => {
	const debugLogs = ref([])
	const debugScrollTop = ref(0)

	const appendDebugLog = (level, text) => {
		const msg = String(text ?? '')
		debugLogs.value.unshift({
			time: nowTime(),
			level,
			text: msg
		})
		if (debugLogs.value.length > 100) {
			debugLogs.value.length = 100
		}
		debugScrollTop.value = 0
		console.log(`[${scope}][${level}]`, msg)
	}

	const clearDebugLogs = () => {
		debugLogs.value = []
	}

	const logInfo = (text) => appendDebugLog('INFO', text)
	const logStep = (text) => appendDebugLog('STEP', text)
	const logOk = (text) => appendDebugLog('OK', text)
	const logWarn = (text) => appendDebugLog('WARN', text)
	const logError = (text) => appendDebugLog('ERROR', text)

	const showDebugError = (title, err) => {
		const userMessage = resolveUserErrorMessage(err, title || '操作失败')
		const detail = formatErrDetail(err)
		appendDebugLog('ERROR', `${title}\n${detail}`)
		uni.showModal({
			title: title || '操作失败',
			content: userMessage,
			showCancel: false
		})
	}

	return {
		debugLogs,
		debugScrollTop,
		appendDebugLog,
		clearDebugLogs,
		logInfo,
		logStep,
		logOk,
		logWarn,
		logError,
		showDebugError,
		formatErrDetail,
		resolveUserErrorMessage
	}
}
