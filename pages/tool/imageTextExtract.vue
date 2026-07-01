<template>
	<dark-page-meta />
	<view class="ocr-page" :class="themeClass">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @click="chooseImage">
				<text class="iconfont icon-zhuanwenzi_fill empty-icon"></text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持相册或拍照</text>
			</view>
			<view v-else class="preview-wrap" @click="previewImage">
				<image class="preview-image" :src="imagePath" mode="aspectFit" />
				<view v-if="originSize.width" class="size-badge">
					<text>{{ originSize.width }} × {{ originSize.height }}</text>
				</view>
			</view>
		</view>

		<view class="toolbar">
			<view class="tool-chip" @click="chooseImage">
				<text>{{ imagePath ? '🔄 换一张' : '📁 选择图片' }}</text>
			</view>
			<view v-if="imagePath && !showResultPanel" class="tool-chip danger" @click="resetAll">
				<text>清空图片</text>
			</view>
		</view>

		<view v-if="imagePath" class="action-panel boxBg">
			<view
				class="process-btn"
				:class="{ disabled: processing }"
				@click="handleExtract"
			>
				<processing-text
					:active="processing"
					text="识别中"
					:idle-text="resultText ? '重新识别' : '开始提取文字'"
				/>
			</view>
		</view>

		<view v-if="showResultPanel" class="result-panel boxBg">
			<view class="result-header">
				<view class="section-label">
					<view class="label-line line-pink"></view>
					<text>识别结果</text>
				</view>
				<text class="edit-hint">点击可编辑</text>
				<text class="char-count">{{ resultText.length }} 字</text>
			</view>
			<textarea
				:key="resultEditorKey"
				class="result-editor"
				:value="resultText"
				:focus="editorFocus"
				auto-height
				:maxlength="50000"
				:show-confirm-bar="false"
				:adjust-position="true"
				placeholder="识别结果将显示在这里"
				placeholder-class="result-editor-placeholder"
				@input="onResultInput"
				@focus="editorFocus = true"
				@blur="editorFocus = false"
				@tap="focusEditor"
			/>
			<view class="result-actions">
				<view class="action-chip primary" @click="copyText">
					<text>复制全文</text>
				</view>
				<view class="action-chip" @click="clearResult">
					<text>清空内容</text>
				</view>
			</view>
		</view>

		<tool-tips-card :tips="tips" />
		<!-- 上传日志（调试时取消注释）
		<debug-log-panel
			:logs="debugLogs"
			:scroll-top="debugScrollTop"
			@clear="clearDebugLogs"
		/>
		-->
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { apiImageTextExtraction, apiGetAiLog } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin, recordTrialUseAfterSuccess } from '@/utils/user/auth.js'
	import { uploadImageToOss } from '@/utils/image/ossUpload.js'
	import { pickLocalImage, handlePickLocalImageError } from '@/utils/image/pickLocalImage.js'
	import { pollAiLogResult, resolveAiLogText, normalizeAiText } from '@/utils/ai/aiLog.js'
	import {
		buildImageTextExtractionPayload,
		parseImageTextSubmit
	} from '@/utils/image/imageTextExtraction.js'
	import { useDebugLog, showTaskLoading, hideTaskLoading } from '@/utils/debug/useDebugLog.js'
	import { baseUrl } from '@/utils/http.js'

	const {
		debugLogs,
		debugScrollTop,
		clearDebugLogs,
		logInfo,
		logStep,
		logOk,
		showDebugError
	} = useDebugLog('imageTextExtract')

	const imagePath = ref('')
	const resultText = ref('')
	const showResultPanel = ref(false)
	const resultEditorKey = ref(0)
	const editorFocus = ref(false)
	const processing = ref(false)
	const originSize = ref({ width: 0, height: 0 })

	const tips = [
		'选择含清晰文字的图片，横排印刷体识别率更高',
		'支持中英文混排，复杂背景可能略有误差',
		'识别结果可点击修改，再复制或分享',
		'图片将上传至服务端进行识别'
	]

	const onResultInput = (e) => {
		resultText.value = e.detail?.value ?? ''
	}

	const focusEditor = () => {
		editorFocus.value = true
	}

	onLoad((options) => {
		if (options?.title) {
			uni.setNavigationBarTitle({ title: decodeURIComponent(options.title) })
		} else {
			uni.setNavigationBarTitle({ title: '图片提取文字' })
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
		try {
			const picked = await pickLocalImage({ maxSize: 10 * 1024 * 1024 })
			imagePath.value = picked.path
			resultText.value = ''
			showResultPanel.value = false
			if (picked.width && picked.height) {
				originSize.value = { width: picked.width, height: picked.height }
			} else {
				loadImageMeta(picked.path)
			}
		} catch (err) {
			handlePickLocalImageError(err)
		}
	}

	const resetAll = () => {
		imagePath.value = ''
		resultText.value = ''
		showResultPanel.value = false
		editorFocus.value = false
		originSize.value = { width: 0, height: 0 }
	}

	const clearResult = () => {
		resultText.value = ''
		editorFocus.value = false
		resultEditorKey.value += 1
	}

	const previewImage = () => {
		if (!imagePath.value) return
		uni.previewImage({
			urls: [imagePath.value],
			current: imagePath.value
		})
	}

	const copyText = () => {
		if (!resultText.value?.trim()) {
			uni.showToast({ title: '暂无内容可复制', icon: 'none' })
			return
		}
		uni.setClipboardData({
			data: resultText.value,
			success: () => {
				uni.showToast({ title: '已复制到剪贴板', icon: 'none' })
			},
			fail: () => {
				uni.showToast({ title: '复制失败', icon: 'none' })
			}
		})
	}

	const handleExtract = async () => {
		if (processing.value || !imagePath.value) return
		if (!checkLogin()) return

		processing.value = true
		resultText.value = ''
		editorFocus.value = false
		logInfo(`API 根地址: ${baseUrl}`)
		logStep('1/3 上传图片到 OSS')
		showTaskLoading({ title: '上传图片...', mask: true })

		try {
			const ossUrl = await uploadImageToOss(imagePath.value)
			logOk(`OSS 上传成功\n${ossUrl}`)
			logStep('2/3 提交 OCR 任务')
			showTaskLoading({ title: '识别中...', mask: true })

			const payload = buildImageTextExtractionPayload(ossUrl)
			const res = await apiImageTextExtraction(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, '识别失败'))
			}

			const { text: syncText, aiLogId } = parseImageTextSubmit(body)
			let text = syncText

			if (!text && aiLogId) {
				logStep(`3/3 轮询任务结果 (id=${aiLogId})`)
				showTaskLoading({ title: '识别中，请稍候...', mask: true })
				text = await pollAiLogResult(apiGetAiLog, aiLogId, {
					resolve: resolveAiLogText,
					maxAttempts: 90,
					interval: 2000,
					onProgress: (attempt, maxAttempts) => {
						logInfo(`轮询中: ${attempt}/${maxAttempts}`)
						showTaskLoading({ title: '识别中，请稍候...', mask: true })
					}
				})
				logOk(`识别完成，${text.length} 字`)
			} else if (text) {
				logOk(`同步返回，${text.length} 字`)
			}

			text = normalizeAiText(text)

			if (!text) {
				throw new Error('未识别到文字内容')
			}

			resultText.value = text
			resultEditorKey.value += 1
			showResultPanel.value = true
			uni.showToast({ title: '识别完成，可点击编辑', icon: 'success' })
			recordTrialUseAfterSuccess()
		} catch (err) {
			console.error('[imageTextExtract]', err)
			showDebugError('识别失败', err)
		} finally {
			processing.value = false
			hideTaskLoading()
		}
	}
