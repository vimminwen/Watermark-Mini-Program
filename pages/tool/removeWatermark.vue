<template>
	<dark-page-meta />
	<view class="watermark-page" :class="themeClass">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @tap="chooseImage">
				<text class="iconfont icon-shengchengAI3 empty-icon"></text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持 JPG / PNG，建议小于 5MB</text>
			</view>
			<view v-else class="preview-wrap" @tap="onPreviewTap">
				<image class="preview-image" :src="displayImage" mode="aspectFit" />
				<view v-if="resultPath || originSize.width" class="size-badge">
					<text v-if="resultPath">去水印完成 · 点击预览</text>
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
				@tap="onProcessTap"
			>
				<processing-text
					:active="processing"
					text="去水印中"
					:idle-text="resultPath ? '重新去水印' : '开始去水印'"
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
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref, computed } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { apiRemoveWatermark, apiGetAiLog } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin, beforeUploadCheck, recordTrialUseAfterSuccess } from '@/utils/user/auth.js'
	import { uploadImageToOss } from '@/utils/image/ossUpload.js'
	import { extractAiLogId, pollAiLogResult, resolveAiLogResultUrl } from '@/utils/ai/aiLog.js'
	import { buildRemoveWatermarkPayload } from '@/utils/image/removeWatermark.js'
	import { showTaskLoading, hideTaskLoading, resolveUserErrorMessage } from '@/utils/debug/useDebugLog.js'

	const imagePath = ref('')
	const resultPath = ref('')
	const processing = ref(false)
	const saving = ref(false)
	const originSize = ref({ width: 0, height: 0 })

	const displayImage = computed(() => resultPath.value || imagePath.value)

	const tips = [
		'选择带有水印、LOGO 或文字标识的图片',
		'点击「开始去水印」后自动识别并处理',
		'处理完成后在原图位置查看效果',
		'满意后保存到相册'
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
			resultPath.value = ''
		}
		handleRemoveWatermark()
	}

	const handleRemoveWatermark = async () => {
		if (processing.value || !imagePath.value) return
		if (!checkLogin()) return

		processing.value = true
		showTaskLoading({ title: '上传图片...', mask: true })

		try {
			const ossUrl = await uploadImageToOss(imagePath.value)
			showTaskLoading({ title: '去水印中...', mask: true })

			const payload = buildRemoveWatermarkPayload(ossUrl)
			const res = await apiRemoveWatermark(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, '去水印失败'))
			}

			let resultUrl = resolveAiLogResultUrl(body)

			if (!resultUrl) {
				const aiLogId = extractAiLogId(body)
				if (!aiLogId) {
					throw new Error('未获取到任务 ID')
				}
				resultUrl = await pollAiLogResult(apiGetAiLog, aiLogId, {
					onProgress: () => {
						showTaskLoading({ title: '去水印中...', mask: true })
					}
				})
			}

			showTaskLoading({ title: '下载结果...', mask: true })
			resultPath.value = await downloadResultImage(resultUrl)
			uni.showToast({ title: '去水印完成', icon: 'success' })
			recordTrialUseAfterSuccess()
		} catch (err) {
			console.error('[handleRemoveWatermark]', err)
			const msg = resolveUserErrorMessage(err, '去水印失败，请换一张图片重试')
			if (msg) {
				uni.showToast({ title: msg, icon: 'none' })
			}
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
	.watermark-page {
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
</style>
