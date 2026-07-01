<template>
	<dark-page-meta />
	<view class="zoom-page" :class="themeClass">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @tap="chooseImage">
				<text class="iconfont icon-fangda- empty-icon"></text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持 JPG / PNG，建议小于 5MB</text>
			</view>
			<view v-else class="preview-wrap" @tap="onPreviewTap">
				<image class="preview-image" :src="displayImage" mode="aspectFit" />
				<view class="size-badge">
					<text v-if="resultPath && resultSize.width">
						放大完成 {{ resultSize.width }} × {{ resultSize.height }}
						<text v-if="scale !== 1">（{{ scale }}×）</text>
						· 点击预览
					</text>
					<text v-else-if="originSize.width">
						{{ originSize.width }} × {{ originSize.height }}
						<text v-if="scale !== 1">
							 → {{ selectedOutputSize.width }} × {{ selectedOutputSize.height }}
						</text>
					</text>
				</view>
			</view>
		</view>

		<view class="toolbar">
			<view class="tool-chip" @tap="chooseImage">
				<text>{{ imagePath ? ' 换一张' : ' 选择图片' }}</text>
			</view>
			<view v-if="imagePath" class="tool-chip danger" @tap="resetAll">
				<text>清空</text>
			</view>
		</view>

		<view v-if="imagePath" class="settings-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>放大倍数</text>
			</view>
			<view class="scale-options">
				<view
					v-for="item in scaleOptionsWithMeta"
					:key="item.value"
					class="scale-chip"
					:class="{
						active: scale === item.value,
						disabled: processing,
						'at-max': item.atMax
					}"
					@tap="selectScale(item.value)"
				>
					<text class="scale-label">{{ item.label }}</text>
					<text v-if="originSize.width" class="scale-hint">
						→ {{ item.outputSize.width }}×{{ item.outputSize.height }}
					</text>
				</view>
			</view>
			<view v-if="hasMaxScaleOptions" class="scale-max-note">
				<text class="scale-max-note-icon">●</text>
				<text>高亮选项表示该倍数下输出已达上限，继续提高倍数尺寸不再增大</text>
			</view>

			<view
				class="process-btn"
				:class="{ disabled: processing }"
				@tap="onProcessTap"
			>
				<processing-text
					:active="processing"
					text="放大中"
					:idle-text="resultPath ? '重新放大' : '开始放大'"
				/>
			</view>
			<view
				v-if="resultPath"
				class="save-btn"
				:class="{ disabled: saving }"
				@tap="saveImage"
			>
				<text>{{ saving ? '保存中...' : '保存到相册' }}</text>
			</view>
		</view>

		<tool-tips-card :tips="tips" />
		<canvas type="2d" id="upscaleCanvas" class="export-canvas" />
		<!-- 上传日志（调试时取消注释）
		<debug-log-panel
			:logs="debugLogs"
			:scroll-top="debugScrollTop"
			@clear="clearDebugLogs"
		/>
		-->
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref, computed, getCurrentInstance } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	// import { apiImageLosslessZoomSubmit, apiGetAiLog } from '@/api/api.js'
	// import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	// import { checkLogin } from '@/utils/user/auth.js'
	// import { uploadImageToOss } from '@/utils/image/ossUpload.js'
	// import { extractAiLogId, pollAiLogResult, resolveAiLogResultUrl } from '@/utils/ai/aiLog.js'
	// import { buildLosslessZoomPayload } from '@/utils/image/losslessZoom.js'
	// import { useDebugLog, showTaskLoading, hideTaskLoading } from '@/utils/debug/useDebugLog.js'
	// import { baseUrl } from '@/utils/http.js'
	import { UPSCALE_OPTIONS, upscaleImageLocal, computeUpscaleOutputSize, isScaleAtMaxOutput } from '@/utils/image/imageUpscale.js'
	import { beforeUploadCheck, recordTrialUseAfterSuccess } from '@/utils/user/auth.js'

	const instance = getCurrentInstance()

	// const {
	// 	debugLogs,
	// 	debugScrollTop,
	// 	clearDebugLogs,
	// 	logInfo,
	// 	logStep,
	// 	logOk,
	// 	showDebugError
	// } = useDebugLog('losslessZoom')

	const imagePath = ref('')
	const resultPath = ref('')
	const scale = ref(2)
	const processing = ref(false)
	const saving = ref(false)
	const originSize = ref({ width: 0, height: 0 })
	const resultSize = ref({ width: 0, height: 0 })

	const scaleOptions = UPSCALE_OPTIONS

	const displayImage = computed(() => resultPath.value || imagePath.value)

	const selectedOutputSize = computed(() =>
		computeUpscaleOutputSize(originSize.value.width, originSize.value.height, scale.value)
	)

	const scaleOptionsWithMeta = computed(() => {
		const w = originSize.value.width
		const h = originSize.value.height
		return scaleOptions.map((item) => ({
			...item,
			outputSize: computeUpscaleOutputSize(w, h, item.value),
			atMax: w && h ? isScaleAtMaxOutput(w, h, item.value) : false
		}))
	})

	const hasMaxScaleOptions = computed(() =>
		scaleOptionsWithMeta.value.some((item) => item.atMax)
	)

	const tips = [
		'选择需要放大的照片，推荐原图边长不超过 2000px',
		'支持 1× ~ 8× 多种倍数，最高支持4096px',
		'输出最长边超过 4096px 时会自动限制，选项尺寸即为实际输出',
		'满意后保存到相册；所有处理均在本地完成，保护隐私'
	]

	onLoad((options) => {
		if (options?.title) {
			uni.setNavigationBarTitle({ title: decodeURIComponent(options.title) })
		}
	})

	const loadImageMeta = (path) => {
		uni.getImageInfo({
			src: path,
			success: (info) => {
				originSize.value = {
					width: info.width,
					height: info.height
				}
			}
		})
	}

	const chooseImage = async () => {
		if (!(await beforeUploadCheck())) return
		uni.chooseImage({
			count: 1,
			sizeType: ['compressed', 'original'],
			sourceType: ['album', 'camera'],
			success: (res) => {
				const path = res.tempFilePaths?.[0]
				if (!path) return
				const size = res.tempFiles?.[0]?.size
				if (size && size > 5 * 1024 * 1024) {
					uni.showToast({ title: '图片请小于 5MB', icon: 'none' })
					return
				}
				imagePath.value = path
				resultPath.value = ''
				resultSize.value = { width: 0, height: 0 }
				scale.value = 2
				loadImageMeta(path)
			},
			fail: (err) => {
				if (/cancel|取消/.test(err?.errMsg || '')) return
				uni.showToast({ title: '选择图片失败', icon: 'none' })
			}
		})
	}

	const resetAll = () => {
		imagePath.value = ''
		resultPath.value = ''
		originSize.value = { width: 0, height: 0 }
		resultSize.value = { width: 0, height: 0 }
		scale.value = 2
	}

	const downloadResultImage = (url) =>
		new Promise((resolve, reject) => {
			uni.downloadFile({
				url,
				success: (res) => {
					if (res.statusCode === 200 && res.tempFilePath) {
						resolve(res.tempFilePath)
					} else {
						reject(new Error('下载结果失败'))
					}
				},
				fail: reject
			})
		})

	const setResultFromPath = (path, size = null) => {
		resultPath.value = path
		if (size?.width && size?.height) {
			resultSize.value = { width: size.width, height: size.height }
			return
		}
		uni.getImageInfo({
			src: path,
			success: (info) => {
				resultSize.value = { width: info.width, height: info.height }
			}
		})
	}

	const clearResult = () => {
		resultPath.value = ''
		resultSize.value = { width: 0, height: 0 }
	}

	const selectScale = (value) => {
		if (processing.value) return
		scale.value = value
		if (resultPath.value) {
			clearResult()
		}
	}

	const onPreviewTap = () => {
		if (!resultPath.value) return
		uni.previewImage({
			urls: [resultPath.value],
			current: resultPath.value
		})
	}

	const onProcessTap = () => {
		if (processing.value) return
		if (resultPath.value) {
			clearResult()
			return
		}
		handleUpscale()
	}

	const handleUpscale = async () => {
		if (processing.value || !imagePath.value) return

		const upscaleScale = scale.value
		processing.value = true
		clearResult()

		try {
			const { tempPath, width, height } = await upscaleImageLocal(
				'#upscaleCanvas',
				imagePath.value,
				upscaleScale,
				instance?.proxy ?? instance
			)
			setResultFromPath(tempPath, { width, height })
			recordTrialUseAfterSuccess()
			uni.showToast({ title: '放大完成', icon: 'success' })
		} catch (err) {
			console.error('[handleUpscale]', err)
			uni.showToast({
				title: err?.message || '放大失败，请换一张图片重试',
				icon: 'none'
			})
		} finally {
			processing.value = false
		}

		/* 后端接口放大（已停用，恢复时取消注释并移除上方本地放大逻辑）
		if (!checkLogin()) return

		logInfo(`API 根地址: ${baseUrl}`)
		logStep('1/4 上传图片到 OSS')
		showTaskLoading({ title: '上传图片...', mask: true })

		try {
			const ossUrl = await uploadImageToOss(imagePath.value)
			logOk(`OSS 上传成功\n${ossUrl}`)
			logStep(`2/4 提交放大任务 (${upscaleScale}x)`)
			showTaskLoading({ title: '放大中...', mask: true })

			const payload = buildLosslessZoomPayload(ossUrl, upscaleScale)
			const res = await apiImageLosslessZoomSubmit(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, '放大失败'))
			}

			let resultUrl = resolveAiLogResultUrl(body)

			if (!resultUrl) {
				const aiLogId = extractAiLogId(body)
				if (!aiLogId) {
					throw new Error('未获取到任务 ID')
				}
				logStep(`3/4 轮询任务结果 (id=${aiLogId})`)
				resultUrl = await pollAiLogResult(apiGetAiLog, aiLogId, {
					onProgress: (attempt, maxAttempts) => {
						logInfo(`轮询中: ${attempt}/${maxAttempts}`)
						showTaskLoading({ title: '放大中...', mask: true })
					}
				})
				logOk(`任务完成\n${resultUrl}`)
			} else {
				logOk(`同步返回结果\n${resultUrl}`)
			}

			logStep('4/4 下载结果')
			showTaskLoading({ title: '下载结果...', mask: true })
			const localPath = await downloadResultImage(resultUrl)
			setResultFromPath(localPath)
			logOk('放大完成')
			uni.showToast({ title: '放大完成', icon: 'success' })
		} catch (err) {
			console.error('[handleUpscale]', err)
			showDebugError('放大失败', err)
		} finally {
			processing.value = false
			hideTaskLoading()
		}
		*/
	}

	const saveImage = () => {
		if (saving.value || !resultPath.value) return
		saving.value = true
		uni.saveImageToPhotosAlbum({
			filePath: resultPath.value,
			success: () => {
				uni.showToast({ title: '已保存到相册', icon: 'success' })
			},
			fail: (err) => {
				console.error('[saveImage]', err)
				const denied = /auth deny|authorize|permission/i.test(err?.errMsg || '')
				if (denied) {
					uni.showModal({
						title: '需要相册权限',
						content: '请在设置中允许保存到相册',
						confirmText: '去设置',
						success: (res) => {
							if (res.confirm) uni.openSetting()
						}
					})
				} else {
					uni.showToast({ title: '保存失败', icon: 'none' })
				}
			},
			complete: () => {
				saving.value = false
			}
		})
	}
