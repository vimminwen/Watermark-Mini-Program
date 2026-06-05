<template>
	<view class="mte-page" :class="themeClass">
		<view class="preview-card boxBg">
			<view v-if="!mediaPath" class="preview-empty" @click="chooseMedia">
				<text class="iconfont empty-icon" :class="config.emptyIcon"></text>
				<text class="empty-title">{{ config.emptyTitle }}</text>
				<text class="empty-desc">{{ config.emptyDesc }}</text>
			</view>
			<view
				v-else-if="mode === 'audio'"
				class="preview-wrap audio-wrap"
				@click="toggleAudioPlay"
			>
				<text class="audio-icon">{{ audioPlaying ? '⏸' : '🎵' }}</text>
				<text class="audio-name">{{ mediaName }}</text>
				<text class="audio-meta">{{ mediaMeta.duration }}s · 点击{{ audioPlaying ? '暂停' : '播放' }}</text>
			</view>
			<view v-else class="preview-wrap" @click="previewVideo">
				<image class="preview-thumb" :src="thumbPath || mediaPath" mode="aspectFit" />
				<view class="play-mask">
					<text class="play-icon">▶</text>
				</view>
				<view v-if="mediaMeta.duration" class="size-badge">
					<text>{{ mediaMeta.width }}×{{ mediaMeta.height }} · {{ mediaMeta.duration }}s</text>
				</view>
			</view>
		</view>

		<view class="toolbar">
			<view class="tool-chip" @click="chooseMedia">
				<text>{{ mediaPath ? '🔄 换一个' : config.pickBtnText }}</text>
			</view>
			<view v-if="mediaPath" class="tool-chip danger" @click="resetAll">
				<text>清空</text>
			</view>
		</view>

		<view v-if="mediaPath" class="action-panel boxBg">
			<view class="process-btn" :class="{ disabled: processing }" @click="handleExtract">
				<processing-text
					:active="processing"
					text="转写中"
					:idle-text="resultText ? '重新转写' : config.submitBtnText"
				/>
			</view>
		</view>

		<view v-if="showResultPanel" class="result-panel boxBg">
			<view class="result-header">
				<view class="section-label">
					<view class="label-line line-pink"></view>
					<text>转写结果</text>
				</view>
				<text class="edit-hint">点击可编辑</text>
				<text class="char-count">{{ resultText.length }} 字</text>
			</view>
			<textarea
				class="result-editor"
				:value="resultText"
				:focus="editorFocus"
				auto-height
				:maxlength="50000"
				:show-confirm-bar="false"
				:adjust-position="true"
				placeholder="转写结果将显示在这里"
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
					<text>清空结果</text>
				</view>
			</view>
		</view>

		<tool-tips-card :tips="config.tips" />
		<!-- 上传日志（调试时取消注释）
		<debug-log-panel
			:logs="debugLogs"
			:scroll-top="debugScrollTop"
			@clear="clearDebugLogs"
		/>
		-->
	</view>
</template>

