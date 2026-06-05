<template>
	<dark-page-meta />
	<view class="cancel-page" :class="themeClass">
		<view class="header">
			<view class="subtitle">我们很遗憾您要离开</view>
		</view>
		
		<view class="info-section boxBg" v-if="loading">
			<text class="info-loading">会员信息加载中…</text>
		</view>

		<view class="info-section boxBg" v-else-if="isVipActive">
			<view class="info-item">
				<text class="info-label">当前会员</text>
				<text class="info-value">{{ memberName }}</text>
			</view>
			<view class="info-item">
				<text class="info-label">到期时间</text>
				<text class="info-value">{{ expireDate }}</text>
			</view>
			<view class="info-item">
				<text class="info-label">剩余时长</text>
				<text class="info-value highlight">{{ remainingText }}</text>
			</view>
		</view>

		<view class="info-section boxBg non-member" v-else>
			<text class="non-member-icon">ℹ️</text>
			<text class="non-member-title">当前无有效会员</text>
			<text class="non-member-desc">您仍可办理退订，成功后之后不再扣费</text>
		</view>
		
		<view class="survey-section boxBg" v-if="!loading">
			<view class="survey-title">请告诉我们原因（可选）</view>
			<view class="reason-list">
				<view 
					class="reason-item" 
					:class="{ active: selectedReason === index }"
					v-for="(reason, index) in reasons" 
					:key="index"
					@click="selectedReason = index"
				>
					<view class="reason-check" :class="{ active: selectedReason === index }"></view>
					<text class="reason-text">{{ reason }}</text>
				</view>
			</view>
			<view class="feedback-input">
				<textarea 
					class="feedback-textarea" 
					placeholder="其他原因或建议..."
					v-model="feedback"
					maxlength="200"
				></textarea>
				<view class="char-count">{{ feedback.length }}/200</view>
			</view>
		</view>
		
		<view class="warning-section boxBg" v-if="!loading">
			<view class="warning-icon">⚠️</view>
			<view class="warning-text">
				<text class="warning-title">重要提醒</text>
				<text class="warning-desc">• 退订成功后，之后不再扣费</text>
				<text class="warning-desc">• 已开通会员权益将在到期后失效</text>
			</view>
		</view>
		
		<view class="button-section" v-if="!loading">
			<view class="cancel-button" @click="handleCancel">取消</view>
			<view class="confirm-button" @click="handleConfirm">确认退订</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref, computed } from 'vue'
	import { onShow } from '@dcloudio/uni-app'
	import { hasValidToken } from '@/utils/request.js'
	import { useVipInfo } from '@/utils/user/useVipInfo.js'

	const selectedReason = ref(-1)
	const feedback = ref('')
	const loading = ref(true)

	const { userVipInfo, getVipInfo } = useVipInfo()

	const isVipActive = computed(() => userVipInfo.value.ifVip)
	const vipDetail = computed(() => userVipInfo.value.vipDetail)

	const memberName = computed(() => {
		return vipDetail.value?.planName || vipDetail.value?.model || '尊贵会员'
	})

	const expireDate = computed(() => vipDetail.value?.expireDate || '--')

	const remainingText = computed(() => {
		const detail = vipDetail.value
		if (detail?.formatTime && detail.formatTime !== '已过期') {
			return `剩余 ${detail.formatTime}`
		}
		if (detail?.remainingDays > 0) return `剩余 ${detail.remainingDays}天`
		return '--'
	})

	const reasons = [
		'价格太高',
		'功能用不上',
		'使用体验不好',
		'有其他替代产品',
		'暂时不需要了',
		'其他原因'
	]

	const loadVipInfo = async () => {
		loading.value = true
		if (!hasValidToken() || !uni.getStorageSync('userIdStorage')) {
			userVipInfo.value = { ifVip: false, vipDetail: null }
			loading.value = false
			return
		}
		try {
			await getVipInfo()
		} catch (err) {
			console.warn('[cancel loadVipInfo]', err)
			userVipInfo.value = { ifVip: false, vipDetail: null }
		} finally {
			loading.value = false
		}
	}

	onShow(() => {
		loadVipInfo()
	})

	const handleCancel = () => {
		uni.navigateBack()
	}

	const handleConfirm = () => {
		uni.showModal({
			title: '确认退订',
			content: '确定办理退订吗？',
			success: (res) => {
				if (!res.confirm) return
				uni.showToast({
					title: '退订成功，之后不再扣费',
					icon: 'success',
					duration: 2500
				})
				setTimeout(() => {
					uni.navigateBack({
						fail: () => uni.switchTab({ url: '/pages/my/index' })
					})
				}, 2000)
			}
		})
	}
</script>

