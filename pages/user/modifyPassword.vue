<template>
	<dark-page-meta />
	<view class="modify-password-page">
		<view class="header">
			<view class="title">修改密码</view>
			<view class="subtitle">{{ hasPassword ? '请输入旧密码和新密码' : '请设置您的登录密码' }}</view>
		</view>
		
		<view class="form-section boxBg">
			<view class="form-item" v-if="hasPassword">
				<text class="form-icon">🔐</text>
				<input 
					class="form-input" 
					type="password" 
					v-model="oldPassword" 
					placeholder="请输入旧密码"
				/>
			</view>
			<view class="form-item">
				<text class="form-icon">🔒</text>
				<input 
					class="form-input" 
					type="password" 
					v-model="newPassword" 
					placeholder="请输入新密码（6-20位）"
				/>
			</view>
			<view class="form-item">
				<text class="form-icon">🔒</text>
				<input 
					class="form-input" 
					type="password" 
					v-model="confirmPassword" 
					placeholder="请确认密码"
				/>
			</view>
			<view class="forgot-link" v-if="hasPassword" @click="goToForgetPassword">
				<text>忘记密码？</text>
			</view>
		</view>
		
		<view class="submit-section">
			<view class="submit-btn" @click="handleSubmit">
				<text>{{ hasPassword ? '修改密码' : '设置密码' }}</text>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'

	const hasPassword = ref(true)
	const oldPassword = ref('')
	const newPassword = ref('')
	const confirmPassword = ref('')

	onLoad(() => {
		const userInfo = uni.getStorageSync('userInfo')
		if (userInfo) {
			hasPassword.value = userInfo.hasPassword !== false
		}
	})

	const handleSubmit = () => {
		if (hasPassword.value && !oldPassword.value) {
			uni.showToast({ title: '请输入旧密码', icon: 'none' })
			return
		}
		if (!newPassword.value || newPassword.value.length < 6) {
			uni.showToast({ title: '密码至少6位', icon: 'none' })
			return
		}
		if (newPassword.value !== confirmPassword.value) {
			uni.showToast({ title: '两次密码不一致', icon: 'none' })
			return
		}
		const info = uni.getStorageSync('userInfo') || {}
		info.hasPassword = true
		uni.setStorageSync('userInfo', info)
		uni.showToast({ title: '密码设置成功', icon: 'success' })
		setTimeout(() => {
			uni.navigateBack()
		}, 1500)
	}

	const goToForgetPassword = () => {
		uni.navigateTo({
			url: '/pages/user/forgetPassword'
		})
	}
</script>

<style lang="scss">
	.modify-password-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 80rpx 60rpx;
	}

	.header {
		text-align: center;
		margin-bottom: 60rpx;

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

	.form-section {
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 40rpx;

		.form-item {
			display: flex;
			align-items: center;
			padding: 25rpx 0;

			&:not(:last-child) {
				border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
			}

			.form-icon {
				font-size: 36rpx;
				margin-right: 20rpx;
			}

			.form-input {
				flex: 1;
				font-size: 30rpx;
				color: #ffffff;

				&::placeholder {
					color: rgba(255, 255, 255, 0.4);
				}
			}
		}

		.forgot-link {
			text-align: right;
			margin-top: 20rpx;

			text {
				font-size: 26rpx;
				color: #4facfe;
			}
		}
	}

	.submit-section {
		.submit-btn {
			background: linear-gradient(to right, #4facfe, #00f2fe);
			padding: 30rpx;
			border-radius: 50rpx;
			text-align: center;

			text {
				font-size: 32rpx;
				font-weight: bold;
				color: #ffffff;
			}
		}
	}

	.boxBg {
		background: rgba(0, 0, 0, 0.4);
	}
</style>
