<template>
	<dark-page-meta />
	<view class="cutout-page">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @tap="chooseImage">
				<text class="empty-icon">📷</text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持 JPG / PNG，建议小于 5MB</text>
			</view>
			<view v-else class="preview-wrap" :class="{ 'checker-bg': resultPath }" @tap="onPreviewTap">
				<image class="preview-image" :src="displayImage" mode="aspectFit" />
				<view v-if="resultPath || originSize.width" class="size-badge">
					<text v-if="resultPath">抠图完成 · 点击预览</text>
					<text v-else>{{ originSize.width }} × {{ originSize.height }}</text>
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
			<view
				class="process-btn"
				:class="{ disabled: processing }"
				@tap="handleCutout"
			>
				<text>{{ processing ? '抠图中...' : (resultPath ? '重新抠图' : '开始抠图') }}</text>
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
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { apiCutout, apiGetAiLog } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin } from '@/utils/user/auth.js'
	import { uploadImageToOss } from '@/utils/image/ossUpload.js'
	import { extractAiLogId, pollAiLogResult, resolveAiLogResultUrl } from '@/utils/ai/aiLog.js'
	import { buildCutoutPayload } from '@/utils/image/cutout.js'

	const imagePath = ref('')
	const resultPath = ref('')
	const processing = ref(false)
	const saving = ref(false)
	const originSize = ref({ width: 0, height: 0 })

	const displayImage = computed(() => resultPath.value || imagePath.value)

	const tips = [
		'选择含清晰主体的照片，人像、商品、动物效果更佳',
		'点击「开始抠图」后 AI 自动识别并去除背景',
		'抠图完成后在原图位置展示透明背景效果',
		'满意后点击「保存到相册」'
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
	}

	const onPreviewTap = () => {
		if (!resultPath.value) return
		uni.previewImage({
			urls: [resultPath.value],
			current: resultPath.value
		})
	}

	const handleCutout = async () => {
		if (processing.value || !imagePath.value) return
		if (!checkLogin()) return

		processing.value = true
		resultPath.value = ''
		uni.showLoading({ title: '上传图片...', mask: true })

		try {
			const ossUrl = await uploadImageToOss(imagePath.value)
			uni.showLoading({ title: 'AI 抠图中...', mask: true })

			const payload = buildCutoutPayload(ossUrl)
			const res = await apiCutout(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, '抠图失败'))
			}

			let resultUrl = resolveAiLogResultUrl(body)

			if (!resultUrl) {
				const aiLogId = extractAiLogId(body)
				if (!aiLogId) {
					throw new Error('未获取到任务 ID')
				}

				uni.showLoading({ title: 'AI 抠图中...', mask: true })
				resultUrl = await pollAiLogResult(apiGetAiLog, aiLogId, {
					onProgress: () => {
						uni.showLoading({ title: 'AI 抠图中...', mask: true })
					}
				})
			}

			uni.showLoading({ title: '下载结果...', mask: true })
			const localPath = await downloadResultImage(resultUrl)
			setResultFromPath(localPath)
			uni.showToast({ title: '抠图完成', icon: 'success' })
		} catch (err) {
			console.error('[handleCutout]', err)
			uni.showToast({
				title: err?.message || '抠图失败，请重试',
				icon: 'none'
			})
		} finally {
			processing.value = false
			uni.hideLoading()
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
	.cutout-page {
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

		&.checker-bg {
			background-image:
				linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
				linear-gradient(-45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
				linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%),
				linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%);
			background-size: 24rpx 24rpx;
			background-position: 0 0, 0 12rpx, 12rpx -12rpx, -12rpx 0;
			background-color: rgba(0, 0, 0, 0.25);
		}

		.preview-image {
			width: 100%;
			height: 100%;
		}

		.size-badge {
			position: absolute;
			left: 20rpx;
			bottom: 20rpx;
			padding: 8rpx 20rpx;
			border-radius: 24rpx;
			background: rgba(0, 0, 0, 0.55);

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