</script>

<style lang="scss" scoped>
	.ocr-page {
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
		padding: 60rpx 40rpx;
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

	.action-panel,
	.result-panel {
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

	.result-header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12rpx 16rpx;
		margin-bottom: 20rpx;
	}

	.edit-hint {
		font-size: 22rpx;
		color: rgba(79, 172, 254, 0.85);
	}

	.char-count {
		margin-left: auto;
	}

	.section-label {
		display: flex;
		align-items: center;
		gap: 12rpx;

		.label-line {
			width: 6rpx;
			height: 28rpx;
			border-radius: 3rpx;

			&.line-pink {
				background: linear-gradient(to bottom, #f093fb, #f5576c);
			}
		}

		text {
			font-size: 30rpx;
			font-weight: 600;
			color: var(--text-primary);
		}
	}

	.char-count {
		font-size: 24rpx;
		color: var(--text-muted);
	}

	.result-editor {
		width: 100%;
		min-height: 240rpx;
		max-height: 520rpx;
		padding: 20rpx;
		box-sizing: border-box;
		border-radius: 16rpx;
		background: rgba(0, 0, 0, 0.2);
		border: 2rpx solid rgba(79, 172, 254, 0.25);
		font-size: 28rpx;
		line-height: 1.7;
		color: var(--text-dim);
	}

	:deep(.result-editor-placeholder) {
		color: var(--text-faint);
		font-size: 28rpx;
	}

	.result-actions {
		display: flex;
		gap: 20rpx;
		margin-top: 24rpx;

		.action-chip {
			flex: 1;
			padding: 22rpx 0;
			text-align: center;
			border-radius: 40rpx;
			background: rgba(79, 172, 254, 0.12);
			border: 2rpx solid rgba(79, 172, 254, 0.35);

			text {
				font-size: 28rpx;
				color: #4facfe;
			}

			&.primary {
				background: rgba(79, 172, 254, 0.22);
			}

			&:active {
				opacity: 0.85;
			}
		}
	}
</style>