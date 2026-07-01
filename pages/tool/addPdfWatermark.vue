<template>
	<dark-page-meta />
	<view class="pdf-page" :class="themeClass">
		<view class="file-card boxBg">
			<view v-if="!pdfPath" class="file-empty" @tap="choosePdf">
				<text class="file-icon">📄</text>
				<text class="empty-title">点击选择 PDF</text>
				<text class="empty-desc">支持 PDF 文件，建议小于 10MB</text>
			</view>
			<view v-else class="file-info">
				<text class="file-icon large">📄</text>
				<view class="file-meta">
					<text class="file-name">{{ pdfName }}</text>
					<text class="file-size">{{ formatFileSize(pdfSize) }}</text>
					<text v-if="resultPath" class="file-status">已生成带水印 PDF</text>
				</view>
			</view>
		</view>

		<view class="toolbar">
			<view class="tool-chip" @tap="choosePdf">
				<text>{{ pdfPath ? '🔄 换一个' : '📁 选择 PDF' }}</text>
			</view>
			<view v-if="pdfPath" class="tool-chip danger" @tap="resetAll">
				<text>清空</text>
			</view>
		</view>

		<view v-if="pdfPath" class="param-panel boxBg">
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

			<!-- 图片水印（暂不可用）
			<view class="section-label">
				<view class="label-line"></view>
				<text>图片水印（可选）</text>
			</view>
			<view class="image-watermark-row">
				<view v-if="watermarkImagePath" class="image-preview-wrap">
					<image class="image-preview" :src="watermarkImagePath" mode="aspectFit" />
				</view>
				<view class="image-actions">
					<view class="mini-btn" @tap="chooseWatermarkImage">
						<text>{{ watermarkImagePath ? '更换图片' : '选择图片' }}</text>
					</view>
					<view v-if="watermarkImagePath" class="mini-btn danger" @tap="clearWatermarkImage">
						<text>移除</text>
					</view>
				</view>
			</view>
			-->

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

			<view class="slider-row">
				<text class="slider-label">字号</text>
				<slider
					class="panel-slider"
					:value="fontSize"
					:min="PDF_WATERMARK_FONT_SIZE_MIN"
					:max="PDF_WATERMARK_FONT_SIZE_MAX"
					:step="1"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@changing="onFontSizeChange"
					@change="onFontSizeChange"
				/>
				<text class="slider-value">{{ fontSize }}</text>
			</view>

			<view class="slider-row">
				<text class="slider-label">不透明度</text>
				<slider
					class="panel-slider"
					:value="opacityPercent"
					:min="5"
					:max="100"
					:step="5"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@changing="onOpacityChange"
					@change="onOpacityChange"
				/>
				<text class="slider-value">{{ opacityPercent }}%</text>
			</view>
		</view>

		<view v-if="pdfPath" class="settings-panel boxBg">
			<view
				class="process-btn"
				:class="{ disabled: processing }"
				@tap="onProcessTap"
			>
				<processing-text
					:active="processing"
					text="处理中"
					:idle-text="resultPath ? '重新生成' : '添加水印'"
				/>
			</view>
			<view
				v-if="resultPath"
				class="save-btn"
				@tap="openResultPdf"
			>
				<text>打开 PDF</text>
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
	import { apiAddPdfWatermark } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin, beforeUploadCheck, recordTrialUseAfterSuccess } from '@/utils/user/auth.js'
	import { uploadPdfToOss } from '@/utils/image/ossUpload.js'
	// import { uploadImageToOss } from '@/utils/image/ossUpload.js'
	import {
		PDF_WATERMARK_POSITIONS,
		PDF_WATERMARK_FONT_SIZE_MIN,
		PDF_WATERMARK_FONT_SIZE_MAX,
		DEFAULT_PDF_WATERMARK_OPTIONS,
		clampPdfFontSize,
		buildAddPdfWatermarkPayload,
		resolveAddPdfWatermarkResultUrl
	} from '@/utils/pdf/addPdfWatermark.js'
	import { formatFileSize } from '@/utils/image/imageCompress.js'
	import { showTaskLoading, hideTaskLoading, resolveUserErrorMessage } from '@/utils/debug/useDebugLog.js'

	const pdfPath = ref('')
	const pdfName = ref('')
	const pdfSize = ref(0)
	const resultPath = ref('')
	const processing = ref(false)

	const watermarkText = ref('')
	// const watermarkImagePath = ref('')
	const position = ref(DEFAULT_PDF_WATERMARK_OPTIONS.position)
	const fontSize = ref(DEFAULT_PDF_WATERMARK_OPTIONS.fontSize)
	const opacityPercent = ref(Math.round(DEFAULT_PDF_WATERMARK_OPTIONS.opacity * 100))

	const positionOptions = PDF_WATERMARK_POSITIONS

	const tips = [
		'选择 PDF 文件，输入文字作为水印',
		'可调整位置、字号、不透明度，默认平铺',
		'处理完成后点击「打开 PDF」预览，在PDF预览界面点击右上角按钮支持转发、收藏和保存等操作'
	]

	onLoad((options) => {
		if (options?.title) {
			uni.setNavigationBarTitle({ title: decodeURIComponent(options.title) })
		}
	})

	const choosePdf = async () => {
		if (!(await beforeUploadCheck())) return
		uni.chooseMessageFile({
			count: 1,
			type: 'file',
			extension: ['pdf'],
			success: (res) => {
				const file = res.tempFiles?.[0]
				if (!file?.path) return
				if (file.size && file.size > 10 * 1024 * 1024) {
					uni.showToast({ title: 'PDF 请小于 10MB', icon: 'none' })
					return
				}
				pdfPath.value = file.path
				pdfName.value = file.name || 'document.pdf'
				pdfSize.value = file.size || 0
				resultPath.value = ''
			},
			fail: (err) => {
				if (/cancel|取消/.test(err?.errMsg || '')) return
				uni.showToast({ title: '选择 PDF 失败', icon: 'none' })
			}
		})
	}

	/*
	const chooseWatermarkImage = async () => {
		if (!(await beforeUploadCheck())) return
		uni.chooseImage({
			count: 1,
			sizeType: ['compressed', 'original'],
			sourceType: ['album', 'camera'],
			success: (res) => {
				const path = res.tempFilePaths?.[0]
				if (!path) return
				const size = res.tempFiles?.[0]?.size
				if (size && size > 2 * 1024 * 1024) {
					uni.showToast({ title: '水印图片请小于 2MB', icon: 'none' })
					return
				}
				watermarkImagePath.value = path
				resultPath.value = ''
			}
		})
	}

	const clearWatermarkImage = () => {
		watermarkImagePath.value = ''
		resultPath.value = ''
	}
	*/

	const resetAll = () => {
		pdfPath.value = ''
		pdfName.value = ''
		pdfSize.value = 0
		resultPath.value = ''
		watermarkText.value = ''
		// watermarkImagePath.value = ''
		position.value = DEFAULT_PDF_WATERMARK_OPTIONS.position
		fontSize.value = DEFAULT_PDF_WATERMARK_OPTIONS.fontSize
		opacityPercent.value = Math.round(DEFAULT_PDF_WATERMARK_OPTIONS.opacity * 100)
	}

	const onFontSizeChange = (e) => {
		fontSize.value = clampPdfFontSize(e.detail.value)
	}

	const onOpacityChange = (e) => {
		opacityPercent.value = Math.round(Number(e.detail.value) || 50)
	}

	const downloadPdf = (url) =>
		new Promise((resolve, reject) => {
			uni.downloadFile({
				url,
				success: (res) => {
					if (res.statusCode === 200 && res.tempFilePath) {
						resolve(res.tempFilePath)
					} else {
						reject(new Error('下载 PDF 失败'))
					}
				},
				fail: reject
			})
		})

	const onProcessTap = () => {
		if (processing.value) return
		if (resultPath.value) {
			resultPath.value = ''
		}
		handleAddPdfWatermark()
	}

	const handleAddPdfWatermark = async () => {
		if (processing.value || !pdfPath.value) return
		if (!checkLogin()) return

		const text = watermarkText.value.trim()
		if (!text) {
			uni.showToast({ title: '请输入水印文字', icon: 'none' })
			return
		}

		processing.value = true
		showTaskLoading({ title: '上传 PDF...', mask: true })

		try {
			const pdfUrl = await uploadPdfToOss(pdfPath.value)

			// let watermarkImageUrl = ''
			// if (watermarkImagePath.value) {
			// 	showTaskLoading({ title: '上传水印图...', mask: true })
			// 	watermarkImageUrl = await uploadImageToOss(watermarkImagePath.value)
			// }

			showTaskLoading({ title: '添加水印...', mask: true })
			const payload = buildAddPdfWatermarkPayload(pdfUrl, {
				text,
				// watermarkImageUrl,
				position: position.value,
				fontSize: fontSize.value,
				opacity: opacityPercent.value / 100,
				scale: DEFAULT_PDF_WATERMARK_OPTIONS.scale
			})

			const res = await apiAddPdfWatermark(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, 'PDF 加水印失败'))
			}

			const resultUrl = resolveAddPdfWatermarkResultUrl(body)
			if (!resultUrl) {
				throw new Error('未获取到 PDF 结果')
			}

			showTaskLoading({ title: '下载 PDF...', mask: true })
			resultPath.value = await downloadPdf(resultUrl)
			recordTrialUseAfterSuccess()
			uni.showToast({ title: '处理完成', icon: 'success' })
		} catch (err) {
			console.error('[handleAddPdfWatermark]', err)
			const msg = resolveUserErrorMessage(err, 'PDF 加水印失败，请重试')
			if (msg) {
				uni.showToast({ title: msg, icon: 'none' })
			}
		} finally {
			processing.value = false
			hideTaskLoading()
		}
	}

	const openResultPdf = () => {
		if (!resultPath.value) return
		uni.openDocument({
			filePath: resultPath.value,
			fileType: 'pdf',
			showMenu: true,
			fail: () => {
				uni.showToast({ title: '无法打开 PDF', icon: 'none' })
			}
		})
	}
