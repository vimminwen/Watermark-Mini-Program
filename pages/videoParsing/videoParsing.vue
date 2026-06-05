<template>
	<dark-page-meta />
	<view class="video-parse-page" :class="themeClass">
		<view class="input-card boxBg">
			<view class="section-label">
				<view class="label-line"></view>
				<text>分享链接</text>
			</view>
			<textarea
				class="link-input"
				v-model="shareText"
				placeholder="粘贴抖音 / 快手 / 小红书等平台分享文案或链接"
				:maxlength="2000"
				:auto-height="false"
				:disabled="parsing"
			/>
			<view class="input-actions">
				<view class="action-chip" @click="pasteFromClipboard">
					<text>📋 粘贴</text>
				</view>
				<view class="action-chip" @click="clearInput">
					<text>清空</text>
				</view>
			</view>
		</view>

		<view
			class="parse-btn"
			:class="{ disabled: parsing }"
			@click="handleParse"
		>
			<text>{{ parsing ? '解析中...' : '开始解析' }}</text>
		</view>

		<view v-if="parseResult" class="result-card boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>解析结果</text>
			</view>

			<view class="video-wrap" v-if="parseResult.videoUrl">
				<video
					class="preview-video"
					:src="parseResult.videoUrl"
					:poster="parseResult.cover || ''"
					controls
					show-center-play-btn
					object-fit="contain"
				/>
			</view>

			<view class="meta-info">
				<text class="meta-title">{{ parseResult.title }}</text>
				<text v-if="parseResult.author" class="meta-author">@{{ parseResult.author }}</text>
			</view>

			<view class="result-actions">
				<view class="result-btn primary" @click="copyVideoUrl">
					<text>复制链接</text>
				</view>
				<view class="result-btn" @click="saveVideo">
					<text>{{ saving ? '保存中...' : '保存视频' }}</text>
				</view>
				<view class="result-btn" @click="copyTitle">
					<text>复制标题</text>
				</view>
			</view>
		</view>

		<view class="tips-card boxBg">
			<view class="section-label">
				<view class="label-line"></view>
				<text>使用说明</text>
			</view>
			<view class="tip-item" v-for="(tip, index) in tips" :key="index">
				<text class="tip-index">{{ index + 1 }}</text>
				<text class="tip-text">{{ tip }}</text>
			</view>
		</view>

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
	import { apiParseVideo } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { extractShareUrl, normalizeParseResult } from '@/utils/video/videoParse.js'
	import { checkLogin } from '@/utils/user/auth.js'
	import { useDebugLog, showTaskLoading, hideTaskLoading } from '@/utils/debug/useDebugLog.js'
	import { baseUrl } from '@/utils/http.js'

	const {
		debugLogs,
		debugScrollTop,
		clearDebugLogs,
		logInfo,
		logStep,
		logOk,
		logWarn,
		showDebugError
	} = useDebugLog('videoParse')

	const shareText = ref('')
	const parsing = ref(false)
	const saving = ref(false)
	const parseResult = ref(null)

	const tips = [
		'在短视频 App 中点击分享，复制链接或整段文案',
		'回到本页点击「粘贴」，再点「开始解析」',
		'解析成功后可复制链接，或保存视频到相册',
		'请仅下载自己有权使用的内容，遵守平台版权规定'
	]

	const pasteFromClipboard = () => {
		uni.getClipboardData({
			success: (res) => {
				const text = res.data || ''
				if (!text) {
					uni.showToast({ title: '剪贴板为空', icon: 'none' })
					return
				}
				shareText.value = text.trim()
				uni.showToast({ title: '已粘贴', icon: 'success' })
			},
			fail: () => {
				uni.showToast({ title: '读取剪贴板失败', icon: 'none' })
			}
		})
	}

	const clearInput = () => {
		shareText.value = ''
		parseResult.value = null
	}

	const handleParse = async () => {
		if (parsing.value) return
		if (!checkLogin()) return

		const url = extractShareUrl(shareText.value)
		if (!url) {
			uni.showToast({ title: '请粘贴有效的分享链接', icon: 'none' })
			return
		}

		parsing.value = true
		parseResult.value = null
		logInfo(`API 根地址: ${baseUrl}`)
		logStep(`1/2 解析分享链接\n${url}`)
		showTaskLoading({ title: '解析中...', mask: true })

		try {
			const res = await apiParseVideo({ url })
			const body = res?.data

			if (!isApiSuccess(body)) {
				const msg = getApiMessage(body, '解析失败')
				logWarn(msg)
				uni.showToast({ title: msg, icon: 'none' })
				return
			}

			const result = normalizeParseResult(body)
			if (!result?.videoUrl) {
				logWarn('未获取到视频地址')
				uni.showToast({ title: '未获取到视频地址', icon: 'none' })
				return
			}

			parseResult.value = result
			logOk(`解析成功\n${result.videoUrl}`)
			uni.showToast({ title: '解析成功', icon: 'success' })
		} catch (err) {
			console.error('[handleParse]', err)
			showDebugError('解析失败', err)
		} finally {
			parsing.value = false
			hideTaskLoading()
		}
	}

	const copyText = (text, okTitle = '已复制') => {
		if (!text) {
			uni.showToast({ title: '内容为空', icon: 'none' })
			return
		}
		uni.setClipboardData({
			data: String(text),
			success: () => uni.showToast({ title: okTitle, icon: 'none' })
		})
	}

	const copyVideoUrl = () => {
		copyText(parseResult.value?.videoUrl, '视频链接已复制')
	}

	const copyTitle = () => {
		copyText(parseResult.value?.title, '标题已复制')
	}

	const saveVideo = () => {
		if (saving.value) return
		const url = parseResult.value?.videoUrl
		if (!url) {
			uni.showToast({ title: '暂无视频地址', icon: 'none' })
			return
		}

		saving.value = true
		uni.showLoading({ title: '下载中...', mask: true })

		uni.downloadFile({
			url,
			success: (res) => {
				if (res.statusCode !== 200 || !res.tempFilePath) {
					uni.showToast({ title: '下载失败', icon: 'none' })
					return
				}
				uni.saveVideoToPhotosAlbum({
					filePath: res.tempFilePath,
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
								success: (modalRes) => {
									if (modalRes.confirm) {
										uni.openSetting()
									}
								}
							})
						} else {
							uni.showToast({ title: '保存失败', icon: 'none' })
						}
					}
				})
			},
			fail: () => {
				uni.showToast({ title: '下载失败，请检查域名配置', icon: 'none' })
			},
			complete: () => {
				saving.value = false
				uni.hideLoading()
			}
		})
	}
