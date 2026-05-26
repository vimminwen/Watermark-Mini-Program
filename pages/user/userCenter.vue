<template>
	<dark-page-meta />
	<view class="edit-profile-page">
		<view class="header">
			<view class="avatar-section">
				<image class="avatar" :src="userInfo.avatar || '/static/logo.png'" mode="aspectFit"></image>
				<view class="upload-btn">
					<text>更换头像</text>
				</view>
			</view>
		</view>
		
		<view class="form-section boxBg">
			<view class="form-item">
				<text class="form-label">昵称</text>
				<input 
					class="form-input" 
					v-model="userInfo.nickname" 
					placeholder="请输入昵称"
				/>
			</view>
			<view class="form-item">
				<text class="form-label">手机号</text>
				<text class="form-value">{{ userInfo.phone }}</text>
				<text class="form-tip">已绑定</text>
			</view>
			<view class="form-item">
				<text class="form-label">会员等级</text>
				<text class="form-value">{{ userInfo.level || '普通用户' }}</text>
			</view>
			<view class="form-item">
				<text class="form-label">会员到期</text>
				<text class="form-value">{{ userInfo.expireDate || '未开通' }}</text>
			</view>
			<view class="form-item" @click="goToModifyPassword">
				<text class="form-label">修改密码</text>
				<text class="form-arrow">›</text>
			</view>
		</view>
		
		<view class="save-section">
			<view class="save-btn" @click="handleSave">保存修改</view>
		</view>
		
		<view class="logout-section">
			<view class="logout-btn" @click="handleLogout">退出登录</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'

	const userInfo = ref({
		id: '',
		phone: '',
		nickname: '游客',
		avatar: '/static/logo.png',
		level: '',
		expireDate: ''
	})

	onLoad(() => {
		const stored = uni.getStorageSync('userInfo')
		if (stored) {
			userInfo.value = stored
		}
	})

	const handleSave = () => {
		uni.setStorageSync('userInfo', userInfo.value)
		uni.showToast({ title: '保存成功', icon: 'success' })
	}

	const goToModifyPassword = () => {
		uni.navigateTo({
			url: '/pages/user/modifyPassword'
		})
	}

	const handleLogout = () => {
		uni.showModal({
			title: '确认退出',
			content: '确定要退出登录吗？',
			success: (res) => {
				if (res.confirm) {
					uni.removeStorageSync('token')
					uni.removeStorageSync('userInfo')
					uni.showToast({ title: '已退出登录', icon: 'none' })
					setTimeout(() => {
						uni.navigateBack()
					}, 1500)
				}
			}
		})
	}
</script>

<style lang="scss">
	.edit-profile-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 30rpx;
		padding-bottom: 100rpx;
	}

	.header {
		display: flex;
		justify-content: center;
		padding: 60rpx 0;

		.avatar-section {
			display: flex;
			flex-direction: column;
			align-items: center;

			.avatar {
				width: 200rpx;
				height: 200rpx;
				border-radius: 100rpx;
				background: rgba(255, 255, 255, 0.1);
				margin-bottom: 25rpx;
			}

			.upload-btn {
				padding: 15rpx 40rpx;
				background: rgba(79, 172, 254, 0.2);
				border-radius: 30rpx;

				text {
					font-size: 26rpx;
					color: #4facfe;
				}
			}
		}
	}

	.form-section {
		border-radius: 20rpx;
		padding: 20rpx 30rpx;
		margin-bottom: 30rpx;

		.form-item {
			display: flex;
			align-items: center;
			padding: 30rpx 0;

			&:not(:last-child) {
				border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
			}

			.form-label {
				font-size: 30rpx;
				color: rgba(255, 255, 255, 0.7);
				width: 150rpx;
			}

			.form-input {
				flex: 1;
				font-size: 30rpx;
				color: #ffffff;
				text-align: right;

				&::placeholder {
					color: rgba(255, 255, 255, 0.4);
				}
			}

			.form-value {
				flex: 1;
				font-size: 30rpx;
				color: #ffffff;
				text-align: right;
			}

			.form-tip {
				font-size: 24rpx;
				color: #4facfe;
				margin-left: 20rpx;
			}
		.form-arrow {
				font-size: 32rpx;
				color: rgba(255, 255, 255, 0.4);
			}
		}
	}

	.save-section {
		margin-top: 40rpx;

		.save-btn {
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

	.logout-section {
		margin-top: 60rpx;

		.logout-btn {
			text-align: center;
			padding: 30rpx;
			background: rgba(255, 100, 100, 0.1);
			border: 2rpx solid rgba(255, 100, 100, 0.3);
			border-radius: 50rpx;

			text {
				font-size: 30rpx;
				color: #ff6b6b;
			}
		}
	}

	.boxBg {
		background: rgba(0, 0, 0, 0.4);
	}
</style>
