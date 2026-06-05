<template>
	<dark-page-meta />
	<view class="crop-page" :class="themeClass">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @click="chooseImage">
				<text class="iconfont icon-jianqie empty-icon"></text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持相册或拍照</text>
			</view>
			<view v-else-if="viewMode === 'crop'" class="crop-stage" id="cropStage">
				<image
					class="crop-image"
					:src="imagePath"
					mode="aspectFit"
					@load="onImageLoad"
				/>
				<view
					v-if="stageReady"
					class="crop-box"
					:style="cropBoxStyle"
				>
					<view class="crop-grid">
						<view class="grid-line h1"></view>
						<view class="grid-line h2"></view>
						<view class="grid-line v1"></view>
						<view class="grid-line v2"></view>
					</view>
					<view
						class="crop-box-body"
						@touchstart.stop="onCropTouchStart"
						@touchmove.stop.prevent="onCropTouchMove"
						@touchend.stop="onCropTouchEnd"
						@touchcancel.stop="onCropTouchEnd"
					/>
					<template v-if="isFreeCrop">
						<view
							v-for="handle in resizeHandles"
							:key="handle"
							class="resize-handle"
							:class="'resize-handle--' + handle"
							@touchstart.stop="onHandleTouchStart(handle, $event)"
							@touchmove.stop.prevent="onCropTouchMove"
							@touchend.stop="onCropTouchEnd"
							@touchcancel.stop="onCropTouchEnd"
						/>
					</template>
				</view>
			</view>
			<view v-else class="result-stage" @click="previewCropped">
				<image class="result-image" :src="croppedPath" mode="aspectFit" />
				<view class="preview-hint">
					<text>点击预览</text>
				</view>
			</view>
		</view>

		<view class="toolbar">
			<view class="tool-chip" @click="chooseImage">
				<text>{{ imagePath ? '🔄 换一张' : '📁 选择图片' }}</text>
			</view>
			<view v-if="imagePath" class="tool-chip danger" @click="resetAll">
				<text>清空</text>
			</view>
		</view>

		<view v-if="imagePath && viewMode === 'crop'" class="crop-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>裁剪比例</text>
			</view>
			<scroll-view class="ratio-scroll" scroll-x enable-flex>
				<view
					v-for="item in aspectPresets"
					:key="item.id"
					class="ratio-chip"
					:class="{ active: activeAspectId === item.id }"
					@click="selectAspect(item)"
				>
					<text>{{ item.label }}</text>
				</view>
			</scroll-view>
		</view>

		<view
			v-if="imagePath && viewMode === 'crop' && stageReady"
			class="primary-btn"
			:class="{ disabled: cropping }"
			@click="startCrop"
		>
			<processing-text
				:active="cropping"
				text="裁剪中"
				idle-text="开始裁剪"
			/>
		</view>

		<view v-if="imagePath && viewMode === 'preview'" class="result-actions">
			<view class="secondary-btn" @click="restartCrop">
				<text>重新开始</text>
			</view>
			<view
				class="primary-btn"
				:class="{ disabled: saving }"
				@click="saveImage"
			>
				<text>{{ saving ? '保存中...' : '保存到相册' }}</text>
			</view>
		</view>

		<tool-tips-card :tips="tips" />

		<canvas type="2d" id="cropCanvas" class="export-canvas" />
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref, computed, reactive, getCurrentInstance, nextTick } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import {
		CROP_ASPECT_PRESETS,
		calcAspectFitRect,
		clampNormCrop,
		createNormCropForAspect,
		exportCroppedImage,
		applyCropResize
	} from '@/utils/image/imageCrop.js'

	const instance = getCurrentInstance()

	const imagePath = ref('')
	const croppedPath = ref('')
	const viewMode = ref('crop')
	const naturalWidth = ref(0)
	const naturalHeight = ref(0)
	const stageRect = ref({ width: 0, height: 0 })
	const displayRect = ref({ x: 0, y: 0, w: 0, h: 0 })
	const stageReady = ref(false)
	const activeAspectId = ref('free')
	const activeRatio = ref(0)
	const cropping = ref(false)
	const saving = ref(false)

	const normCrop = reactive({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })

	const aspectPresets = CROP_ASPECT_PRESETS
	const resizeHandles = ['tl', 'tr', 'bl', 'br']

	let touchSnapshot = null

	const tips = [
		'选择图片后，拖动方框移动裁剪区域',
		'「自由」模式下可拖动四角调整裁剪框大小',
		'点击「开始裁剪」预览效果，满意后再保存到相册',
		'所有处理均在手机本地完成，保护隐私'
	]

	const isFreeCrop = computed(() => activeRatio.value === 0)

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

	const chooseImage = () => {
		uni.chooseImage({
			count: 1,
			sizeType: ['original'],
			sourceType: ['album', 'camera'],
			success: (res) => {
				const path = res.tempFilePaths?.[0]
				if (!path) return
				resetAll()
				imagePath.value = path
			}
		})
	}

	const resetAll = () => {
		imagePath.value = ''
		croppedPath.value = ''
		viewMode.value = 'crop'
		naturalWidth.value = 0
		naturalHeight.value = 0
		stageReady.value = false
		activeAspectId.value = 'free'
		activeRatio.value = 0
		cropping.value = false
		saving.value = false
		Object.assign(normCrop, createNormCropForAspect(0))
		touchSnapshot = null
	}

	const restartCrop = () => {
		croppedPath.value = ''
		viewMode.value = 'crop'
		cropping.value = false
		touchSnapshot = null
		nextTick(() => measureStage())
	}

	const previewCropped = () => {
		if (!croppedPath.value) return
		uni.previewImage({
			urls: [croppedPath.value],
			current: croppedPath.value
		})
	}

	const startCrop = async () => {
		if (cropping.value || !imagePath.value || !stageReady.value) return

		cropping.value = true
		uni.showLoading({ title: '裁剪中...', mask: true })

		try {
			const tempPath = await exportCroppedImage(
				'#cropCanvas',
				imagePath.value,
				{ ...normCrop },
				instance?.proxy ?? instance
			)
			croppedPath.value = tempPath
			viewMode.value = 'preview'
			stageReady.value = false
		} catch (err) {
			console.error('[startCrop]', err)
			uni.showToast({
				title: err?.message || '裁剪失败，请重试',
				icon: 'none'
			})
		} finally {
			cropping.value = false
			uni.hideLoading()
		}
	}

	const onImageLoad = (e) => {
		const { width, height } = e.detail || {}
		naturalWidth.value = width || 0
		naturalHeight.value = height || 0
		nextTick(() => measureStage())
	}

	const measureStage = () => {
		const query = uni.createSelectorQuery()
		const scope = instance?.proxy ?? instance
		if (scope) query.in(scope)
		query
			.select('#cropStage')
			.boundingClientRect((rect) => {
				if (!rect?.width || !rect?.height) return
				stageRect.value = { width: rect.width, height: rect.height }
				displayRect.value = calcAspectFitRect(
					rect.width,
					rect.height,
					naturalWidth.value,
					naturalHeight.value
				)
				applyAspectCrop(activeRatio.value)
				stageReady.value = true
			})
			.exec()
	}

	const applyAspectCrop = (ratio) => {
		const next = createNormCropForAspect(ratio)
		Object.assign(normCrop, clampNormCrop(next))
	}

	const selectAspect = (item) => {
		activeAspectId.value = item.id
		activeRatio.value = item.ratio
		applyAspectCrop(item.ratio)
	}

	const onCropTouchStart = (e) => {
		const touch = e.touches?.[0]
		if (!touch) return
		touchSnapshot = {
			mode: 'move',
			clientX: touch.clientX,
			clientY: touch.clientY,
			regionX: normCrop.x,
			regionY: normCrop.y,
			regionW: normCrop.w,
			regionH: normCrop.h
		}
	}

	const onHandleTouchStart = (handle, e) => {
		if (!isFreeCrop.value) return
		const touch = e.touches?.[0]
		if (!touch) return
		touchSnapshot = {
			mode: 'resize',
			handle,
			clientX: touch.clientX,
			clientY: touch.clientY,
			regionX: normCrop.x,
			regionY: normCrop.y,
			regionW: normCrop.w,
			regionH: normCrop.h
		}
	}

	const onCropTouchMove = (e) => {
		if (!touchSnapshot || !displayRect.value.w) return
		const touch = e.touches?.[0]
		if (!touch) return

		if (touchSnapshot.mode === 'resize' && !isFreeCrop.value) return

		const dx = (touch.clientX - touchSnapshot.clientX) / displayRect.value.w
		const dy = (touch.clientY - touchSnapshot.clientY) / displayRect.value.h

		if (touchSnapshot.mode === 'move') {
			Object.assign(
				normCrop,
				clampNormCrop({
					x: touchSnapshot.regionX + dx,
					y: touchSnapshot.regionY + dy,
					w: touchSnapshot.regionW,
					h: touchSnapshot.regionH
				})
			)
			return
		}

		Object.assign(normCrop, applyCropResize(touchSnapshot, dx, dy))
	}

	const onCropTouchEnd = () => {
		touchSnapshot = null
	}

	const saveImage = async () => {
		if (saving.value || !croppedPath.value) return

		saving.value = true
		uni.showLoading({ title: '保存中...', mask: true })

		try {
			await new Promise((resolve, reject) => {
				uni.saveImageToPhotosAlbum({
					filePath: croppedPath.value,
					success: resolve,
					fail: reject
				})
			})
			uni.showToast({ title: '已保存到相册', icon: 'success' })
		} catch (err) {
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
		} finally {
			saving.value = false
			uni.hideLoading()
		}
	}