</script>

<style lang="scss" scoped>
	.video-parse-page {
		min-height: 100vh;
		padding: 30rpx;
		padding-bottom: 140rpx;
		box-sizing: border-box;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
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

	.input-card,
	.result-card,
	.tips-card {
		border-radius: 20rpx;
		padding: 28rpx;
		margin-bottom: 28rpx;
	}

	.link-input {
		width: 100%;
		height: 200rpx;
		padding: 24rpx;
		box-sizing: border-box;
		font-size: 28rpx;
		color: var(--text-primary);
		background: var(--surface-bg-light);
		border-radius: 16rpx;
		line-height: 1.5;

		&::placeholder {
			color: var(--text-faint);
		}
	}

	.input-actions {
		display: flex;
		gap: 20rpx;
		margin-top: 20rpx;

		.action-chip {
			flex: 1;
			padding: 18rpx 0;
			text-align: center;
			border-radius: 40rpx;
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
	}

	.parse-btn {
		background: linear-gradient(to right, #4facfe, #00f2fe);
		padding: 30rpx;
		border-radius: 50rpx;
		text-align: center;
		margin-bottom: 28rpx;

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

	.video-wrap {
		border-radius: 16rpx;
		overflow: hidden;
		margin-bottom: 24rpx;
		background: #000;

		.preview-video {
			width: 100%;
			height: 420rpx;
		}
	}

	.meta-info {
		margin-bottom: 28rpx;

		.meta-title {
			display: block;
			font-size: 30rpx;
			color: var(--text-primary);
			line-height: 1.5;
			margin-bottom: 10rpx;
		}

		.meta-author {
			font-size: 26rpx;
			color: var(--text-muted);
		}
	}

	.result-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;

		.result-btn {
			flex: 1;
			min-width: calc(50% - 8rpx);
			padding: 22rpx 0;
			text-align: center;
			border-radius: 40rpx;
			background: var(--surface-bg);
			border: 2rpx solid var(--border-color);

			text {
				font-size: 26rpx;
				color: var(--text-dim);
			}

			&.primary {
				background: rgba(79, 172, 254, 0.2);
				border-color: rgba(79, 172, 254, 0.45);

				text {
					color: #4facfe;
					font-weight: 600;
				}
			}

			&:active {
				opacity: 0.85;
			}
		}
	}

	.tips-card {
		.tip-item {
			display: flex;
			align-items: flex-start;
			margin-bottom: 20rpx;

			&:last-child {
				margin-bottom: 0;
			}

			.tip-index {
				width: 36rpx;
				height: 36rpx;
				line-height: 36rpx;
				text-align: center;
				font-size: 22rpx;
				color: #4facfe;
				background: rgba(79, 172, 254, 0.2);
				border-radius: 50%;
				margin-right: 16rpx;
				flex-shrink: 0;
			}

			.tip-text {
				flex: 1;
				font-size: 26rpx;
				color: var(--text-subtle);
				line-height: 1.5;
			}
		}
	}
</style>