<style lang="scss">
	.cancel-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
		padding: 30rpx;
		padding-bottom: 180rpx;
	}

	.header {
		text-align: center;
		padding: 40rpx 0 50rpx;

		.title {
			font-size: 48rpx;
			font-weight: bold;
			color: var(--text-primary);
			margin-bottom: 15rpx;
		}

		.subtitle {
			font-size: 28rpx;
			color: var(--text-subtle);
		}
	}

	.boxBg {
		background: rgba(0, 0, 0, 0.4);
		border-radius: 20rpx;
		margin-bottom: 30rpx;
	}

	.info-section {
		padding: 35rpx;

		.info-loading {
			display: block;
			text-align: center;
			font-size: 28rpx;
			color: var(--text-subtle);
			padding: 20rpx 0;
		}

		&.non-member {
			display: flex;
			flex-direction: column;
			align-items: center;
			text-align: center;
			padding: 50rpx 35rpx;

			.non-member-icon {
				font-size: 64rpx;
				margin-bottom: 20rpx;
			}

			.non-member-title {
				font-size: 32rpx;
				font-weight: bold;
				color: var(--text-primary);
				margin-bottom: 16rpx;
			}

			.non-member-desc {
				font-size: 26rpx;
				color: var(--text-subtle);
				line-height: 1.6;
			}
		}

		.info-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 20rpx 0;

			&:not(:last-child) {
				border-bottom: 1rpx solid var(--border-color);
			}

			.info-label {
				font-size: 28rpx;
				color: var(--text-secondary);
			}

			.info-value {
				font-size: 28rpx;
				color: var(--text-primary);

				&.highlight {
					color: #ffd700;
					font-weight: bold;
				}
			}
		}
	}

	.survey-section {
		padding: 35rpx;

		.survey-title {
			font-size: 32rpx;
			font-weight: bold;
			color: var(--text-primary);
			margin-bottom: 25rpx;
		}

		.reason-list {
			display: flex;
			flex-wrap: wrap;
			gap: 15rpx;
			margin-bottom: 30rpx;

			.reason-item {
				display: flex;
				align-items: center;
				padding: 15rpx 25rpx;
				background: var(--surface-bg-light);
				border-radius: 30rpx;
				border: 2rpx solid transparent;
				transition: all 0.3s ease;

				&.active {
					background: rgba(79, 172, 254, 0.15);
					border-color: #4facfe;
				}

				.reason-check {
					width: 28rpx;
					height: 28rpx;
					border: 2rpx solid rgba(255, 255, 255, 0.3);
					border-radius: 50%;
					margin-right: 12rpx;
					transition: all 0.3s ease;

					&.active {
						background: #4facfe;
						border-color: #4facfe;
						position: relative;

						&::after {
							content: '';
							position: absolute;
							left: 50%;
							top: 50%;
							transform: translate(-50%, -50%) rotate(45deg);
							width: 8rpx;
							height: 14rpx;
							border: 2rpx solid #ffffff;
							border-top: none;
							border-left: none;
						}
					}
				}

				.reason-text {
					font-size: 24rpx;
					color: var(--text-dim);
				}
			}
		}

		.feedback-input {
			position: relative;

			.feedback-textarea {
				width: 100%;
				min-height: 160rpx;
				background: var(--surface-bg-light);
				border-radius: 16rpx;
				padding: 25rpx;
				font-size: 26rpx;
				color: var(--text-primary);
				box-sizing: border-box;

				&::placeholder {
					color: var(--text-faint);
				}
			}

			.char-count {
				position: absolute;
				right: 20rpx;
				bottom: 20rpx;
				font-size: 22rpx;
				color: var(--text-faint);
			}
		}
	}

	.warning-section {
		padding: 35rpx;
		background: rgba(255, 100, 100, 0.1);
		border: 2rpx solid rgba(255, 100, 100, 0.2);
		display: flex;

		.warning-icon {
			font-size: 44rpx;
			margin-right: 20rpx;
			margin-top: 5rpx;
		}

		.warning-text {
			flex: 1;
			display: flex;
			flex-direction: column;

			.warning-title {
				font-size: 30rpx;
				font-weight: bold;
				color: #ff6b6b;
				margin-bottom: 15rpx;
			}

			.warning-desc {
				font-size: 24rpx;
				color: var(--text-secondary);
				margin-bottom: 10rpx;
			}
		}
	}

	.button-section {
		display: flex;
		gap: 20rpx;
		margin-top: 40rpx;

		.cancel-button {
			flex: 1;
			text-align: center;
			padding: 30rpx;
			background: var(--surface-bg);
			border-radius: 50rpx;
			font-size: 30rpx;
			color: var(--text-primary);
		}

		.confirm-button {
			flex: 1;
			text-align: center;
			padding: 30rpx;
			background: linear-gradient(to right, #ff6b6b, #ff8e53);
			border-radius: 50rpx;
			font-size: 30rpx;
			font-weight: bold;
			color: var(--text-primary);
			box-shadow: 0 8rpx 30rpx rgba(255, 107, 107, 0.3);

			&.disabled {
				background: rgba(255, 255, 255, 0.15);
				color: var(--text-faint);
				box-shadow: none;
			}
		}
	}
</style>