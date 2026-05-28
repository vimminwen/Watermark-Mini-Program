import {
	ref
} from 'vue'
import {
	request,
	hasValidToken
} from '@/utils/request.js'
import fetchWechatOpenId from '@/utils/user/openId.js'

const api = {
	checkText: (data) => {
		console.log('[API] checkText 请求参数:', JSON.stringify(data, null, 2))
		return request({
			url: '/wx/check/text',
			method: 'POST',
			data
		})
	},
	checkMedia: (data) => {
		console.log('[API] checkMedia 请求参数:', JSON.stringify(data, null, 2))
		const appId = 'wxd830bc015963706d';
		return request({
			url: `/wx/check/media/${appId}`,
			method: 'POST',
			data
		})
	},
	getMediaResult: (traceId) => {
		console.log('[API] getMediaResult 请求 traceId:', traceId)
		return request({
			url: `/wx/getCheckMedia/${traceId}`
		})
	}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 探测 OSS 图片 URL 是否可被外网访问（微信拉取审核资源前需可访问）
 */
const probeMediaUrlOnce = (url, method = 'HEAD') =>
	new Promise((resolve) => {
		uni.request({
			url,
			method,
			timeout: 8000,
			success: (res) => {
				resolve(res.statusCode >= 200 && res.statusCode < 300)
			},
			fail: () => resolve(false)
		})
	})

const probeMediaUrl = async (url) => {
	if (await probeMediaUrlOnce(url, 'HEAD')) {
		return true
	}
	return probeMediaUrlOnce(url, 'GET')
}

/**
 * OSS 上传成功后短延迟 + 重试，等待 CDN/对象可读再提交微信审核
 */
const waitMediaUrlReady = async (url, options = {}) => {
	const initialDelay = options.initialDelay ?? 400
	const retryDelay = options.retryDelay ?? 600
	const maxAttempts = options.maxAttempts ?? 5

	if (!url || typeof url !== 'string') {
		return false
	}

	await sleep(initialDelay)

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const ok = await probeMediaUrl(url)
		if (ok) {
			console.log(`[waitMediaUrlReady] URL 可访问 (${attempt}/${maxAttempts})`, url)
			return true
		}
		console.warn(
			`[waitMediaUrlReady] 第 ${attempt}/${maxAttempts} 次不可访问`,
			url
		)
		if (attempt < maxAttempts) {
			await sleep(retryDelay)
		}
	}
	return false
}