<script setup>
	import { ref, reactive, computed } from 'vue'
	import { onUnload } from '@dcloudio/uni-app'
	import { useTheme } from '@/utils/theme/useTheme.js'
	import { apiVideoTransformationTextForUrl, apiGetAiLog } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin } from '@/utils/user/auth.js'
	import { uploadMediaToOss } from '@/utils/video/ossUpload.js'
	import {
		pickLocalVideoForText,
		pickLocalAudioForText,
		handlePickTextMediaError
	} from '@/utils/video/pickLocalTextMedia.js'
	import {
		VIDEO_REMOVE_MAX_PIXELS,
		isVideoWithinRemovePixelLimit,
		getVideoRemovePixelLimitMessage
	} from '@/utils/video/subtitleRemoval.js'
	import { pollAiLogResult, resolveAiLogText } from '@/utils/ai/aiLog.js'
	import {
		buildVideoTextExtractionPayload,
		buildAudioTextExtractionPayload,
		parseMediaTextSubmit
	} from '@/utils/video/mediaTextExtraction.js'
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
	} = useDebugLog('mediaTextExtract')

	const props = defineProps({
		/** video | audio */
		mode: {
			type: String,
			required: true,
			validator: (v) => ['video', 'audio'].includes(v)
		}
	})

	const { themeClass } = useTheme()

	const MODE_CONFIG = {
		video: {
			emptyIcon: 'icon-shipinzhuanwenzi',
			emptyTitle: '点击选择视频',
			emptyDesc: `最长 45 秒，总像素不超过 ${VIDEO_REMOVE_MAX_PIXELS}，建议 100MB 以内`,
			pickBtnText: '📁 选择视频',
			submitBtnText: '开始转文字',
			uploadLoading: '上传视频...',
			tips: [
				`选择含清晰人声的视频，最长 45 秒，总像素上限 ${VIDEO_REMOVE_MAX_PIXELS.toLocaleString()}（如 1440×1080）`,
				'环境音过大可能影响识别准确率',
				'视频将上传至服务端转写，请保持网络畅通',
				'结果可点击修改后再复制'
			]
		},
		audio: {
			emptyIcon: 'icon-zhuanwenzi_fill',
			emptyTitle: '点击选择音频',
			emptyDesc: '支持 mp3/m4a/wav 等，最长 45 秒',
			pickBtnText: '📁 选择音频',
			submitBtnText: '开始转文字',
			uploadLoading: '上传音频...',
			tips: [
				'选择含清晰人声的音频文件，最长 45 秒',
				'支持 mp3、m4a、wav、aac 等常见格式',
				'文件将上传至服务端转写，请保持网络畅通',
				'结果可点击修改后再复制'
			]
		}
	}

	const config = computed(() => MODE_CONFIG[props.mode] || MODE_CONFIG.video)

	const mediaPath = ref('')
	const thumbPath = ref('')
	const mediaName = ref('')
	const mediaMeta = reactive({ width: 0, height: 0, duration: 0 })
	const resultText = ref('')
	const showResultPanel = ref(false)
	const editorFocus = ref(false)
	const processing = ref(false)
	const audioPlaying = ref(false)

	let audioPlayer = null

	const stopAudio = () => {
		audioPlaying.value = false
		if (!audioPlayer) return
		try {
			audioPlayer.stop()
			audioPlayer.destroy()
		} catch (e) {
			// ignore
		}
		audioPlayer = null
	}

	onUnload(() => {
		stopAudio()
	})

	const onResultInput = (e) => {
		resultText.value = e.detail?.value ?? ''
	}

	const focusEditor = () => {
		editorFocus.value = true
	}

	const applyPicked = (picked) => {
		mediaPath.value = picked.path
		thumbPath.value = picked.thumbPath || ''
		mediaName.value = picked.name
		mediaMeta.width = picked.width
		mediaMeta.height = picked.height
		mediaMeta.duration = picked.duration
		resultText.value = ''
		showResultPanel.value = false
		editorFocus.value = false
	}

	const chooseMedia = async () => {
		try {
			stopAudio()
			const picked =
				props.mode === 'audio'
					? await pickLocalAudioForText()
					: await pickLocalVideoForText()
			applyPicked(picked)
		} catch (err) {
			handlePickTextMediaError(err)
		}
	}

	const resetAll = () => {
		stopAudio()
		mediaPath.value = ''
		thumbPath.value = ''
		mediaName.value = ''
		mediaMeta.width = 0
		mediaMeta.height = 0
		mediaMeta.duration = 0
		resultText.value = ''
		showResultPanel.value = false
		editorFocus.value = false
	}

	const toggleAudioPlay = () => {
		if (props.mode !== 'audio' || !mediaPath.value) return
		if (audioPlaying.value) {
			stopAudio()
			return
		}
		stopAudio()
		audioPlayer = uni.createInnerAudioContext()
		audioPlayer.src = mediaPath.value
		audioPlayer.onPlay(() => {
			audioPlaying.value = true
		})
		audioPlayer.onEnded(() => stopAudio())
		audioPlayer.onStop(() => stopAudio())
		audioPlayer.onError(() => {
			stopAudio()
			uni.showToast({ title: '播放失败', icon: 'none' })
		})
		audioPlayer.play()
	}

	const clearResult = () => {
		resultText.value = ''
		showResultPanel.value = false
		editorFocus.value = false
	}

	const previewVideo = () => {
		if (props.mode !== 'video' || !mediaPath.value) return
		// #ifdef MP-WEIXIN
		if (typeof wx !== 'undefined' && wx.previewMedia) {
			wx.previewMedia({
				sources: [{ url: mediaPath.value, type: 'video' }],
				current: 0
			})
			return
		}
		// #endif
		uni.showToast({ title: '当前环境暂不支持预览', icon: 'none' })
	}

	const copyText = () => {
		if (!resultText.value?.trim()) {
			uni.showToast({ title: '暂无内容可复制', icon: 'none' })
			return
		}
		uni.setClipboardData({
			data: resultText.value,
			success: () => uni.showToast({ title: '已复制到剪贴板', icon: 'none' }),
			fail: () => uni.showToast({ title: '复制失败', icon: 'none' })
		})
	}

	const handleExtract = async () => {
		if (processing.value || !mediaPath.value) return
		if (!checkLogin()) return

		if (props.mode === 'video') {
			const w = mediaMeta.width
			const h = mediaMeta.height
			if (w && h && !isVideoWithinRemovePixelLimit(w, h)) {
				uni.showToast({
					title: getVideoRemovePixelLimitMessage(w, h),
					icon: 'none'
				})
				return
			}
		}

		processing.value = true
		resultText.value = ''
		editorFocus.value = false
		stopAudio()
		// logInfo(`API 根地址: ${baseUrl}`)
		logStep(`1/3 上传${props.mode === 'audio' ? '音频' : '视频'}到 OSS`)
		showTaskLoading({ title: config.value.uploadLoading, mask: true })

		try {
			const ossUrl = await uploadMediaToOss(mediaPath.value, props.mode)
			logOk(`OSS 上传成功\n${ossUrl}`)
			logStep('2/3 提交转写任务')
			showTaskLoading({ title: '转写中...', mask: true })

			const payload =
				props.mode === 'audio'
					? buildAudioTextExtractionPayload(ossUrl)
					: buildVideoTextExtractionPayload(ossUrl)

			const res = await apiVideoTransformationTextForUrl(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, '转写失败'))
			}

			const { text: syncText, aiLogId } = parseMediaTextSubmit(body)
			let text = syncText

			if (!text && aiLogId) {
				logStep(`3/3 轮询任务结果 (id=${aiLogId})`)
				showTaskLoading({ title: '转写中，请稍候...', mask: true })
				text = await pollAiLogResult(apiGetAiLog, aiLogId, {
					resolve: resolveAiLogText,
					maxAttempts: 90,
					interval: 2000,
					onProgress: (attempt, maxAttempts) => {
						logInfo(`轮询中: ${attempt}/${maxAttempts}`)
						showTaskLoading({ title: '转写中，请稍候...', mask: true })
					}
				})
				logOk(`转写完成，${text.length} 字`)
			} else {
				logOk(`同步返回，${text?.length || 0} 字`)
			}

			if (!text) {
				throw new Error('未识别到文字内容')
			}

			resultText.value = text
			showResultPanel.value = true
			uni.showToast({ title: '转写完成，可点击编辑', icon: 'success' })
		} catch (err) {
			console.error(`[MediaTextExtract:${props.mode}]`, err)
			showDebugError('转写失败', err)
		} finally {
			processing.value = false
			hideTaskLoading()
		}
	}
