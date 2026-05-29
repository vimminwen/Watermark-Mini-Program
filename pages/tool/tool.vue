<template>
	<dark-page-meta />
	<view class="zoom-page">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @tap="chooseImage">
				<text class="empty-icon">📷</text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持 JPG / PNG，建议小于 5MB</text>
			</view>
			<view v-else class="preview-wrap" @tap="onPreviewTap">
				<image class="preview-image" :src="displayImage" mode="aspectFit" />
				<view class="size-badge">
					<text v-if="resultPath && resultSize.width">
						放大完成 {{ resultSize.width }} × {{ resultSize.height }} · 点击预览
					</text>
					<text v-else-if="originSize.width">
						{{ originSize.width }} × {{ originSize.height }}
					</text>
				</view>
			</view>
		</view>

		<view class="toolbar">
			<view class="tool-chip" @tap="chooseImage">
				<text>{{ imagePath ? '🔄 换一张' : '📁 选择图片' }}</text>
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
					v-for="item in scaleOptions"
					:key="item.value"
					class="scale-chip"
					:class="{ active: scale === item.value }"
					@tap="scale = item.value"
				>
					<text class="scale-label">{{ item.label }}</text>
					<text v-if="originSize.width" class="scale-hint">
						→ {{ originSize.width * item.value }}×{{ originSize.height * item.value }}
					</text>
				</view>
			</view>

			<view
				class="process-btn"
				:class="{ disabled: processing }"
				@tap="handleUpscale"
			>
				<text>{{ processing ? '放大中...' : (resultPath ? '重新放大' : '开始放大') }}</text>
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
		<debug-log-panel
			:logs="debugLogs"
			:scroll-top="debugScrollTop"
			@clear="clearDebugLogs"
		/>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { apiImageLosslessZoomSubmit, apiGetAiLog } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin } from '@/utils/user/auth.js'
	import { uploadImageToOss } from '@/utils/image/ossUpload.js'
	import { extractAiLogId, pollAiLogResult, resolveAiLogResultUrl } from '@/utils/ai/aiLog.js'
	import { buildLosslessZoomPayload, ZOOM_SCALE_OPTIONS } from '@/utils/image/losslessZoom.js'
	import { useDebugLog, showTaskLoading, hideTaskLoading } from '@/utils/debug/useDebugLog.js'
	import { baseUrl } from '@/utils/http.js'

	const {
		debugLogs,
		debugScrollTop,
		clearDebugLogs,
		logInfo,
		logStep,
		logOk,
		showDebugError
	} = useDebugLog('losslessZoom')

	const imagePath = ref('')
	const resultPath = ref('')
	const scale = ref(2)
	const processing = ref(false)
	const saving = ref(false)
	const originSize = ref({ width: 0, height: 0 })
	const resultSize = ref({ width: 0, height: 0 })

	const scaleOptions = ZOOM_SCALE_OPTIONS

	const displayImage = computed(() => resultPath.value || imagePath.value)

	const tips = [
		'选择需要放大的照片，推荐原图边长不超过 2000px',
		'选择 2 / 3 / 4 倍放大后点击「开始放大」',
		'放大完成后在原图位置查看高清效果',
		'满意后保存到相册；处理过程需登录账号'
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

	const chooseImage = () => {
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

	const setResultFromPath = (path) => {
		resultPath.value = path
		uni.getImageInfo({
			src: path,
			success: (info) => {
				resultSize.value = { width: info.width, height: info.height }
			}
		})
	}

	const onPreviewTap = () => {
		if (!resultPath.value) return
		uni.previewImage({
			urls: [resultPath.value],
			current: resultPath.value
		})
	}

	const handleUpscale = async () => {
		if (processing.value || !imagePath.value) return
		if (!checkLogin()) return

		processing.value = true
		resultPath.value = ''
		resultSize.value = { width: 0, height: 0 }
		logInfo(`API 根地址: ${baseUrl}`)
		logStep('1/4 上传图片到 OSS')
		showTaskLoading({ title: '上传图片...', mask: true })

		try {
			const ossUrl = await uploadImageToOss(imagePath.value)
			logOk(`OSS 上传成功\n${ossUrl}`)
			logStep(`2/4 提交放大任务 (${scale.value}x)`)
			showTaskLoading({ title: 'AI 放大中...', mask: true })

			const payload = buildLosslessZoomPayload(ossUrl, scale.value)
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
						showTaskLoading({ title: 'AI 放大中...', mask: true })
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
		background: linear-gradient(to bottom, #050d40, #233968);
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
		}

		.empty-title {
			font-size: 32rpx;
			color: #ffffff;
			margin-bottom: 12rpx;
		}

		.empty-desc {
			font-size: 26rpx;
			color: rgba(255, 255, 255, 0.5);
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
			color: #ffffff;
		}
	}

	.scale-options {
		display: flex;
		gap: 16rpx;
		margin-bottom: 24rpx;
	}

	.scale-chip {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20rpx 12rpx;
		border-radius: 16rpx;
		background: rgba(255, 255, 255, 0.08);
		border: 2rpx solid transparent;

		.scale-label {
			font-size: 30rpx;
			font-weight: 600;
			color: rgba(255, 255, 255, 0.75);
		}

		.scale-hint {
			font-size: 22rpx;
			color: rgba(255, 255, 255, 0.45);
			margin-top: 8rpx;
			text-align: center;
		}

		&.active {
			background: rgba(79, 172, 254, 0.2);
			border-color: #4facfe;

			.scale-label {
				color: #4facfe;
			}

			.scale-hint {
				color: rgba(79, 172, 254, 0.8);
			}
		}

		&:active {
			opacity: 0.85;
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
			color: #ffffff;
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
</style>
