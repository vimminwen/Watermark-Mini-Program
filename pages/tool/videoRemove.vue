<template>
	<dark-page-meta />
	<view class="remove-page">
		<view class="preview-card boxBg">
			<view v-if="!videoPath" class="preview-empty" @tap="chooseVideo">
				<text class="empty-icon">🎬</text>
				<text class="empty-title">点击选择视频</text>
				<text class="empty-desc">支持相册视频，建议 100MB 以内</text>
			</view>
			<view v-else class="crop-stage" id="videoStage">
				<image
					class="stage-thumb"
					:src="thumbPath || videoPath"
					mode="aspectFit"
					@load="onThumbLoad"
				/>
				<view
					v-if="stageReady"
					class="crop-box"
					:style="cropBoxStyle"
					@touchstart.stop="onCropTouchStart"
					@touchmove.stop.prevent="onCropTouchMove"
					@touchend.stop="onCropTouchEnd"
				>
					<view class="crop-grid">
						<view class="grid-line h1"></view>
						<view class="grid-line h2"></view>
						<view class="grid-line v1"></view>
						<view class="grid-line v2"></view>
					</view>
				</view>
				<view v-if="videoMeta.width" class="meta-badge">
					<text>{{ videoMeta.width }}×{{ videoMeta.height }} · {{ videoMeta.duration }}s</text>
				</view>
			</view>
		</view>

		<view class="toolbar">
			<view class="tool-chip" @tap="chooseVideo">
				<text>{{ videoPath ? '🔄 换一个' : '📁 选择视频' }}</text>
			</view>
			<view v-if="videoPath" class="tool-chip danger" @click="resetAll">
				<text>清空</text>
			</view>
		</view>

		<view v-if="videoPath" class="settings-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>消除区域</text>
			</view>
			<scroll-view class="chip-scroll" scroll-x enable-flex>
				<view
					v-for="item in regionPresets"
					:key="item.id"
					class="option-chip"
					:class="{ active: activeRegionId === item.id }"
					@click="selectRegionPreset(item)"
				>
					<text>{{ item.label }}</text>
				</view>
			</scroll-view>

			<view class="section-label region-params">
				<view class="label-line"></view>
				<text>区域参数（像素）</text>
			</view>
			<view class="param-grid">
				<view class="param-item">
					<text class="param-label">X</text>
					<text class="param-value">{{ pixelRegion.x }}</text>
				</view>
				<view class="param-item">
					<text class="param-label">Y</text>
					<text class="param-value">{{ pixelRegion.y }}</text>
				</view>
				<view class="param-item">
					<text class="param-label">宽 W</text>
					<text class="param-value">{{ pixelRegion.w }}</text>
				</view>
				<view class="param-item">
					<text class="param-label">高 H</text>
					<text class="param-value">{{ pixelRegion.h }}</text>
				</view>
			</view>

			<view class="section-label">
				<view class="label-line"></view>
				<text>消除类型</text>
			</view>
			<scroll-view class="chip-scroll" scroll-x enable-flex>
				<view
					v-for="item in functionTypes"
					:key="item.id"
					class="option-chip"
					:class="{ active: functionType === item.id }"
					@click="functionType = item.id"
				>
					<text>{{ item.label }}</text>
				</view>
			</scroll-view>

			<view
				class="process-btn"
				:class="{ disabled: processing }"
				@click="handleRemove"
			>
				<text>{{ processing ? '处理中...' : '开始消除' }}</text>
			</view>
		</view>

		<view v-if="resultPath" class="result-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>处理结果</text>
			</view>
			<video
				class="result-video"
				:src="resultPath"
				controls
				show-center-play-btn
				object-fit="contain"
			/>
			<view class="result-actions">
				<view class="result-btn primary" @click="saveVideo">
					<text>{{ saving ? '保存中...' : '保存到相册' }}</text>
				</view>
				<view class="result-btn" @click="previewResult">
					<text>全屏预览</text>
				</view>
			</view>
		</view>

		<tool-tips-card :tips="tips" />
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed, reactive, getCurrentInstance, nextTick } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { apiSubtitleRemoval, apiGetAiLog } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin } from '@/utils/user/auth.js'
	import { extractAiLogId, pollAiLogResult, resolveAiLogResultUrl } from '@/utils/ai/aiLog.js'
	import { calcAspectFitRect, clampNormCrop } from '@/utils/image/imageCrop.js'
	import { uploadVideoToOss } from '@/utils/video/ossUpload.js'
	import {
		REMOVAL_FUNCTION_TYPES,
		REMOVAL_REGION_PRESETS,
		DEFAULT_REMOVAL_REGION,
		buildSubtitleRemovalPayload,
		normalizeRemovalVideoUrl
	} from '@/utils/video/subtitleRemoval.js'

	const instance = getCurrentInstance()

	const videoPath = ref('')
	const thumbPath = ref('')
	const resultPath = ref('')
	const videoMeta = ref({ width: 0, height: 0, duration: 0 })
	const displayRect = ref({ x: 0, y: 0, w: 0, h: 0 })
	const stageReady = ref(false)
	const activeRegionId = ref('bottom')
	const functionType = ref('subtitle_removal')
	const processing = ref(false)
	const saving = ref(false)

	const normCrop = reactive({ ...DEFAULT_REMOVAL_REGION })

	const regionPresets = REMOVAL_REGION_PRESETS
	const functionTypes = REMOVAL_FUNCTION_TYPES

	let touchSnapshot = null

	const tips = [
		'选择视频后，在封面上拖动方框标出要消除的区域',
		'可使用「底部字幕」等快捷区域，或手动拖动调整',
		'处理需上传视频并调用 AI，请保持网络畅通',
		'处理完成后可预览并保存到相册'
	]

	const pixelRegion = computed(() => {
		const w = videoMeta.value.width || 0
		const h = videoMeta.value.height || 0
		if (!w || !h) {
			return { x: 0, y: 0, w: 0, h: 0 }
		}
		return {
			x: Math.round(normCrop.x * w),
			y: Math.round(normCrop.y * h),
			w: Math.max(1, Math.round(normCrop.w * w)),
			h: Math.max(1, Math.round(normCrop.h * h))
		}
	})

	const cropBoxStyle = computed(() => {
		const d = displayRect.value
		if (!d.w || !d.h) return {}
		return {
			left: `${d.x + normCrop.x * d.w}px`,
			top: `${d.y + normCrop.y * d.h}px`,
			width: `${normCrop.w * d.w}px`,
			height: `${normCrop.h * d.h}px`
		}
	})

	onLoad((options) => {
		if (options?.title) {
			uni.setNavigationBarTitle({ title: decodeURIComponent(options.title) })
		}
	})

	const applyVideoFile = (file) => {
		const path = file?.tempFilePath
		if (!path) {
			uni.showToast({ title: '未获取到视频文件', icon: 'none' })
			return
		}
		if (file.size && file.size > 100 * 1024 * 1024) {
			uni.showToast({ title: '视频请小于 100MB', icon: 'none' })
			return
		}

		resultPath.value = ''
		stageReady.value = false
		videoPath.value = path
		thumbPath.value = file.thumbTempFilePath || ''
		videoMeta.value = {
			width: file.width || 0,
			height: file.height || 0,
			duration: Math.round(file.duration || 0)
		}
		Object.assign(normCrop, { ...DEFAULT_REMOVAL_REGION })
		activeRegionId.value = 'bottom'
		nextTick(() => measureStage())
	}

	const onPickFail = (err) => {
		console.warn('[chooseVideo]', err)
		const msg = String(err?.errMsg || err?.message || '')
		if (/cancel|取消/.test(msg)) return
		uni.showToast({
			title: msg.includes('auth') ? '请授权相册/相机权限' : '选择视频失败',
			icon: 'none'
		})
	}

	const chooseVideo = () => {
		// 微信小程序优先 chooseMedia（chooseVideo 的 maxDuration 上限为 60）
		if (typeof uni.chooseMedia === 'function') {
			uni.chooseMedia({
				count: 1,
				mediaType: ['video'],
				sourceType: ['album', 'camera'],
				maxDuration: 60,
				success: (res) => {
					const file = res.tempFiles?.[0]
					if (!file) {
						uni.showToast({ title: '未选择视频', icon: 'none' })
						return
					}
					applyVideoFile({
						tempFilePath: file.tempFilePath,
						thumbTempFilePath: file.thumbTempFilePath,
						size: file.size,
						width: file.width,
						height: file.height,
						duration: file.duration
					})
				},
				fail: onPickFail
			})
			return
		}

		uni.chooseVideo({
			sourceType: ['album', 'camera'],
			compressed: true,
			maxDuration: 60,
			success: (res) => {
				applyVideoFile({
					tempFilePath: res.tempFilePath,
					thumbTempFilePath: res.thumbTempFilePath,
					size: res.size,
					width: res.width,
					height: res.height,
					duration: res.duration
				})
			},
			fail: onPickFail
		})
	}

	const resetAll = () => {
		videoPath.value = ''
		thumbPath.value = ''
		resultPath.value = ''
		videoMeta.value = { width: 0, height: 0, duration: 0 }
		stageReady.value = false
		activeRegionId.value = 'bottom'
		functionType.value = 'subtitle_removal'
		Object.assign(normCrop, { ...DEFAULT_REMOVAL_REGION })
		touchSnapshot = null
	}

	const onThumbLoad = () => {
		nextTick(() => measureStage())
	}

	const measureStage = () => {
		const query = uni.createSelectorQuery()
		const scope = instance?.proxy ?? instance
		if (scope) query.in(scope)
		query
			.select('#videoStage')
			.boundingClientRect((rect) => {
				if (!rect?.width || !rect?.height) return
				const w = videoMeta.value.width
				const h = videoMeta.value.height
				if (!w || !h) return
				displayRect.value = calcAspectFitRect(rect.width, rect.height, w, h)
				stageReady.value = true
			})
			.exec()
	}

	const selectRegionPreset = (item) => {
		activeRegionId.value = item.id
		Object.assign(normCrop, clampNormCrop({ ...item.region }))
	}

	const onCropTouchStart = (e) => {
		activeRegionId.value = 'custom'
		const touch = e.touches?.[0]
		if (!touch) return
		touchSnapshot = {
			clientX: touch.clientX,
			clientY: touch.clientY,
			cropX: normCrop.x,
			cropY: normCrop.y
		}
	}

	const onCropTouchMove = (e) => {
		if (!touchSnapshot || !displayRect.value.w) return
		const touch = e.touches?.[0]
		if (!touch) return
		const dx = touch.clientX - touchSnapshot.clientX
		const dy = touch.clientY - touchSnapshot.clientY
		normCrop.x = touchSnapshot.cropX + dx / displayRect.value.w
		normCrop.y = touchSnapshot.cropY + dy / displayRect.value.h
		const clamped = clampNormCrop(normCrop)
		normCrop.x = clamped.x
		normCrop.y = clamped.y
	}

	const onCropTouchEnd = () => {
		touchSnapshot = null
	}

	const downloadVideo = (url) =>
		new Promise((resolve, reject) => {
			uni.downloadFile({
				url,
				success: (res) => {
					if (res.statusCode === 200 && res.tempFilePath) {
						resolve(res.tempFilePath)
					} else {
						reject(new Error('下载结果视频失败'))
					}
				},
				fail: reject
			})
		})

	const handleRemove = async () => {
		if (processing.value || !videoPath.value) return
		if (!checkLogin()) return

		processing.value = true
		resultPath.value = ''
		uni.showLoading({ title: '上传视频...', mask: true })

		try {
			const ossUrl = await uploadVideoToOss(videoPath.value)
			uni.showLoading({ title: 'AI 消除中...', mask: true })

			const payload = buildSubtitleRemovalPayload({
				videoUrl: ossUrl,
				normRegion: { ...normCrop },
				videoWidth: videoMeta.value.width,
				videoHeight: videoMeta.value.height,
				duration: videoMeta.value.duration,
				functionType: functionType.value
			})

			const res = await apiSubtitleRemoval(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, '视频消除失败'))
			}

			let resultUrl = resolveAiLogResultUrl(body) || normalizeRemovalVideoUrl(body)

			if (!resultUrl) {
				const aiLogId = extractAiLogId(body)
				if (!aiLogId) {
					throw new Error('未获取到任务 ID')
				}
				uni.showLoading({ title: 'AI 消除中...', mask: true })
				resultUrl = await pollAiLogResult(apiGetAiLog, aiLogId, {
					onProgress: () => {
						uni.showLoading({ title: 'AI 消除中...', mask: true })
					}
				})
			}

			uni.showLoading({ title: '下载结果...', mask: true })
			const localPath = await downloadVideo(resultUrl)
			resultPath.value = localPath
			uni.showToast({ title: '处理完成', icon: 'success' })
		} catch (err) {
			console.error('[handleRemove]', err)
			uni.showToast({
				title: err?.message || '处理失败，请重试',
				icon: 'none'
			})
		} finally {
			processing.value = false
			uni.hideLoading()
		}
	}

	const saveVideo = () => {
		if (saving.value || !resultPath.value) return
		saving.value = true
		uni.saveVideoToPhotosAlbum({
			filePath: resultPath.value,
			success: () => {
				uni.showToast({ title: '已保存到相册', icon: 'success' })
			},
			fail: (err) => {
				console.error('[saveVideo]', err)
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

	const previewResult = () => {
		if (!resultPath.value) return
		uni.previewMedia({
			sources: [{ url: resultPath.value, type: 'video' }]
		})
	}
</script>

<style lang="scss" scoped>
	.remove-page {
		min-height: 100vh;
		padding: 30rpx;
		padding-bottom: 140rpx;
		box-sizing: border-box;
		background: linear-gradient(to bottom, #050d40, #233968);
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

		&.region-params {
			margin-top: 8rpx;
		}
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
		cursor: pointer;

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

	.crop-stage {
		position: relative;
		width: 100%;
		height: 480rpx;
		overflow: hidden;
	}

	.stage-thumb {
		width: 100%;
		height: 100%;
	}

	.crop-box {
		position: absolute;
		box-sizing: border-box;
		border: 2rpx solid #4facfe;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
		z-index: 2;
	}

	.crop-grid {
		position: absolute;
		inset: 0;
		pointer-events: none;

		.grid-line {
			position: absolute;
			background: rgba(255, 255, 255, 0.35);

			&.h1 {
				left: 0;
				right: 0;
				top: 33.33%;
				height: 1rpx;
			}

			&.h2 {
				left: 0;
				right: 0;
				top: 66.66%;
				height: 1rpx;
			}

			&.v1 {
				top: 0;
				bottom: 0;
				left: 33.33%;
				width: 1rpx;
			}

			&.v2 {
				top: 0;
				bottom: 0;
				left: 66.66%;
				width: 1rpx;
			}
		}
	}

	.meta-badge {
		position: absolute;
		right: 20rpx;
		top: 20rpx;
		padding: 8rpx 16rpx;
		border-radius: 20rpx;
		background: rgba(0, 0, 0, 0.55);
		z-index: 3;

		text {
			font-size: 22rpx;
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

	.settings-panel,
	.result-panel {
		border-radius: 20rpx;
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.chip-scroll {
		white-space: nowrap;
		width: 100%;
		margin-bottom: 24rpx;
	}

	.option-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 16rpx 28rpx;
		margin-right: 16rpx;
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.08);
		border: 2rpx solid transparent;

		text {
			font-size: 26rpx;
			color: rgba(255, 255, 255, 0.75);
		}

		&.active {
			background: rgba(79, 172, 254, 0.2);
			border-color: #4facfe;

			text {
				color: #4facfe;
				font-weight: 600;
			}
		}
	}

	.param-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16rpx;
		margin-bottom: 24rpx;
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

	.result-video {
		width: 100%;
		height: 400rpx;
		border-radius: 12rpx;
		margin-bottom: 24rpx;
		background: #000;
	}

	.result-actions {
		display: flex;
		gap: 20rpx;

		.result-btn {
			flex: 1;
			padding: 22rpx 0;
			text-align: center;
			border-radius: 40rpx;
			background: rgba(255, 255, 255, 0.1);
			border: 2rpx solid rgba(255, 255, 255, 0.2);

			text {
				font-size: 28rpx;
				color: #ffffff;
			}

			&.primary {
				background: linear-gradient(to right, #4facfe, #00f2fe);
				border-color: transparent;
			}

			&:active {
				opacity: 0.85;
			}
		}
	}
</style>
