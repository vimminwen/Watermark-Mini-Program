<template>
	<dark-page-meta />
	<view class="compress-page">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @click="chooseImage">
				<text class="empty-icon">📷</text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持相册或拍照</text>
			</view>
			<view v-else class="preview-wrap">
				<image
					class="preview-image"
					:src="previewPath"
					mode="aspectFit"
				/>
				<view class="preview-badge">
					<text v-if="compressing">压缩中...</text>
					<text v-else-if="compressedSize > 0">
						{{ formatFileSize(originalSize) }} → {{ formatFileSize(compressedSize) }}
						<text v-if="savedPercent > 0" class="save-rate">（省 {{ savedPercent }}%）</text>
					</text>
					<text v-else>{{ formatFileSize(originalSize) }}</text>
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

		<view v-if="imagePath" class="compress-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>压缩设置</text>
			</view>

			<view class="intensity-row">
				<text class="intensity-label">质量</text>
				<slider
					class="intensity-slider"
					:value="quality"
					:min="10"
					:max="100"
					:step="1"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					:disabled="compressing"
					@changing="onQualityChanging"
					@change="onQualityChange"
				/>
				<text class="intensity-value">{{ quality }}%</text>
			</view>

			<view class="intensity-row">
				<text class="intensity-label">最长边</text>
				<slider
					class="intensity-slider"
					:value="maxSide"
					:min="640"
					:max="2560"
					:step="64"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					:disabled="compressing"
					@changing="onMaxSideChanging"
					@change="onMaxSideChange"
				/>
				<text class="intensity-value">{{ maxSide }}px</text>
			</view>
		</view>

		<view
			v-if="imagePath && compressedPath"
			class="save-btn"
			:class="{ disabled: saving }"
			@click="saveImage"
		>
			<text>{{ saving ? '保存中...' : '保存到相册' }}</text>
		</view>

		<tool-tips-card :tips="tips" />

		<canvas type="2d" id="compressCanvas" class="export-canvas" />
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed, getCurrentInstance } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import {
		compressImageToTempFile,
		formatFileSize,
		getFileSize
	} from '@/utils/image/imageCompress.js'

	const instance = getCurrentInstance()

	const imagePath = ref('')
	const compressedPath = ref('')
	const originalSize = ref(0)
	const compressedSize = ref(0)
	const quality = ref(70)
	const maxSide = ref(1920)
	const compressing = ref(false)
	const saving = ref(false)

	let compressTimer = null

	const previewPath = computed(() => compressedPath.value || imagePath.value)

	const savedPercent = computed(() => {
		if (!originalSize.value || !compressedSize.value) return 0
		if (compressedSize.value >= originalSize.value) return 0
		return Math.round((1 - compressedSize.value / originalSize.value) * 100)
	})

	const tips = [
		'选择一张照片，调节「质量」与「最长边」',
		'预览区会显示压缩前后体积对比',
		'满意后点击「保存到相册」',
		'所有处理均在手机本地完成，保护隐私'
	]

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
			success: async (res) => {
				const path = res.tempFilePaths?.[0]
				if (!path) return
				resetState()
				imagePath.value = path
				originalSize.value = await getFileSize(path)
				scheduleCompress()
			}
		})
	}

	const resetState = () => {
		imagePath.value = ''
		compressedPath.value = ''
		originalSize.value = 0
		compressedSize.value = 0
		quality.value = 70
		maxSide.value = 1920
	}

	const resetAll = () => {
		if (compressTimer) {
			clearTimeout(compressTimer)
			compressTimer = null
		}
		resetState()
	}

	const scheduleCompress = () => {
		if (compressTimer) clearTimeout(compressTimer)
		compressTimer = setTimeout(() => {
			compressTimer = null
			runCompress()
		}, 280)
	}

	const runCompress = async () => {
		if (!imagePath.value || compressing.value) return

		compressing.value = true
		try {
			const tempPath = await compressImageToTempFile(
				'#compressCanvas',
				imagePath.value,
				{
					quality: quality.value / 100,
					maxSide: maxSide.value
				},
				instance?.proxy ?? instance
			)
			compressedPath.value = tempPath
			compressedSize.value = await getFileSize(tempPath)
		} catch (err) {
			console.error('[runCompress]', err)
			compressedPath.value = ''
			compressedSize.value = 0
			uni.showToast({
				title: err?.message || '压缩失败，请重试',
				icon: 'none'
			})
		} finally {
			compressing.value = false
		}
	}

	const onQualityChanging = (e) => {
		quality.value = e.detail.value
		scheduleCompress()
	}

	const onQualityChange = (e) => {
		quality.value = e.detail.value
		scheduleCompress()
	}

	const onMaxSideChanging = (e) => {
		maxSide.value = e.detail.value
		scheduleCompress()
	}

	const onMaxSideChange = (e) => {
		maxSide.value = e.detail.value
		scheduleCompress()
	}

	const saveImage = async () => {
		const filePath = compressedPath.value
		if (saving.value || !filePath) return

		saving.value = true
		uni.saveImageToPhotosAlbum({
			filePath,
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
	.compress-page {
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

		.preview-badge {
			position: absolute;
			left: 20rpx;
			right: 20rpx;
			bottom: 20rpx;
			padding: 10rpx 20rpx;
			border-radius: 24rpx;
			background: rgba(0, 0, 0, 0.55);
			text-align: center;

			text {
				font-size: 24rpx;
				color: #4facfe;
			}

			.save-rate {
				color: #00f2fe;
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

	.compress-panel {
		border-radius: 20rpx;
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.intensity-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 28rpx;

		&:last-child {
			margin-bottom: 0;
		}

		.intensity-label {
			font-size: 26rpx;
			color: rgba(255, 255, 255, 0.7);
			flex-shrink: 0;
			width: 100rpx;
		}

		.intensity-slider {
			flex: 1;
		}

		.intensity-value {
			font-size: 24rpx;
			color: #4facfe;
			width: 96rpx;
			text-align: right;
			flex-shrink: 0;
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
