<template>
	<dark-page-meta />
	<view class="watermark-page" :class="themeClass">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @tap="chooseImage">
				<text class="iconfont icon-tupianbianji empty-icon"></text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持 JPG / PNG，建议小于 5MB</text>
			</view>
			<view v-else class="preview-wrap" @tap="onPreviewTap">
				<image
					class="preview-image"
					:src="displayImage"
					mode="aspectFit"
					@load="measurePreview"
				/>
				<text
					v-if="showLivePreview"
					class="watermark-preview-text"
					:style="watermarkPreviewStyle"
				>{{ watermarkText.trim() }}</text>
				<view v-if="resultPath || originSize.width" class="size-badge">
					<text v-if="resultPath">加水印完成 · 点击预览</text>
					<text v-else-if="showLivePreview">实时预览 · 满意后点击添加水印</text>
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

		<view v-if="imagePath" class="param-panel boxBg">
			<view class="section-label">
				<view class="label-line"></view>
				<text>水印文字</text>
			</view>
			<input
				class="text-input"
				v-model="watermarkText"
				maxlength="30"
				placeholder="请输入水印文字"
				placeholder-class="input-placeholder"
			/>

			<view class="section-label">
				<view class="label-line"></view>
				<text>位置</text>
			</view>
			<view class="position-row">
				<view
					v-for="item in positionOptions"
					:key="item.value"
					class="position-chip"
					:class="{ active: position === item.value }"
					@tap="position = item.value"
				>
					<text>{{ item.label }}</text>
				</view>
			</view>

			<view class="section-label">
				<view class="label-line"></view>
				<text>颜色</text>
			</view>
			<view class="color-row">
				<view
					v-for="color in colorOptions"
					:key="color"
					class="color-dot"
					:class="{ active: textColor === color }"
					:style="{ background: color }"
					@tap="textColor = color"
				/>
			</view>

			<view class="slider-row">
				<text class="slider-label">不透明度</text>
				<slider
					class="panel-slider"
					:value="opacity"
					:min="10"
					:max="100"
					:step="1"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@changing="onOpacityChange"
					@change="onOpacityChange"
				/>
				<text class="slider-value">{{ opacity }}%</text>
			</view>

			<view class="slider-row">
				<text class="slider-label">字号</text>
				<slider
					class="panel-slider"
					:value="fontSize"
					:min="WATERMARK_FONT_SIZE_MIN"
					:max="WATERMARK_FONT_SIZE_MAX"
					:step="2"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@changing="onFontSizeChange"
					@change="onFontSizeChange"
				/>
				<text class="slider-value">{{ fontSize }}</text>
			</view>

			<view class="slider-row">
				<text class="slider-label">水平偏移</text>
				<slider
					class="panel-slider"
					:value="offsetX"
					:min="0"
					:max="200"
					:step="2"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@changing="onOffsetXChange"
					@change="onOffsetXChange"
				/>
				<text class="slider-value">{{ offsetX }}</text>
			</view>

			<view class="slider-row">
				<text class="slider-label">垂直偏移</text>
				<slider
					class="panel-slider"
					:value="offsetY"
					:min="0"
					:max="200"
					:step="2"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@changing="onOffsetYChange"
					@change="onOffsetYChange"
				/>
				<text class="slider-value">{{ offsetY }}</text>
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
					text="处理中"
					:idle-text="resultPath ? '重新添加' : '添加水印'"
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
	<canvas type="2d" id="watermarkExportCanvas" class="export-canvas" />
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref, computed, watch, getCurrentInstance, nextTick } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { checkLogin, beforeUploadCheck, recordTrialUseAfterSuccess } from '@/utils/user/auth.js'
	import {
		WATERMARK_POSITIONS,
		WATERMARK_COLORS,
		WATERMARK_FONT_SIZE_MIN,
		WATERMARK_FONT_SIZE_MAX,
		DEFAULT_WATERMARK_OPTIONS,
		buildWatermarkPreviewStyle,
		exportImageWithWatermark,
		validateWatermarkImageFile
	} from '@/utils/image/addWatermark.js'
	import { showTaskLoading, hideTaskLoading, resolveUserErrorMessage } from '@/utils/debug/useDebugLog.js'

	const instance = getCurrentInstance()

	const imagePath = ref('')
	const imageFormat = ref('jpg')
	const resultPath = ref('')
	const processing = ref(false)
	const saving = ref(false)
	const originSize = ref({ width: 0, height: 0 })

	const watermarkText = ref('')
	const position = ref(DEFAULT_WATERMARK_OPTIONS.position)
	const opacity = ref(DEFAULT_WATERMARK_OPTIONS.opacity)
	const fontSize = ref(DEFAULT_WATERMARK_OPTIONS.fontSize)
	const textColor = ref(DEFAULT_WATERMARK_OPTIONS.color)
	const offsetX = ref(DEFAULT_WATERMARK_OPTIONS.offsetX)
	const offsetY = ref(DEFAULT_WATERMARK_OPTIONS.offsetY)
	const previewStage = ref({ width: 0, height: 0 })

	const positionOptions = WATERMARK_POSITIONS
	const colorOptions = WATERMARK_COLORS

	const displayImage = computed(() => resultPath.value || imagePath.value)

	const showLivePreview = computed(
		() => !!imagePath.value && !resultPath.value && !!watermarkText.value.trim()
	)

	const watermarkPreviewStyle = computed(() =>
		buildWatermarkPreviewStyle({
			containerWidth: previewStage.value.width,
			containerHeight: previewStage.value.height,
			imageWidth: originSize.value.width,
			imageHeight: originSize.value.height,
			position: position.value,
			fontSize: fontSize.value,
			opacity: opacity.value,
			color: textColor.value,
			offsetX: offsetX.value,
			offsetY: offsetY.value
		})
	)

	const measurePreview = () => {
		nextTick(() => {
			const query = uni.createSelectorQuery().in(instance?.proxy)
			query
				.select('.preview-wrap')
				.boundingClientRect((rect) => {
					if (rect?.width && rect?.height) {
						previewStage.value = {
							width: rect.width,
							height: rect.height
						}
					}
				})
				.exec()
		})
	}

	watch(imagePath, (path) => {
		if (path) measurePreview()
	})

	watch(originSize, () => {
		if (imagePath.value) measurePreview()
	}, { deep: true })

	const tips = [
		'仅支持 JPG / PNG 格式图片',
		'选择图片并输入水印文字，参数调整时可实时预览',
		'满意后点击「添加水印」在本地生成与预览一致的结果',
		'生成后可保存到相册'
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
			success: async (res) => {
				const path = res.tempFilePaths?.[0]
				if (!path) return
				const file = res.tempFiles?.[0]
				const size = file?.size
				if (size && size > 5 * 1024 * 1024) {
					uni.showToast({ title: '图片请小于 5MB', icon: 'none' })
					return
				}
				try {
					imageFormat.value = await validateWatermarkImageFile(path, file)
				} catch (err) {
					uni.showToast({ title: err?.message || '仅支持 JPG / PNG', icon: 'none' })
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
		imageFormat.value = 'jpg'
		resultPath.value = ''
		originSize.value = { width: 0, height: 0 }
		watermarkText.value = ''
		position.value = DEFAULT_WATERMARK_OPTIONS.position
		opacity.value = DEFAULT_WATERMARK_OPTIONS.opacity
		fontSize.value = DEFAULT_WATERMARK_OPTIONS.fontSize
		textColor.value = DEFAULT_WATERMARK_OPTIONS.color
		offsetX.value = DEFAULT_WATERMARK_OPTIONS.offsetX
		offsetY.value = DEFAULT_WATERMARK_OPTIONS.offsetY
	}

	const onOpacityChange = (e) => {
		opacity.value = Math.round(Number(e.detail.value) || DEFAULT_WATERMARK_OPTIONS.opacity)
	}

	const onFontSizeChange = (e) => {
		fontSize.value = Math.round(Number(e.detail.value) || DEFAULT_WATERMARK_OPTIONS.fontSize)
	}

	const onOffsetXChange = (e) => {
		offsetX.value = Math.round(Number(e.detail.value) || 0)
	}

	const onOffsetYChange = (e) => {
		offsetY.value = Math.round(Number(e.detail.value) || 0)
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
			resultPath.value = ''
		}
		handleAddWatermark()
	}

	const handleAddWatermark = async () => {
		if (processing.value || !imagePath.value) return
		if (!checkLogin()) return

		const text = watermarkText.value.trim()
		if (!text) {
			uni.showToast({ title: '请输入水印文字', icon: 'none' })
			return
		}

		processing.value = true
		showTaskLoading({ title: '生成水印...', mask: true })

		try {
			resultPath.value = await exportImageWithWatermark(
				'#watermarkExportCanvas',
				imagePath.value,
				{
					text,
					position: position.value,
					opacity: opacity.value,
					fontSize: fontSize.value,
					color: textColor.value,
					offsetX: offsetX.value,
					offsetY: offsetY.value,
					outputFormat: imageFormat.value
				},
				instance?.proxy
			)
			recordTrialUseAfterSuccess()
			uni.showToast({ title: '加水印完成', icon: 'success' })
		} catch (err) {
			console.error('[handleAddWatermark]', err)
			const msg = resolveUserErrorMessage(err, '添加水印失败，请重试')
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
		min-height: 420rpx;
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
		height: 420rpx;

		.preview-image {
			width: 100%;
			height: 100%;
		}

		.watermark-preview-text {
			font-weight: 600;
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

	.param-panel,
	.settings-panel {
		border-radius: 20rpx;
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.section-label {
		display: flex;
		align-items: center;
		margin-bottom: 16rpx;

		.label-line {
			width: 8rpx;
			height: 32rpx;
			background: linear-gradient(to bottom, #4facfe, #00f2fe);
			border-radius: 4rpx;
			margin-right: 14rpx;
		}

		text {
			font-size: 28rpx;
			font-weight: 600;
			color: var(--text-primary);
		}
	}

	.text-input {
		display: block;
		width: 100%;
		height: 88rpx;
		min-height: 88rpx;
		line-height: 88rpx;
		padding: 0 24rpx;
		margin-bottom: 24rpx;
		box-sizing: border-box;
		border-radius: 16rpx;
		background: var(--surface-bg);
		font-size: 28rpx;
		color: var(--text-primary);
	}

	.input-placeholder {
		color: var(--text-muted);
		line-height: 88rpx;
	}

	.position-row {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
		margin-bottom: 24rpx;

		.position-chip {
			padding: 14rpx 24rpx;
			border-radius: 30rpx;
			background: var(--surface-bg);
			border: 2rpx solid transparent;

			text {
				font-size: 24rpx;
				color: var(--text-secondary);
			}

			&.active {
				background: rgba(79, 172, 254, 0.2);
				border-color: #4facfe;

				text {
					color: #4facfe;
				}
			}
		}
	}

	.color-row {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
		margin-bottom: 24rpx;

		.color-dot {
			width: 48rpx;
			height: 48rpx;
			border-radius: 50%;
			border: 3rpx solid transparent;
			box-sizing: border-box;

			&.active {
				border-color: #4facfe;
				box-shadow: 0 0 12rpx rgba(79, 172, 254, 0.6);
			}
		}
	}

	.slider-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-bottom: 16rpx;

		.slider-label {
			width: 120rpx;
			font-size: 24rpx;
			color: var(--text-secondary);
			flex-shrink: 0;
		}

		.panel-slider {
			flex: 1;
		}

		.slider-value {
			width: 72rpx;
			text-align: right;
			font-size: 24rpx;
			color: #4facfe;
			flex-shrink: 0;
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
