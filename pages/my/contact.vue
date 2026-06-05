<template>
	<dark-page-meta />
	<view class="sub-page" :class="themeClass">
		<view class="contact-content">
			<view class="contact-title">
				<text class="title-icon">📞</text>
				<text class="title-text">联系客服</text>
			</view>

			<view class="contact-methods">
				<view class="contact-card boxBg">
					<view class="contact-row">
						<view class="contact-icon">💬</view>
						<view class="contact-info">
							<text class="contact-label">微信客服</text>
							<text class="contact-value">{{ wechatServiceText }}</text>
							<text class="contact-hint">工作时间：9:00-21:00</text>
						</view>
						<text class="iconfont icon-xiangyou"></text>
					</view>
					<!-- #ifdef MP-WEIXIN -->
					<button
						class="contact-hit"
						open-type="contact"
						session-from="contact-page"
						@contact="onWechatContact"
					/>
					<!-- #endif -->
					<!-- #ifndef MP-WEIXIN -->
					<view class="contact-hit" @click="onWechatContactUnsupported" />
					<!-- #endif -->
				</view>

				<view class="contact-card boxBg" @click="callPhone">
					<view class="contact-row">
						<view class="contact-icon">📱</view>
						<view class="contact-info">
							<text class="contact-label">电话客服</text>
							<text class="contact-value">{{ servicePhoneDisplay }}</text>
							<text class="contact-hint">点击拨打客服电话</text>
						</view>
						<text class="iconfont icon-xiangyou"></text>
					</view>
				</view>
			</view>

			<view class="feedback-box boxBg">
				<text class="feedback-title">意见反馈</text>
				<textarea
					class="feedback-input"
					v-model="feedbackContent"
					placeholder="请输入您的意见或建议..."
					placeholder-class="feedback-placeholder"
				></textarea>
				<view class="feedback-btn" @click="submitFeedback">
					<text>提交反馈</text>
				</view>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { computed, ref } from 'vue'

	/** 客服电话，可按实际号码修改 */
	const SERVICE_PHONE = '400-888-8888'

	const feedbackContent = ref('')

	const servicePhoneDisplay = computed(() => SERVICE_PHONE)

	const wechatServiceText = computed(() => {
		// #ifdef MP-WEIXIN
		return '点击跳转微信客服会话'
		// #endif
		// #ifndef MP-WEIXIN
		return '请在微信小程序中使用'
		// #endif
	})

	const onWechatContact = (e) => {
		console.log('[contact] wechat contact:', e?.detail)
	}

	const onWechatContactUnsupported = () => {
		uni.showToast({
			title: '请在微信小程序中使用微信客服',
			icon: 'none'
		})
	}

	const callPhone = () => {
		const phoneNumber = SERVICE_PHONE.replace(/-/g, '')
		uni.makePhoneCall({
			phoneNumber,
			fail: (err) => {
				if (/cancel|取消/.test(err?.errMsg || '')) return
				uni.showToast({
					title: '拨打失败，请稍后重试',
					icon: 'none'
				})
			}
		})
	}

	const submitFeedback = () => {
		if (!feedbackContent.value.trim()) {
			uni.showToast({
				title: '请输入内容',
				icon: 'none'
			})
			return
		}
		uni.showToast({
			title: '感谢您的反馈',
			icon: 'success'
		})
		feedbackContent.value = ''
	}
</script>

<style lang="scss">
	.sub-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
		padding: 30rpx;
		padding-bottom: 120rpx;
	}

	.contact-content {
		display: flex;
		flex-direction: column;
		gap: 30rpx;
	}

	.contact-title {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;

		.title-icon {
			font-size: 40rpx;
			margin-right: 15rpx;
		}

		.title-text {
			font-size: 36rpx;
			font-weight: bold;
			color: var(--text-primary);
		}
	}

	.contact-methods {
		display: flex;
		flex-direction: column;
		gap: 15rpx;
	}

	.contact-card {
		position: relative;
		border-radius: 16rpx;
		overflow: hidden;

		&:active {
			opacity: 0.85;
		}
	}

	.contact-row {
		display: flex;
		align-items: center;
		padding: 25rpx;

		.icon-xiangyou {
			font-size: 28rpx;
			color: var(--text-muted);
			margin-left: 12rpx;
			flex-shrink: 0;
		}
	}

	.contact-hit {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		opacity: 0;
		z-index: 2;

		&::after {
			border: none;
		}
	}

	.contact-icon {
		font-size: 40rpx;
		margin-right: 20rpx;
		width: 60rpx;
		text-align: center;
		flex-shrink: 0;
	}

	.contact-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;

		.contact-label {
			font-size: 24rpx;
			color: var(--text-muted);
			margin-bottom: 5rpx;
		}

		.contact-value {
			font-size: 28rpx;
			color: var(--text-primary);
		}

		.contact-hint {
			margin-top: 6rpx;
			font-size: 22rpx;
			color: rgba(79, 172, 254, 0.85);
		}
	}

	.feedback-box {
		padding: 30rpx;
		border-radius: 16rpx;

		.feedback-title {
			font-size: 32rpx;
			font-weight: bold;
			color: var(--text-primary);
			margin-bottom: 20rpx;
			display: block;
		}

		.feedback-input {
			width: 100%;
			height: 200rpx;
			background: var(--surface-bg);
			border-radius: 12rpx;
			padding: 20rpx;
			font-size: 28rpx;
			color: var(--text-primary);
			margin-bottom: 20rpx;
			box-sizing: border-box;
		}

		.feedback-placeholder {
			color: var(--text-faint);
		}

		.feedback-btn {
			background: linear-gradient(to right, #4facfe, #00f2fe);
			padding: 25rpx;
			border-radius: 12rpx;
			text-align: center;

			text {
				font-size: 30rpx;
				color: var(--text-primary);
				font-weight: 500;
			}
		}
	}
</style>