</script>

<style lang="scss" scoped>
	.pdf-page {
		min-height: 100vh;
		padding: 30rpx;
		padding-bottom: 140rpx;
		box-sizing: border-box;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
	}

	.file-card {
		border-radius: 20rpx;
		padding: 40rpx 32rpx;
		margin-bottom: 24rpx;
		min-height: 200rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.file-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;

		&:active {
			opacity: 0.85;
		}

		.file-icon {
			font-size: 88rpx;
			margin-bottom: 20rpx;
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

	.file-info {
		display: flex;
		align-items: center;
		gap: 24rpx;
		width: 100%;

		.file-icon.large {
			font-size: 72rpx;
			flex-shrink: 0;
		}

		.file-meta {
			flex: 1;
			min-width: 0;
			display: flex;
			flex-direction: column;
			gap: 8rpx;

			.file-name {
				font-size: 30rpx;
				font-weight: 600;
				color: var(--text-primary);
				word-break: break-all;
			}

			.file-size,
			.file-status {
				font-size: 24rpx;
				color: var(--text-muted);
			}

			.file-status {
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

	.image-watermark-row {
		/* 图片水印暂不可用
		display: flex;
		align-items: center;
		gap: 20rpx;
		margin-bottom: 24rpx;

		.image-preview-wrap {
			width: 120rpx;
			height: 120rpx;
			border-radius: 12rpx;
			overflow: hidden;
			background: var(--surface-bg);

			.image-preview {
				width: 100%;
				height: 100%;
			}
		}

		.image-actions {
			display: flex;
			flex-direction: column;
			gap: 12rpx;
		}

		.mini-btn {
			padding: 14rpx 28rpx;
			border-radius: 30rpx;
			background: rgba(79, 172, 254, 0.15);
			border: 2rpx solid rgba(79, 172, 254, 0.35);

			text {
				font-size: 24rpx;
				color: #4facfe;
			}

			&.danger text {
				color: #ff8a8a;
			}
		}
		*/
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

		text {
			font-size: 30rpx;
			color: #4facfe;
			font-weight: 600;
		}

		&:active {
			opacity: 0.85;
		}
	}
</style>