</script>

<style lang="scss" scoped>
	.zoom-page {
		min-height: 100vh;
		padding: 30rpx;
		padding-bottom: 140rpx;
		box-sizing: border-box;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
	}

	.preview-card {
		border-radius: 20rpx;
		overflow: hidden;
		margin-bottom: 24rpx;
		min-height: 480rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 80rpx 40rpx;
		width: 100%;

		&:active {
			opacity: 0.85;
		}

		.empty-icon {
			font-size: 88rpx;
			margin-bottom: 24rpx;
			background: linear-gradient(to bottom, #aa2267, #fe764e);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}

		.empty-title {
			font-size: 32rpx;
			color: var(--text-primary);
			margin-bottom: 12rpx;
		}

		.empty-desc {
			font-size: 26rpx;
			color: var(--text-muted);
		}
	}

	.preview-wrap {
		position: relative;
		width: 100%;
		height: 480rpx;

		.preview-image {
			width: 100%;
			height: 100%;
		}

		.size-badge {
			position: absolute;
			left: 20rpx;
			right: 20rpx;
			bottom: 20rpx;
			padding: 8rpx 20rpx;
			border-radius: 24rpx;
			background: rgba(0, 0, 0, 0.55);
			text-align: center;

			text {
				font-size: 24rpx;
				color: #4facfe;
			}
		}
	}

	.toolbar {
		display: flex;
		gap: 20rpx;
		margin-bottom: 24rpx;

		.tool-chip {
			flex: 1;
			padding: 20rpx 0;
			text-align: center;
			border-radius: 40rpx;
			background: rgba(79, 172, 254, 0.15);
			border: 2rpx solid rgba(79, 172, 254, 0.35);

			text {
				font-size: 28rpx;
				color: #4facfe;
			}

			&.danger {
				background: rgba(255, 100, 100, 0.1);
				border-color: rgba(255, 100, 100, 0.35);

				text {
					color: #ff8a8a;
				}
			}

			&:active {
				opacity: 0.85;
			}
		}
	}

	.settings-panel {
		border-radius: 20rpx;
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.section-label {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;

		.label-line {
			width: 8rpx;
			height: 32rpx;
			background: linear-gradient(to bottom, #4facfe, #00f2fe);
			border-radius: 4rpx;
			margin-right: 14rpx;

			&.line-pink {
				background: linear-gradient(to bottom, #fa709a, #fee140);
			}
		}

		text {
			font-size: 30rpx;
			font-weight: 600;
			color: var(--text-primary);
		}
	}

	.scale-options {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
		margin-bottom: 16rpx;
	}

	.scale-max-note {
		display: flex;
		align-items: flex-start;
		gap: 10rpx;
		padding: 16rpx 18rpx;
		margin-bottom: 24rpx;
		border-radius: 12rpx;
		background: rgba(254, 193, 64, 0.1);
		border: 1rpx solid rgba(254, 193, 64, 0.25);

		.scale-max-note-icon {
			flex-shrink: 0;
			font-size: 18rpx;
			line-height: 1.6;
			color: #fec140;
		}

		text {
			font-size: 24rpx;
			line-height: 1.5;
			color: rgba(254, 193, 64, 0.95);
		}
	}

	.scale-chip {
		width: calc(25% - 12rpx);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 18rpx 8rpx;
		border-radius: 16rpx;
		background: var(--surface-bg);
		border: 2rpx solid transparent;

		.scale-label {
			font-size: 26rpx;
			font-weight: 600;
			color: var(--text-secondary);
		}

		.scale-hint {
			font-size: 20rpx;
			color: var(--text-muted);
			margin-top: 6rpx;
			text-align: center;
			line-height: 1.3;
		}

		&.active {
			background: rgba(79, 172, 254, 0.2);
			border-color: #4facfe;

			.scale-label {
				color: #4facfe;
			}

			.scale-hint {
				color: var(--text-muted);
			}
		}

		&.at-max:not(.active) {
			background: rgba(254, 193, 64, 0.12);
			border-color: rgba(254, 193, 64, 0.45);

			.scale-label {
				color: #fec140;
			}

			.scale-hint {
				color: rgba(254, 193, 64, 0.85);
			}
		}

		&.active.at-max {
			background: rgba(254, 193, 64, 0.18);
			border-color: #fec140;

			.scale-label {
				color: #fec140;
			}

			.scale-hint {
				color: rgba(254, 193, 64, 0.85);
			}
		}

		&:active {
			opacity: 0.85;
		}

		&.disabled {
			opacity: 0.45;
			pointer-events: none;
		}
	}

	.process-btn {
		background: linear-gradient(to right, #4facfe, #00f2fe);
		padding: 28rpx;
		border-radius: 50rpx;
		text-align: center;

		&.disabled {
			opacity: 0.7;
		}

		text {
			font-size: 32rpx;
			font-weight: bold;
			color: var(--text-primary);
		}

		&:active:not(.disabled) {
			opacity: 0.9;
			transform: scale(0.98);
		}
	}

	.save-btn {
		margin-top: 20rpx;
		padding: 28rpx;
		border-radius: 50rpx;
		text-align: center;
		background: rgba(79, 172, 254, 0.15);
		border: 2rpx solid rgba(79, 172, 254, 0.35);

		&.disabled {
			opacity: 0.7;
		}

		text {
			font-size: 30rpx;
			color: #4facfe;
			font-weight: 600;
		}

		&:active:not(.disabled) {
			opacity: 0.85;
		}
	}

	.export-canvas {
		position: fixed;
		left: -9999px;
		top: -9999px;
		width: 300px;
		height: 300px;
		opacity: 0;
		pointer-events: none;
	}
</style>
