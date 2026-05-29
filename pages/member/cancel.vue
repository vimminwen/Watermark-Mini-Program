<template>
	<dark-page-meta />
	<view class="cancel-page">
		<view class="header">
			<view class="subtitle">我们很遗憾您要离开</view>
		</view>
		
		<view class="info-section boxBg" v-if="loading">
			<text class="info-loading">会员信息加载中…</text>
		</view>

		<view class="info-section boxBg non-member" v-else-if="!isVipActive">
			<text class="non-member-icon">ℹ️</text>
			<text class="non-member-title">{{ notMemberTitle }}</text>
			<text class="non-member-desc">{{ notMemberDesc }}</text>
			<view class="non-member-btn" v-if="!isLoggedIn" @click="goLogin">去登录</view>
			<view class="non-member-btn" v-else @click="goRecharge">开通会员</view>
		</view>

		<view class="info-section boxBg" v-else>
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
		
		<view class="survey-section boxBg" v-if="isVipActive && !loading">
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
		
		<view class="warning-section boxBg" v-if="isVipActive && !loading">
			<view class="warning-icon">⚠️</view>
			<view class="warning-text">
				<text class="warning-title">重要提醒</text>
				<text class="warning-desc">• 退订后会员权益将在到期后失效</text>
				<text class="warning-desc">• 已支付费用将按比例退还</text>
				<text class="warning-desc">• 云端存储数据将保留30天</text>
			</view>
		</view>
		
		<view class="button-section">
			<view class="cancel-button" @click="handleCancel">{{ isVipActive ? '取消' : '返回' }}</view>
			<view
				class="confirm-button"
				:class="{ disabled: !canConfirmCancel }"
				v-if="isVipActive && !loading"
				@click="handleConfirm"
			>确认退订</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed } from 'vue'
	import { onShow } from '@dcloudio/uni-app'
	import { hasValidToken } from '@/utils/request.js'
	import { useVipInfo } from '@/utils/user/useVipInfo.js'

	const selectedReason = ref(-1)
	const feedback = ref('')
	const loading = ref(true)
	const isLoggedIn = ref(false)

	const { userVipInfo, getVipInfo } = useVipInfo()

	const isVipActive = computed(() => userVipInfo.value.ifVip)
	const vipDetail = computed(() => userVipInfo.value.vipDetail)
	const canConfirmCancel = computed(() => isLoggedIn.value && isVipActive.value && !loading.value)

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

	const notMemberTitle = computed(() => {
		if (!isLoggedIn.value) return '请先登录'
		return '您当前不是会员'
	})

	const notMemberDesc = computed(() => {
		if (!isLoggedIn.value) return '登录后可查看会员状态并办理退订'
		return '尚未开通或会员已过期，无需退订'
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
			isLoggedIn.value = false
			userVipInfo.value = { ifVip: false, vipDetail: null }
			loading.value = false
			return
		}
		isLoggedIn.value = true
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

	const goLogin = () => {
		uni.navigateTo({ url: '/pages/user/login' })
	}

	const goRecharge = () => {
		uni.navigateTo({ url: '/pages/member/recharge' })
	}

	const handleCancel = () => {
		uni.navigateBack()
	}

	const handleConfirm = () => {
		if (!canConfirmCancel.value) {
			uni.showToast({
				title: isLoggedIn.value ? '您当前不是会员，无法退订' : '请先登录',
				icon: 'none'
			})
			return
		}
		uni.showModal({
			title: '确认退订',
			content: '您确定要退订会员吗？',
			success: (res) => {
				if (res.confirm) {
					uni.showToast({
						title: '退订功能开发中',
						icon: 'none'
					})
				}
			}
		})
	}
</script>

<style lang="scss">
	.cancel-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 30rpx;
		padding-bottom: 180rpx;
	}

	.header {
		text-align: center;
		padding: 40rpx 0 50rpx;

		.title {
			font-size: 48rpx;
			font-weight: bold;
			color: #ffffff;
			margin-bottom: 15rpx;
		}

		.subtitle {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.6);
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
			color: rgba(255, 255, 255, 0.6);
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
				color: #ffffff;
				margin-bottom: 16rpx;
			}

			.non-member-desc {
				font-size: 26rpx;
				color: rgba(255, 255, 255, 0.65);
				line-height: 1.6;
				margin-bottom: 30rpx;
			}

			.non-member-btn {
				padding: 18rpx 48rpx;
				background: linear-gradient(to right, #4facfe, #00f2fe);
				border-radius: 40rpx;
				font-size: 28rpx;
				color: #ffffff;
			}
		}

		.info-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 20rpx 0;

			&:not(:last-child) {
				border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
			}

			.info-label {
				font-size: 28rpx;
				color: rgba(255, 255, 255, 0.7);
			}

			.info-value {
				font-size: 28rpx;
				color: #ffffff;

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
			color: #ffffff;
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
				background: rgba(255, 255, 255, 0.05);
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
					color: rgba(255, 255, 255, 0.9);
				}
			}
		}

		.feedback-input {
			position: relative;

			.feedback-textarea {
				width: 100%;
				min-height: 160rpx;
				background: rgba(255, 255, 255, 0.05);
				border-radius: 16rpx;
				padding: 25rpx;
				font-size: 26rpx;
				color: #ffffff;
				box-sizing: border-box;

				&::placeholder {
					color: rgba(255, 255, 255, 0.4);
				}
			}

			.char-count {
				position: absolute;
				right: 20rpx;
				bottom: 20rpx;
				font-size: 22rpx;
				color: rgba(255, 255, 255, 0.4);
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
				color: rgba(255, 255, 255, 0.7);
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
			background: rgba(255, 255, 255, 0.1);
			border-radius: 50rpx;
			font-size: 30rpx;
			color: #ffffff;
		}

		.confirm-button {
			flex: 1;
			text-align: center;
			padding: 30rpx;
			background: linear-gradient(to right, #ff6b6b, #ff8e53);
			border-radius: 50rpx;
			font-size: 30rpx;
			font-weight: bold;
			color: #ffffff;
			box-shadow: 0 8rpx 30rpx rgba(255, 107, 107, 0.3);

			&.disabled {
				background: rgba(255, 255, 255, 0.15);
				color: rgba(255, 255, 255, 0.4);
				box-shadow: none;
			}
		}
	}
</style>