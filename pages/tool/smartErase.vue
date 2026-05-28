<template>
	<dark-page-meta />
	<view class="erase-page">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @tap="chooseImage">
				<text class="empty-icon">📷</text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持 JPG / PNG，建议小于 5MB</text>
			</view>
			<view v-else class="erase-stage" id="eraseStage">
				<image
					class="stage-image"
					:src="displayImage"
					mode="aspectFit"
					@load="onImageLoad"
					@tap="onPreviewTap"
				/>
				<view
					v-if="stageReady && !resultPath"
					class="erase-box"
					:style="eraseBoxStyle"
					@touchstart.stop="onEraseTouchStart"
					@touchmove.stop.prevent="onEraseTouchMove"
					@touchend.stop="onEraseTouchEnd"
				>
					<view class="erase-box-label">
						<text>消除区域</text>
					</view>
				</view>
				<view v-if="resultPath" class="size-badge">
					<text>消除完成 · 点击预览</text>
				</view>
				<view v-else-if="originSize.width" class="size-badge">
					<text>拖动方框标出要消除的区域</text>
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

		<view v-if="imagePath && stageReady && !resultPath" class="param-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>消除区域（像素）</text>
			</view>
			<view class="param-grid">
				<view class="param-item">
					<text class="param-label">X</text>
					<text class="param-value">{{ pixelRect.x }}</text>
				</view>
				<view class="param-item">
					<text class="param-label">Y</text>
					<text class="param-value">{{ pixelRect.y }}</text>
				</view>
				<view class="param-item">
					<text class="param-label">宽</text>
					<text class="param-value">{{ pixelRect.width }}</text>
				</view>
				<view class="param-item">
					<text class="param-label">高</text>
					<text class="param-value">{{ pixelRect.height }}</text>
				</view>
			</view>
		</view>

		<view v-if="imagePath && stageReady" class="settings-panel boxBg">
			<view
				class="process-btn"
				:class="{ disabled: processing }"
				@tap="handleErase"
			>
				<text>{{ processing ? '消除中...' : (resultPath ? '重新消除' : '开始消除') }}</text>
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
	import { ref, computed, reactive, getCurrentInstance, nextTick } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { apiSmartErase, apiGetAiLog } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin } from '@/utils/user/auth.js'
	import { uploadImageToOss } from '@/utils/image/ossUpload.js'
	import { extractAiLogId, pollAiLogResult, resolveAiLogResultUrl } from '@/utils/ai/aiLog.js'
	import { calcAspectFitRect, clampNormCrop } from '@/utils/image/imageCrop.js'
	import {
		DEFAULT_ERASE_REGION,
		buildSmartErasePayload,
		normRegionToPixel
	} from '@/utils/image/smartErase.js'

	const instance = getCurrentInstance()

	const imagePath = ref('')
	const resultPath = ref('')
	const processing = ref(false)
	const saving = ref(false)
	const originSize = ref({ width: 0, height: 0 })
	const displayRect = ref({ x: 0, y: 0, w: 0, h: 0 })
	const stageReady = ref(false)

	const normRegion = reactive({ ...DEFAULT_ERASE_REGION })

	let touchSnapshot = null

	const displayImage = computed(() => resultPath.value || imagePath.value)

	const pixelRect = computed(() => normRegionToPixel(normRegion, originSize.value))

	const eraseBoxStyle = computed(() => {
		const d = displayRect.value
		if (!d.w || !d.h) return {}
		return {
			left: `${d.x + normRegion.x * d.w}px`,
			top: `${d.y + normRegion.y * d.h}px`,
			width: `${normRegion.w * d.w}px`,
			height: `${normRegion.h * d.h}px`
		}
	})

	const tips = [
		'选择图片，拖动方框圈出需要消除的物体或瑕疵',
		'支持水印、路人、文字等局部消除',
		'处理完成后在原图位置查看效果',
		'满意后保存到相册'
	]

	onLoad((options) => {
		if (options?.title) {
			uni.setNavigationBarTitle({ title: decodeURIComponent(options.title) })
		}
	})

	const loadImageMeta = (path, callback) => {
		uni.getImageInfo({
			src: path,
			success: (info) => {
				originSize.value = {
					width: info.width,
					height: info.height
				}
				callback?.()
			}
		})
	}

	const measureStage = () => {
		const query = uni.createSelectorQuery()
		const scope = instance?.proxy ?? instance
		if (scope) query.in(scope)
		query
			.select('#eraseStage')
			.boundingClientRect((rect) => {
				if (!rect?.width || !rect?.height) return
				const w = originSize.value.width
				const h = originSize.value.height
				if (!w || !h) return
				displayRect.value = calcAspectFitRect(rect.width, rect.height, w, h)
				stageReady.value = true
			})
			.exec()
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
				resetAll(false)
				imagePath.value = path
				loadImageMeta(path, () => nextTick(() => measureStage()))
			},
			fail: (err) => {
				if (/cancel|取消/.test(err?.errMsg || '')) return
				uni.showToast({ title: '选择图片失败', icon: 'none' })
			}
		})
	}

	const resetAll = (clearImage = true) => {
		if (clearImage) {
			imagePath.value = ''
			originSize.value = { width: 0, height: 0 }
			stageReady.value = false
		}
		resultPath.value = ''
		Object.assign(normRegion, { ...DEFAULT_ERASE_REGION })
		touchSnapshot = null
	}

	const onImageLoad = () => {
		if (resultPath.value) return
		nextTick(() => measureStage())
	}

	const onEraseTouchStart = (e) => {
		const touch = e.touches?.[0]
		if (!touch) return
		touchSnapshot = {
			clientX: touch.clientX,
			clientY: touch.clientY,
			regionX: normRegion.x,
			regionY: normRegion.y
		}
	}

	const onEraseTouchMove = (e) => {
		if (!touchSnapshot || !displayRect.value.w) return
		const touch = e.touches?.[0]
		if (!touch) return
		const dx = touch.clientX - touchSnapshot.clientX
		const dy = touch.clientY - touchSnapshot.clientY
		normRegion.x = touchSnapshot.regionX + dx / displayRect.value.w
		normRegion.y = touchSnapshot.regionY + dy / displayRect.value.h
		const clamped = clampNormCrop({
			x: normRegion.x,
			y: normRegion.y,
			w: normRegion.w,
			h: normRegion.h
		})
		normRegion.x = clamped.x
		normRegion.y = clamped.y
	}

	const onEraseTouchEnd = () => {
		touchSnapshot = null
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

	const handleErase = async () => {
		if (processing.value || !imagePath.value || !stageReady.value) return
		if (!checkLogin()) return

		processing.value = true
		resultPath.value = ''
		uni.showLoading({ title: '上传图片...', mask: true })

		try {
			const ossUrl = await uploadImageToOss(imagePath.value)
			uni.showLoading({ title: 'AI 消除中...', mask: true })

			const payload = buildSmartErasePayload(ossUrl, normRegion, originSize.value)
			const res = await apiSmartErase(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, '消除失败'))
			}

			let resultUrl = resolveAiLogResultUrl(body)

			if (!resultUrl) {
				const aiLogId = extractAiLogId(body)
				if (!aiLogId) {
					throw new Error('未获取到任务 ID')
				}
				resultUrl = await pollAiLogResult(apiGetAiLog, aiLogId, {
					onProgress: () => {
						uni.showLoading({ title: 'AI 消除中...', mask: true })
					}
				})
			}

			uni.showLoading({ title: '下载结果...', mask: true })
			const localPath = await downloadResultImage(resultUrl)
			resultPath.value = localPath
			uni.showToast({ title: '消除完成', icon: 'success' })
		} catch (err) {
			console.error('[handleErase]', err)
			uni.showToast({
				title: err?.message || '消除失败，请重试',
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
	.erase-page {
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
	}

	.preview-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 480rpx;
		padding: 80rpx 40rpx;

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

	.erase-stage {
		position: relative;
		width: 100%;
		height: 480rpx;
		overflow: hidden;
	}

	.stage-image {
		width: 100%;
		height: 100%;
	}

	.erase-box {
		position: absolute;
		box-sizing: border-box;
		border: 2rpx dashed #fa709a;
		background: rgba(250, 112, 154, 0.15);
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
		z-index: 2;
	}

	.erase-box-label {
		position: absolute;
		top: -40rpx;
		left: 0;
		padding: 4rpx 12rpx;
		border-radius: 8rpx;
		background: rgba(250, 112, 154, 0.9);

		text {
			font-size: 22rpx;
			color: #ffffff;
		}
	}

	.size-badge {
		position: absolute;
		left: 20rpx;
		bottom: 20rpx;
		padding: 8rpx 20rpx;
		border-radius: 24rpx;
		background: rgba(0, 0, 0, 0.55);
		z-index: 3;

		text {
			font-size: 24rpx;
			color: #4facfe;
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

	.param-panel,
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

	.param-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16rpx;
	}

	.param-item {
		padding: 16rpx 20rpx;
		border-radius: 12rpx;
		background: rgba(0, 0, 0, 0.2);

		.param-label {
			display: block;
			font-size: 22rpx;
			color: rgba(255, 255, 255, 0.5);
			margin-bottom: 6rpx;
		}

		.param-value {
			font-size: 28rpx;
			color: #4facfe;
			font-weight: 600;
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
