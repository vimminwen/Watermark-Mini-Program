<template>
	<dark-page-meta />
	<view class="crop-page">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @click="chooseImage">
				<text class="empty-icon">📷</text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持相册或拍照</text>
			</view>
			<view v-else class="crop-stage" id="cropStage">
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

		<view v-if="imagePath" class="crop-panel boxBg">
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
			v-if="imagePath && stageReady"
			class="save-btn"
			:class="{ disabled: saving }"
			@click="saveImage"
		>
			<text>{{ saving ? '保存中...' : '保存到相册' }}</text>
		</view>

		<tool-tips-card :tips="tips" />

		<canvas type="2d" id="cropCanvas" class="export-canvas" />
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed, reactive, getCurrentInstance, nextTick } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import {
		CROP_ASPECT_PRESETS,
		calcAspectFitRect,
		clampNormCrop,
		createNormCropForAspect,
		exportCroppedImage
	} from '@/utils/image/imageCrop.js'

	const instance = getCurrentInstance()

	const imagePath = ref('')
	const naturalWidth = ref(0)
	const naturalHeight = ref(0)
	const stageRect = ref({ width: 0, height: 0 })
	const displayRect = ref({ x: 0, y: 0, w: 0, h: 0 })
	const stageReady = ref(false)
	const activeAspectId = ref('free')
	const activeRatio = ref(0)
	const saving = ref(false)

	const normCrop = reactive({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })

	const aspectPresets = CROP_ASPECT_PRESETS

	let touchSnapshot = null

	const tips = [
		'选择图片后，拖动方框调整裁剪区域',
		'点击比例可切换 1:1、4:3、16:9 等常用尺寸',
		'「自由」模式下可任意比例拖动位置',
		'所有处理均在手机本地完成，保护隐私'
	]

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
		naturalWidth.value = 0
		naturalHeight.value = 0
		stageReady.value = false
		activeAspectId.value = 'free'
		activeRatio.value = 0
		Object.assign(normCrop, createNormCropForAspect(0))
		touchSnapshot = null
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

	const saveImage = async () => {
		if (saving.value || !imagePath.value) return

		saving.value = true
		uni.showLoading({ title: '裁剪中...', mask: true })

		try {
			const tempPath = await exportCroppedImage(
				'#cropCanvas',
				imagePath.value,
				{ ...normCrop },
				instance?.proxy ?? instance
			)

			uni.saveImageToPhotosAlbum({
				filePath: tempPath,
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
				}
			})
		} catch (err) {
			console.error('[saveImage]', err)
			uni.showToast({
				title: err?.message || '裁剪失败，请重试',
				icon: 'none'
			})
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

		&:active {
			opacity: 0.85;
		}
	}

	.save-btn {
		background: linear-gradient(to right, #4facfe, #00f2fe);
		padding: 30rpx;
		border-radius: 50rpx;
		text-align: center;
		margin-bottom: 24rpx;

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
