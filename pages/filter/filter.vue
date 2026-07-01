<template>
	<dark-page-meta />
	<view class="filter-page" :class="themeClass">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @click="chooseImage">
				<text class="empty-icon">📷</text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持相册或拍照</text>
			</view>
			<view v-else class="preview-wrap">
				<image
					class="preview-image"
					:src="imagePath"
					mode="aspectFit"
					:style="previewStyle"
				/>
				<view class="preview-badge">
					<text>{{ activeFilter.name }}</text>
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

		<view v-if="imagePath" class="filter-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>滤镜效果</text>
			</view>
			<scroll-view class="filter-scroll" scroll-x enable-flex>
				<view
					v-for="item in filterPresets"
					:key="item.id"
					class="filter-item"
					:class="{ active: activeFilterId === item.id }"
					@click="selectFilter(item.id)"
				>
					<view class="filter-thumb-wrap">
						<image
							class="filter-thumb"
							:src="imagePath"
							mode="aspectFill"
							:style="{ filter: buildFilterCss(item, 100) }"
						/>
					</view>
					<text class="filter-name">{{ item.name }}</text>
				</view>
			</scroll-view>

			<view v-if="activeFilterId !== 'original'" class="intensity-row">
				<text class="intensity-label">强度</text>
				<slider
					class="intensity-slider"
					:value="intensity"
					:min="0"
					:max="100"
					:step="1"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@changing="onIntensityChanging"
					@change="onIntensityChange"
				/>
				<text class="intensity-value">{{ intensity }}%</text>
			</view>
		</view>

		<view
			v-if="imagePath"
			class="save-btn"
			:class="{ disabled: saving }"
			@click="saveImage"
		>
			<text>{{ saving ? '保存中...' : '保存到相册' }}</text>
		</view>

		<tool-tips-card :tips="tips" />

		<canvas
			type="2d"
			id="exportCanvas"
			class="export-canvas"
		/>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref, computed, getCurrentInstance } from 'vue'
	import {
		FILTER_PRESETS,
		FILTER_DEFAULT_INTENSITY,
		getFilterById,
		buildFilterCss,
		buildFilterEffects,
		isIdentityFilterEffects
	} from '@/utils/image/filters.js'
	import { exportImageWithFilter } from '@/utils/image/canvasFilter.js'
	import { beforeUploadCheck, recordTrialUseAfterSuccess } from '@/utils/user/auth.js'

	const instance = getCurrentInstance()

	const imagePath = ref('')
	const activeFilterId = ref('original')
	const intensity = ref(FILTER_DEFAULT_INTENSITY)
	const saving = ref(false)

	const filterPresets = FILTER_PRESETS

	const activeFilter = computed(() => getFilterById(activeFilterId.value))

	const previewStyle = computed(() => ({
		filter: buildFilterCss(activeFilter.value, intensity.value)
	}))

	const tips = [
		'选择一张照片，左右滑动挑选滤镜',
		'拖动「强度」：0% 接近原图，100% 为完整滤镜，全程可感知变化',
		'满意后点击「保存到相册」',
		'所有处理均在手机本地完成，保护隐私'
	]

	const chooseImage = async () => {
		if (!(await beforeUploadCheck())) return
		uni.chooseImage({
			count: 1,
			sizeType: ['compressed', 'original'],
			sourceType: ['album', 'camera'],
			success: (res) => {
				const path = res.tempFilePaths?.[0]
				if (path) {
					imagePath.value = path
					activeFilterId.value = 'original'
					intensity.value = FILTER_DEFAULT_INTENSITY
				}
			}
		})
	}

	const resetAll = () => {
		imagePath.value = ''
		activeFilterId.value = 'original'
		intensity.value = FILTER_DEFAULT_INTENSITY
	}

	const selectFilter = (id) => {
		activeFilterId.value = id
		if (id !== 'original') {
			intensity.value = FILTER_DEFAULT_INTENSITY
		}
	}

	const onIntensityChanging = (e) => {
		intensity.value = e.detail.value
	}

	const onIntensityChange = (e) => {
		intensity.value = e.detail.value
	}

	const saveImage = async () => {
		if (saving.value || !imagePath.value) return

		saving.value = true

		try {
			const filterEffects = buildFilterEffects(activeFilter.value, intensity.value)
			const tempPath = isIdentityFilterEffects(filterEffects)
				? imagePath.value
				: await exportImageWithFilter(
						'#exportCanvas',
						imagePath.value,
						filterEffects,
						instance?.proxy ?? instance
					)

			await new Promise((resolve, reject) => {
				uni.saveImageToPhotosAlbum({
					filePath: tempPath,
					success: resolve,
					fail: reject
				})
			})
			uni.showToast({ title: '已保存到相册', icon: 'success' })
			recordTrialUseAfterSuccess()
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
				uni.showToast({
					title: err?.message || '保存失败，请重试',
					icon: 'none'
				})
			}
		} finally {
			saving.value = false
		}
	}
</script>

<style lang="scss" scoped>
	.filter-page {
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

		.preview-badge {
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

	.filter-panel {
		border-radius: 20rpx;
		padding: 28rpx 0 28rpx 28rpx;
		margin-bottom: 24rpx;
	}

	.filter-scroll {
		white-space: nowrap;
		width: 100%;
		margin-bottom: 28rpx;
	}

	.filter-item {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		width: 140rpx;
		margin-right: 20rpx;
		vertical-align: top;

		&.active .filter-thumb-wrap {
			border-color: #4facfe;
			box-shadow: 0 0 16rpx rgba(79, 172, 254, 0.5);
		}

		&.active .filter-name {
			color: #4facfe;
		}
	}

	.filter-thumb-wrap {
		width: 120rpx;
		height: 120rpx;
		border-radius: 16rpx;
		overflow: hidden;
		border: 4rpx solid transparent;
		margin-bottom: 12rpx;
	}

	.filter-thumb {
		width: 100%;
		height: 100%;
	}

	.filter-name {
		font-size: 24rpx;
		color: var(--text-secondary);
		text-align: center;
	}

	.intensity-row {
		display: flex;
		align-items: center;
		padding-right: 28rpx;
		gap: 16rpx;

		.intensity-label {
			font-size: 26rpx;
			color: var(--text-secondary);
			flex-shrink: 0;
		}

		.intensity-slider {
			flex: 1;
		}

		.intensity-value {
			font-size: 24rpx;
			color: #4facfe;
			width: 72rpx;
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
			color: var(--text-primary);
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