</script>

<style lang="scss" scoped>
	.crop-page {
		min-height: 100vh;
		padding: 30rpx;
		padding-bottom: 140rpx;
		box-sizing: border-box;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
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

	.crop-stage,
	.result-stage {
		position: relative;
		width: 100%;
		height: 480rpx;
		overflow: hidden;
	}

	.result-stage {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.15);

		&:active {
			opacity: 0.92;
		}
	}

	.result-image {
		width: 100%;
		height: 100%;
	}

	.preview-hint {
		position: absolute;
		left: 50%;
		bottom: 24rpx;
		transform: translateX(-50%);
		padding: 10rpx 28rpx;
		border-radius: 24rpx;
		background: rgba(0, 0, 0, 0.45);

		text {
			font-size: 24rpx;
			color: #ffffff;
		}
	}

	.crop-image {
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

	.crop-box-body {
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.resize-handle {
		position: absolute;
		width: 36rpx;
		height: 36rpx;
		background: #4facfe;
		border: 3rpx solid #ffffff;
		border-radius: 50%;
		box-sizing: border-box;
		z-index: 3;

		&--tl {
			left: -18rpx;
			top: -18rpx;
		}

		&--tr {
			right: -18rpx;
			top: -18rpx;
		}

		&--bl {
			left: -18rpx;
			bottom: -18rpx;
		}

		&--br {
			right: -18rpx;
			bottom: -18rpx;
		}
	}

	.crop-grid {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;

		.grid-line {
			position: absolute;
			background: var(--surface-bg-strong);

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

	.crop-panel {
		border-radius: 20rpx;
		padding: 28rpx 0 28rpx 28rpx;
		margin-bottom: 24rpx;
	}

	.ratio-scroll {
		white-space: nowrap;
		width: 100%;
	}

	.ratio-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 16rpx 32rpx;
		margin-right: 16rpx;
		border-radius: 32rpx;
		background: var(--surface-bg);
		border: 2rpx solid transparent;

		text {
			font-size: 26rpx;
			color: var(--text-secondary);
		}

		&.active {
			background: rgba(79, 172, 254, 0.2);
			border-color: #4facfe;

			text {
				color: #4facfe;
				font-weight: 600;
			}
		}

		&:active {
			opacity: 0.85;
		}
	}

	.result-actions {
		display: flex;
		gap: 20rpx;
		margin-bottom: 24rpx;
	}

	.primary-btn,
	.secondary-btn {
		flex: 1;
		padding: 30rpx;
		border-radius: 50rpx;
		text-align: center;

		&.disabled {
			opacity: 0.7;
		}

		text {
			font-size: 32rpx;
			font-weight: bold;
		}

		&:active:not(.disabled) {
			opacity: 0.9;
			transform: scale(0.98);
		}
	}

	.primary-btn {
		background: linear-gradient(to right, #4facfe, #00f2fe);
		margin-bottom: 24rpx;

		text {
			color: var(--text-primary);
		}
	}

	.result-actions .primary-btn {
		margin-bottom: 0;
	}

	.secondary-btn {
		background: var(--surface-bg);
		border: 2rpx solid var(--border-color);

		text {
			color: var(--text-secondary);
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