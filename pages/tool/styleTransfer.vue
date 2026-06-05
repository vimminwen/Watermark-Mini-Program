<template>
	<dark-page-meta />
	<view class="style-page" :class="themeClass">
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @tap="chooseImage">
				<text class="iconfont icon-tupianchuli empty-icon"></text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持 JPG / PNG，建议小于 5MB</text>
			</view>
			<view v-else class="preview-wrap" @tap="onPreviewTap">
				<image class="preview-image" :src="displayImage" mode="aspectFit" />
				<view class="size-badge">
					<text v-if="resultPath">{{ selectedStyle?.name || preset.pageTitle }} · 点击预览</text>
					<text v-else-if="originSize.width">{{ originSize.width }} × {{ originSize.height }}</text>
				</view>
			</view>
		</view>

		<view class="toolbar">
			<view class="tool-chip" @tap="chooseImage">
				<text>{{ imagePath ? ' 换一张' : ' 选择图片' }}</text>
			</view>
			<view v-if="imagePath" class="tool-chip danger" @tap="resetAll">
				<text>清空</text>
			</view>
		</view>

		<view class="settings-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>选择风格</text>
			</view>

			<view v-if="stylesLoading" class="style-loading">
				<processing-text text="加载风格" />
			</view>
			<view v-else-if="stylesError" class="style-error">
				<text>{{ stylesError }}</text>
				<view class="retry-btn" @tap="loadStyleOptions">
					<text>重新加载</text>
				</view>
			</view>
			<scroll-view v-else scroll-y class="style-scroll" :show-scrollbar="true">
				<view
					v-for="item in styleOptions"
					:key="item.id"
					class="style-item"
					:class="{ active: selectedStyleId === item.id, disabled: processing }"
					@tap="selectStyle(item)"
				>
					<text class="style-name">{{ item.name }}</text>
					<text v-if="item.description" class="style-desc">{{ item.description }}</text>
				</view>
			</scroll-view>
		</view>

		<view v-if="imagePath" class="settings-panel boxBg action-panel">
			<!-- <view class="intensity-row">
				<text class="intensity-label">风格强度</text>
				<slider
					class="intensity-slider"
					:value="strengthPercent"
					:min="0"
					:max="100"
					:step="1"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					:disabled="processing"
					@changing="onStrengthChanging"
					@change="onStrengthChange"
				/>
				<text class="intensity-value">{{ strengthPercent }}%</text>
			</view> -->

			<view
				class="process-btn"
				:class="{ disabled: processing || stylesLoading || !selectedStyle }"
				@tap="handleProcess"
			>
				<processing-text
					:active="processing"
					text="生成中"
					:idle-text="resultPath ? preset.reprocessText : preset.processText"
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

		<tool-tips-card :tips="preset.tips" />
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
	import { ref, computed, reactive } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { apiCrossDimensionCamera, apiGetAiLog } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin } from '@/utils/user/auth.js'
	import { uploadImageToOss } from '@/utils/image/ossUpload.js'
	import { extractAiLogId, pollAiLogResult, resolveAiLogResultUrl } from '@/utils/ai/aiLog.js'
	import {
		getStylePreset,
		buildStyleTransferPayload,
		fetchStylesForPreset,
		DEFAULT_STYLE_KEY,
		DEFAULT_STRENGTH
	} from '@/utils/image/styleTransfer.js'
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
	} = useDebugLog('styleTransfer')

	const imagePath = ref('')
	const resultPath = ref('')
	const processing = ref(false)
	const saving = ref(false)
	const originSize = ref({ width: 0, height: 0 })
	const styleOptions = ref([])
	const selectedStyleId = ref('')
	const stylesLoading = ref(false)
	const stylesError = ref('')

	const pageState = reactive({
		styleKey: DEFAULT_STYLE_KEY
	})

	const preset = computed(() => getStylePreset(pageState.styleKey))

	const selectedStyle = computed(() =>
		styleOptions.value.find((item) => item.id === selectedStyleId.value) || null
	)

	const displayImage = computed(() => resultPath.value || imagePath.value)

	const loadStyleOptions = async () => {
		stylesLoading.value = true
		stylesError.value = ''
		try {
			const styles = await fetchStylesForPreset(pageState.styleKey)
			styleOptions.value = styles
			if (!styles.some((item) => item.id === selectedStyleId.value)) {
				selectedStyleId.value = styles[0]?.id || ''
			}
		} catch (err) {
			console.error('[loadStyleOptions]', err)
			styleOptions.value = []
			selectedStyleId.value = ''
			stylesError.value = err?.message || '获取风格列表失败'
		} finally {
			stylesLoading.value = false
		}
	}

	const selectStyle = (item) => {
		if (processing.value || !item?.id) return
		if (selectedStyleId.value === item.id) return
		selectedStyleId.value = item.id
		resultPath.value = ''
	}

	onLoad((options) => {
		if (options?.styleKey) {
			pageState.styleKey = options.styleKey
		}
		const title = options?.title
			? decodeURIComponent(options.title)
			: preset.value.pageTitle
		uni.setNavigationBarTitle({ title })
		loadStyleOptions()
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
		resultPath.value = ''
		originSize.value = { width: 0, height: 0 }
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

	const handleProcess = async () => {
		if (processing.value || !imagePath.value) return
		if (!selectedStyle.value) {
			uni.showToast({ title: '请先选择风格', icon: 'none' })
			return
		}
		if (!checkLogin()) return

		processing.value = true
		resultPath.value = ''
		logInfo(`API 根地址: ${baseUrl}`)
		logStep('1/4 上传图片到 OSS')
		showTaskLoading({ title: '上传图片...', mask: true })

		try {
			const ossUrl = await uploadImageToOss(imagePath.value)
			logOk(`OSS 上传成功\n${ossUrl}`)
			logStep(`2/4 提交风格转换任务 (${selectedStyle.value.name})`)
			showTaskLoading({ title: '生成中...', mask: true })

			const payload = buildStyleTransferPayload(
				ossUrl,
				selectedStyle.value,
				DEFAULT_STRENGTH
			)
			const res = await apiCrossDimensionCamera(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, '生成失败'))
			}

			let resultUrl = resolveAiLogResultUrl(body)

			if (!resultUrl) {
				const aiLogId = extractAiLogId(body)
				if (!aiLogId) {
					throw new Error('未获取到任务 ID')
				}
				logStep(`3/4 轮询任务结果 (id=${aiLogId})`)
				resultUrl = await pollAiLogResult(apiGetAiLog, aiLogId, {
					onProgress: (attempt, maxAttempts) => {
						logInfo(`轮询中: ${attempt}/${maxAttempts}`)
						showTaskLoading({ title: '生成中...', mask: true })
					}
				})
				logOk(`任务完成\n${resultUrl}`)
			} else {
				logOk(`同步返回结果\n${resultUrl}`)
			}

			logStep('4/4 下载结果')
			showTaskLoading({ title: '下载结果...', mask: true })
			const localPath = await downloadResultImage(resultUrl)
			resultPath.value = localPath
			logOk('生成完成')
			uni.showToast({ title: '生成完成', icon: 'success' })
		} catch (err) {
			console.error('[handleProcess]', err)
			showDebugError('生成失败', err)
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
	.style-page {
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
		height: 480rpx;

		.preview-image {
			width: 100%;
			height: 100%;
		}

		.size-badge {
			position: absolute;
			left: 20rpx;
			right: 20rpx;
			bottom: 20rpx;
			padding: 8rpx 20rpx;
			border-radius: 24rpx;
			background: rgba(0, 0, 0, 0.55);
			text-align: center;

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

	.settings-panel {
		border-radius: 20rpx;
		padding: 28rpx;
		margin-bottom: 24rpx;

		&.action-panel {
			padding-top: 0;
		}
	}

	.style-loading,
	.style-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 160rpx;
		gap: 20rpx;

		text {
			font-size: 26rpx;
			color: var(--text-muted);
			text-align: center;
		}
	}

	.retry-btn {
		padding: 14rpx 36rpx;
		border-radius: 32rpx;
		background: rgba(79, 172, 254, 0.15);
		border: 2rpx solid rgba(79, 172, 254, 0.35);

		text {
			font-size: 26rpx;
			color: #4facfe;
		}

		&:active {
			opacity: 0.85;
		}
	}

	.style-scroll {
		max-height: 420rpx;
	}

	.style-item {
		padding: 22rpx 24rpx;
		border-radius: 16rpx;
		background: var(--surface-bg);
		border: 2rpx solid transparent;
		margin-bottom: 16rpx;

		&:last-child {
			margin-bottom: 0;
		}

		.style-name {
			display: block;
			font-size: 28rpx;
			font-weight: 600;
			color: var(--text-primary);
			margin-bottom: 8rpx;
		}

		.style-desc {
			display: block;
			font-size: 24rpx;
			line-height: 1.5;
			color: var(--text-muted);
		}

		&.active {
			background: rgba(79, 172, 254, 0.15);
			border-color: #4facfe;

			.style-name {
				color: #4facfe;
			}
		}

		&.disabled {
			opacity: 0.6;
			pointer-events: none;
		}

		&:active:not(.disabled) {
			opacity: 0.85;
		}
	}

	.section-label {
		display: flex;
		align-items: center;
		margin-bottom: 24rpx;

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

	.intensity-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 24rpx;

		.intensity-label {
			font-size: 26rpx;
			color: var(--text-secondary);
			flex-shrink: 0;
			width: 120rpx;
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
</style>