</script>

<style lang="scss" scoped>
	.mte-page {
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
			text-align: center;
		}
	}

	.preview-wrap {
		position: relative;
		width: 100%;
		height: 480rpx;
		background: rgba(0, 0, 0, 0.25);

		&.audio-wrap {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 40rpx;
			box-sizing: border-box;

			&:active {
				opacity: 0.9;
			}

			.audio-icon {
				font-size: 96rpx;
				margin-bottom: 24rpx;
			}

			.audio-name {
				font-size: 30rpx;
				color: var(--text-primary);
				text-align: center;
				max-width: 100%;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				margin-bottom: 16rpx;
			}

			.audio-meta {
				font-size: 26rpx;
				color: var(--text-muted);
			}
		}

		.preview-thumb {
			width: 100%;
			height: 100%;
		}

		.play-mask {
			position: absolute;
			left: 0;
			top: 0;
			right: 0;
			bottom: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			pointer-events: none;

			.play-icon {
				width: 96rpx;
				height: 96rpx;
				line-height: 96rpx;
				text-align: center;
				border-radius: 50%;
				background: rgba(0, 0, 0, 0.45);
				font-size: 40rpx;
				color: var(--text-primary);
				padding-left: 8rpx;
			}
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
		font-size: 24rpx;
		color: var(--text-muted);
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