export function useContentCheck() {
	const isChecking = ref(false)
	const checkResult = ref(null)

	const readStoredOpenId = () => {
		try {
			const openid = uni.getStorageSync('openIdStorage')
			if (!openid) return null
			if (typeof openid === 'object' && openid.openid) {
				return openid.openid
			}
			try {
				const parsed = JSON.parse(openid)
				return typeof parsed === 'string' ? parsed : (parsed?.openid || parsed?.openId || null)
			} catch {
				return String(openid)
			}
		} catch (error) {
			console.error('[readStoredOpenId] 读取异常:', error)
			return null
		}
	}

	/**
	 * 内容审核前置：以 token 为准判断是否登录；缺 openId 时自动 wx.login 拉取
	 */
	const ensureOpenIdForCheck = async () => {
		if (!hasValidToken()) {
			console.warn('[ensureOpenIdForCheck] 无有效 token')
			uni.showToast({
				title: '请登录后再来使用',
				icon: 'none'
			})
			return null
		}

		let openid = readStoredOpenId()
		if (openid) {
			return openid
		}

		try {
			console.log('[ensureOpenIdForCheck] 已登录但无 openId，自动获取...')
			const result = await fetchWechatOpenId(false)
			openid = result?.openId || readStoredOpenId()
			if (openid) {
				return openid
			}
		} catch (error) {
			console.error('[ensureOpenIdForCheck] 获取 openId 失败:', error)
		}

		uni.showToast({
			title: '获取微信信息失败，请重试',
			icon: 'none'
		})
		return null
	}

	const parseData = (res) => {
		console.log('[parseData] 原始 res:', res)
		let parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
		console.log('[parseData] 第一层解析后 data:', JSON.stringify(parsed, null, 2))

		if (parsed?.data && typeof parsed.data === 'string') {
			try {
				parsed.data = JSON.parse(parsed.data)
				console.log('[parseData] 第二层解析后 data:', JSON.stringify(parsed.data, null, 2))
			} catch (e) {
				console.warn('[parseData] 第二层JSON解析失败，保持原值:', e)
			}
		}

		return parsed
	}

	const checkText = async (text, options = {}) => {
		console.log('========== [checkText] 开始 ==========')
		console.log('[checkText] 入参 text:', text)
		console.log('[checkText] 入参 options:', JSON.stringify(options))

		const openid = await ensureOpenIdForCheck()
		if (!openid) {
			const result = {
				flag: false,
				txt: '请登录后再来使用'
			}
			console.log('[checkText] 未就绪，返回:', result)
			return result
		}

		if (!text?.trim()) {
			const result = {
				flag: true,
				txt: ''
			}
			console.log('[checkText] 文本为空，直接放行，返回:', result)
			return result
		}

		isChecking.value = true
		console.log('[checkText] isChecking 设置为 true')

		try {
			const requestData = {
				openid,
				scene: options.scene || 1,
				version: options.version || 2,
				content: text
			}
			console.log('[checkText] 即将调用 api.checkText，参数:', JSON.stringify(requestData, null, 2))

			const res = await api.checkText(requestData)
			console.log('[checkText] api.checkText 原始返回:', JSON.stringify(res, null, 2))

			const result = parseData(res)
			console.log('[checkText] 解析后 result:', JSON.stringify(result, null, 2))

			if (result.errcode !== 0) {
				console.warn('[checkText] errcode 不为 0，当前值:', result.errcode)
				uni.showToast({
					title: '文本内容违规',
					icon: 'none'
				})
				const finalResult = {
					flag: false,
					txt: '文本含有违规内容！！'
				}
				console.log('[checkText] 返回结果:', finalResult)
				return checkResult.value = finalResult
			}

			console.log('[checkText] result.detail:', JSON.stringify(result.detail))
			const hasViolation = (result.detail || []).some(item => {
				const isViolation = item.label && item.label !== 100
				console.log(`[checkText] 检查详情项: label=${item.label}, 是否违规=${isViolation}`)
				return isViolation
			})
			console.log(`[checkText] 最终是否有违规: ${hasViolation}`)

			if (hasViolation) {
				console.warn('[checkText] 检测到违规内容')
				uni.showToast({
					title: '文本内容违规',
					icon: 'none'
				})
				const finalResult = {
					flag: false,
					txt: '文本含有违规内容！！'
				}
				console.log('[checkText] 返回结果:', finalResult)
				return checkResult.value = finalResult
			}

			const finalResult = {
				flag: true,
				txt: ''
			}
			console.log('[checkText] ✅ 文本审核通过，返回:', finalResult)
			return checkResult.value = finalResult

		} catch (error) {
			console.error('[checkText] 异常捕获:', error)
			console.error('[checkText] 错误详情:', error.message)
			uni.showToast({
				title: '检测失败，请重试',
				icon: 'none'
			})
			const finalResult = {
				flag: false,
				txt: '检测失败，请重试'
			}
			console.log('[checkText] 异常返回结果:', finalResult)
			return checkResult.value = finalResult
		} finally {
			isChecking.value = false
			console.log('[checkText] isChecking 设置为 false')
			console.log('========== [checkText] 结束 ==========')
		}
	}

	const checkImage = async (url, options = {}) => {
		console.log('========== [checkImage] 开始 ==========')
		console.log('[checkImage] 入参 url:', url)
		console.log('[checkImage] 入参 options:', JSON.stringify(options))

		const openid = await ensureOpenIdForCheck()
		if (!openid) {
			const result = {
				flag: false,
				txt: '请登录后再来使用',
				type: 'img'
			}
			console.log('[checkImage] 未就绪，返回:', result)
			return result
		}

		isChecking.value = true
		console.log('[checkImage] isChecking 设置为 true')

		try {
			uni.showLoading({
				title: '准备审核...',
				mask: true
			})

			const urlReady = await waitMediaUrlReady(url, {
				initialDelay: options.urlReadyInitialDelay ?? 400,
				retryDelay: options.urlReadyRetryDelay ?? 600,
				maxAttempts: options.urlReadyMaxAttempts ?? 5
			})
			if (!urlReady) {
				uni.hideLoading()
				uni.showToast({
					title: '图片地址未就绪，请稍后重试',
					icon: 'none'
				})
				const finalResult = {
					flag: false,
					txt: '图片地址未就绪，请稍后重试',
					type: 'img'
				}
				console.warn('[checkImage] URL 探测失败，未提交审核')
				return checkResult.value = finalResult
			}

			uni.showLoading({
				title: '内容审核中...',
				mask: true
			})

			// 第一步：提交审核任务
			const submitData = {
				openid,
				scene: options.scene || 1,
				version: options.version || 2,
				media_url: url,
				media_type: options.mediaType || 2
			}
			console.log('[checkImage] 步骤1: 提交审核任务，参数:', JSON.stringify(submitData, null, 2))

			const mediaSubmitRetries = options.mediaSubmitRetries ?? 2
			const mediaSubmitRetryDelay = options.mediaSubmitRetryDelay ?? 1000

			let res = await api.checkMedia(submitData)
			console.log('[checkImage] 步骤1 api.checkMedia 原始返回:', JSON.stringify(res, null, 2))

			let result = parseData(res)
			console.log('[checkImage] 步骤1 解析后 result:', JSON.stringify(result, null, 2))

			let innerData = result.data || {}
			console.log('[checkImage] 内层数据:', JSON.stringify(innerData, null, 2))

			let submitRetry = 0
			while (innerData.errcode === 40004 && submitRetry < mediaSubmitRetries) {
				submitRetry += 1
				console.warn(
					`[checkImage] errcode 40004，${mediaSubmitRetryDelay}ms 后第 ${submitRetry}/${mediaSubmitRetries} 次重试提交`
				)
				await sleep(mediaSubmitRetryDelay)
				res = await api.checkMedia(submitData)
				result = parseData(res)
				innerData = result.data || {}
				console.log('[checkImage] 重试提交后 innerData:', JSON.stringify(innerData, null, 2))
			}

			// 如果提交就失败了
			if (innerData.errcode !== 0) {
				const errHint = innerData.errmsg || '图片审核失败，请重试'
				console.warn('[checkImage] 提交审核失败，errcode:', innerData.errcode, errHint)
				uni.hideLoading()
				uni.showToast({
					title: errHint.length > 20 ? '图片审核失败，请重试' : errHint,
					icon: 'none'
				})
				const finalResult = {
					flag: false,
					txt: errHint,
					type: 'img'
				}
				console.log('[checkImage] 返回结果:', finalResult)
				return checkResult.value = finalResult
			}

			console.log('[checkImage] 步骤1 审核任务提交成功，trace_id:', innerData.trace_id)

			// 更新 loading 提示
			uni.showLoading({
				title: '内容审核中...',
				mask: true
			})

			// 等待后端处理
			const initialDelay = options.initialDelay || 10000
			console.log(`[checkImage] 等待 ${initialDelay}ms 让后端处理审核...`)
			await new Promise(resolve => setTimeout(resolve, initialDelay))

			// 第二步：轮询获取审核结果
			let detectionResult = null
			const pollInterval = options.pollInterval || 2000
			const maxPollTimes = options.maxPollTimes || 5
			console.log(`[checkImage] 步骤2: 开始轮询，间隔=${pollInterval}ms，最大次数=${maxPollTimes}`)

			for (let i = 0; i < maxPollTimes; i++) {
				console.log(`[checkImage] 轮询第 ${i + 1}/${maxPollTimes} 次`)
				try {
					const res = await api.getMediaResult(innerData.trace_id)
					console.log(`[checkImage] 轮询第 ${i + 1} 次原始返回:`, JSON.stringify(res, null, 2))

					let parsed = parseData(res)
					console.log(`[checkImage] 轮询第 ${i + 1} 次解析后 parsed:`, JSON.stringify(parsed, null, 2))

					// parsed.data 才是真正的审核结果 { errcode, result: { suggest, label }, errmsg }
					const realResult = parsed?.data
					console.log(`[checkImage] realResult:`, JSON.stringify(realResult, null, 2))

					if (realResult?.result?.suggest) {
						console.log(
							`[checkImage] ✅ 审核结果明确: suggest="${realResult.result.suggest}", label=${realResult.result.label}`
						)
						detectionResult = realResult
						break
					}

					console.log(`[checkImage] 第 ${i + 1} 次轮询结果未就绪，继续等待`)

				} catch (error) {
					console.error(`[checkImage] 轮询失败 (${i + 1}/${maxPollTimes}):`, error)
				}

				if (i < maxPollTimes - 1) {
					await new Promise(resolve => setTimeout(resolve, pollInterval))
				}
			}

			console.log('[checkImage] 步骤2 轮询结束')
			console.log('[checkImage] 最终 detectionResult:', JSON.stringify(detectionResult, null, 2))

			uni.hideLoading()

			// 第三步：判断并返回结果
			console.log('[checkImage] 步骤3: 判断审核结果')

			// 没拿到审核结果，不允许上传
			if (!detectionResult || !detectionResult.result) {
				console.warn('[checkImage] ❌ 审核结果未获取到，拒绝上传')
				uni.showToast({
					title: '内容审核超时，请稍后重试',
					icon: 'none'
				})
				const finalResult = {
					flag: false,
					txt: '内容审核超时，请稍后重试',
					type: 'img'
				}
				console.log('[checkImage] 返回结果:', finalResult)
				return checkResult.value = finalResult
			}

			const suggest = detectionResult.result.suggest
			console.log(`[checkImage] suggest: "${suggest}"`)

			// suggest 为 'pass' 则通过，'block' 或 'review' 则不通过
			const isPass = suggest === 'pass'
			console.log(`[checkImage] 判定是否通过: ${isPass}`)

			if (isPass) {
				console.log('[checkImage] ✅ 图片审核通过')
			} else {
				console.warn(`[checkImage] ❌ 图片审核未通过，suggest: ${suggest}`)
				uni.showToast({
					title: '图片含有违规内容',
					icon: 'none'
				})
			}

			const finalResult = {
				flag: isPass,
				txt: isPass ? '' : '图片含有违规内容！！',
				type: 'img'
			}
			console.log('[checkImage] 返回结果:', JSON.stringify(finalResult))
			return checkResult.value = finalResult

		} catch (error) {
			console.error('[checkImage] 异常捕获:', error)
			console.error('[checkImage] 错误详情:', error.message)
			uni.hideLoading()
			uni.showToast({
				title: '图片检测失败，请重试',
				icon: 'none'
			})
			const finalResult = {
				flag: false,
				txt: '图片检测失败，请重试',
				type: 'img'
			}
			console.log('[checkImage] 异常返回结果:', finalResult)
			return checkResult.value = finalResult
		} finally {
			isChecking.value = false
			console.log('[checkImage] isChecking 设置为 false')
			console.log('========== [checkImage] 结束 ==========')
		}
	}

	const checkMultipleTexts = async (textList) => {
		console.log('========== [checkMultipleTexts] 开始 ==========')
		console.log('[checkMultipleTexts] 待检测文本列表:', JSON.stringify(textList, null, 2))
		const results = []
		for (let i = 0; i < textList.length; i++) {
			console.log(`[checkMultipleTexts] 检测第 ${i + 1}/${textList.length} 条文本:`, textList[i])
			const result = await checkText(textList[i])
			console.log(`[checkMultipleTexts] 第 ${i + 1} 条检测结果:`, JSON.stringify(result))
			results.push(result)
			if (!result.flag) {
				console.warn(`[checkMultipleTexts] 第 ${i + 1} 条文本违规，停止后续检测`)
				break
			}
		}
		console.log('[checkMultipleTexts] 批量检测完成，总结果:', JSON.stringify(results, null, 2))
		console.log('========== [checkMultipleTexts] 结束 ==========')
		return results
	}

	const checkMultipleImages = async (urlList) => {
		console.log('========== [checkMultipleImages] 开始 ==========')
		console.log('[checkMultipleImages] 待检测图片列表:', JSON.stringify(urlList, null, 2))
		const results = []
		for (let i = 0; i < urlList.length; i++) {
			console.log(`[checkMultipleImages] 检测第 ${i + 1}/${urlList.length} 张图片:`, urlList[i])
			const result = await checkImage(urlList[i])
			console.log(`[checkMultipleImages] 第 ${i + 1} 张检测结果:`, JSON.stringify(result))
			results.push(result)
			if (!result.flag) {
				console.warn(`[checkMultipleImages] 第 ${i + 1} 张图片未通过 (flag: ${result.flag})，停止后续检测`)
				break
			}
		}
		console.log('[checkMultipleImages] 批量检测完成，总结果:', JSON.stringify(results, null, 2))
		console.log('========== [checkMultipleImages] 结束 ==========')
		return results
	}

	return {
		isChecking,
		checkResult,
		checkText,
		checkImage,
		checkMultipleTexts,
		checkMultipleImages
	}
}