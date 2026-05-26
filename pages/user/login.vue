<template>
	<dark-page-meta />
	<view class="login-page">
		<view class="header">
			<view class="logo">🖼️</view>
			<view class="title">图片工具箱</view>
			<view class="subtitle">登录后享受更多服务</view>
		</view>
		
		<view class="login-form">
			<view class="input-group">
				<text class="input-icon">📱</text>
				<input 
					class="input-field" 
					type="number" 
					placeholder="请输入手机号"
					v-model="phone"
					maxlength="11"
				/>
			</view>
			
			<view class="input-group">
				<text class="input-icon">🔐</text>
				<input 
					class="input-field" 
					type="number" 
					placeholder="请输入验证码"
					v-model="code"
					maxlength="6"
				/>
				<view class="send-code" :class="{ disabled: countdown > 0 }" @click="sendCode">
					<text>{{ countdown > 0 ? countdown + 's' : '获取验证码' }}</text>
				</view>
			</view>
			
			<view class="extra-actions">
				<text class="link-text" @click="goToRegister">注册账号</text>
				<text class="link-text" @click="goToForgetPassword">忘记密码？</text>
			</view>
			
			<view class="login-button" @click="handleLogin">
				<text>登录</text>
			</view>
			
			<view class="divider">
				<view class="divider-line"></view>
				<text class="divider-text">登录即表示同意</text>
				<view class="divider-line"></view>
			</view>
			
			<view class="agreement-text">
				<text class="link-text" @click="goToAgreement">《用户协议》</text>
				<text class="link-text" @click="goToPrivacy">《隐私政策》</text>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref } from 'vue'

	const phone = ref('')
	const code = ref('')
	const countdown = ref(0)

	const sendCode = () => {
		if (countdown.value > 0) return
		if (!phone.value || phone.value.length !== 11) {
			uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
			return
		}
		countdown.value = 60
		const timer = setInterval(() => {
			countdown.value--
			if (countdown.value <= 0) {
				clearInterval(timer)
			}
		}, 1000)
		uni.showToast({ title: '验证码已发送', icon: 'none' })
	}

	const handleLogin = () => {
		if (!phone.value) {
			uni.showToast({ title: '请输入手机号', icon: 'none' })
			return
		}
		if (!code.value) {
			uni.showToast({ title: '请输入验证码', icon: 'none' })
			return
		}
		// 模拟登录，保存token
		uni.setStorageSync('token', 'mock_token_' + Date.now())
		uni.setStorageSync('userInfo', {
			id: '10001',
			phone: phone.value,
			nickname: '图片工具箱用户',
			avatar: '/static/logo.png',
			level: '专业版',
			expireDate: '2025-12-31',
			useCount: 12,
			favorites: 5,
			points: 0,
			hasPassword: false
		})
		uni.showToast({ title: '登录成功', icon: 'success' })
		setTimeout(() => {
			uni.navigateBack()
		}, 1500)
	}

	const goToRegister = () => {
		uni.navigateTo({
			url: '/pages/user/register'
		})
	}

	const goToForgetPassword = () => {
		uni.navigateTo({
			url: '/pages/user/forgetPassword'
		})
	}

	const goToAgreement = () => {
		uni.navigateTo({
			url: '/pages/my/agreement'
		})
	}

	const goToPrivacy = () => {
		uni.navigateTo({
			url: '/pages/my/privacy'
		})
	}
</script>

<style lang="scss">
	.login-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 80rpx 60rpx;
	}

	.header {
		text-align: center;
		margin-bottom: 100rpx;

		.logo {
			font-size: 120rpx;
			margin-bottom: 30rpx;
		}

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

	.login-form {
		.input-group {
			display: flex;
			align-items: center;
			background: rgba(255, 255, 255, 0.08);
			border-radius: 16rpx;
			padding: 30rpx;
			margin-bottom: 30rpx;

			.input-icon {
				font-size: 36rpx;
				margin-right: 20rpx;
			}

			.input-field {
				flex: 1;
				font-size: 30rpx;
				color: #ffffff;

				&::placeholder {
					color: rgba(255, 255, 255, 0.4);
				}
			}
		}

		.extra-actions {
			display: flex;
			justify-content: space-between;
			margin-bottom: 60rpx;

			.link-text {
				font-size: 26rpx;
				color: #4facfe;
			}
		}

		.login-button {
			background: linear-gradient(to right, #4facfe, #00f2fe);
			padding: 30rpx;
			border-radius: 50rpx;
			text-align: center;
			margin-bottom: 60rpx;

			text {
				font-size: 32rpx;
				font-weight: bold;
				color: #ffffff;
			}
		}

		.divider {
			display: flex;
			align-items: center;
			margin-bottom: 60rpx;

			.divider-line {
				flex: 1;
				height: 1rpx;
				background: rgba(255, 255, 255, 0.2);
			}

			.divider-text {
				font-size: 24rpx;
				color: rgba(255, 255, 255, 0.5);
				padding: 0 30rpx;
			}
		}

		.third-party {
			display: flex;
			justify-content: center;

			.third-party-btn {
				display: flex;
				flex-direction: column;
				align-items: center;
				padding: 30rpx 80rpx;
				background: rgba(79, 172, 254, 0.1);
				border-radius: 20rpx;
				border: 2rpx solid rgba(79, 172, 254, 0.3);

				.btn-icon {
					font-size: 60rpx;
					margin-bottom: 15rpx;
				}

				.btn-text {
					font-size: 26rpx;
					color: #ffffff;
				}
			}
		}
		.send-code {
			padding: 15rpx 25rpx;
			background: rgba(79, 172, 254, 0.2);
			border-radius: 30rpx;
			font-size: 24rpx;
			color: #4facfe;

			&.disabled {
				color: rgba(255, 255, 255, 0.4);
				background: rgba(255, 255, 255, 0.05);
			}
		}
	}

	.agreement-text {
		display: flex;
		justify-content: center;
		gap: 30rpx;
	}
</style>
