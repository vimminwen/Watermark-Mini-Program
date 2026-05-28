<template>
	<dark-page-meta />
	<view class="edit-profile-page">
		<view v-if="!isLoggedIn" class="login-empty boxBg">
			<text class="empty-text">请先登录后查看个人资料</text>
			<button class="empty-btn" hover-class="empty-btn-hover" @tap="goToLogin">去登录</button>
		</view>

		<block v-else>
		<view class="header">
			<view class="avatar-section">
				<image class="avatar" :src="userInfo.avatar || '/static/logo.png'" mode="aspectFit"></image>
				<view
					class="upload-btn"
					:class="{ disabled: avatarUploading }"
					@click="handleChooseAvatar"
				>
					<text>{{ avatarUploading ? '上传中...' : '更换头像' }}</text>
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
				<text class="form-label">邮箱</text>
				<input
					class="form-input"
					v-model="userInfo.email"
					placeholder="请输入邮箱（选填）"
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
			<view class="form-item form-item-link" @click="goToModifyPassword">
				<text class="form-label">{{ userInfo.hasPassword ? '修改密码' : '设置密码' }}</text>
				<text class="iconfont icon-xiangyou"></text>
			</view>
		</view>
		
		<view class="save-section">
			<view class="save-btn" :class="{ disabled: saving }" @click="handleSave">
				<text>{{ saving ? '保存中...' : '保存修改' }}</text>
			</view>
		</view>
		
		<view class="logout-section">
			<view class="logout-btn" @click="handleLogout">退出登录</view>
		</view>
		</block>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref } from 'vue'
	import { onShow } from '@dcloudio/uni-app'
	import { apiGetUserInfo, apiModifyUserInfo } from '@/api/api.js'
	import { isApiSuccess } from '@/utils/user/authHelper.js'
	import { clearAuthSession, getApiMessage } from '@/utils/user/session.js'
	import { resolveHasPassword } from '@/utils/user/passwordStatus.js'
	import { hasValidToken, isSilentErrorMessage } from '@/utils/request.js'
	import { uploadImageToOss } from '@/utils/image/ossUpload.js'
	import { pickLocalImage, handlePickLocalImageError } from '@/utils/image/pickLocalImage.js'

	const loading = ref(false)
	const saving = ref(false)
	const avatarUploading = ref(false)
	const isLoggedIn = ref(true)
	const serverImage = ref('')

	const userInfo = ref({
		id: '',
		phone: '',
		nickname: '游客',
		email: '',
		avatar: '/static/logo.png',
		level: '普通用户',
		expireDate: '未开通',
		hasPassword: false
	})

	const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`)

	const formatExpireDate = (value) => {
		if (!value) return '未开通'
		let str = String(value).trim()
		if (/\+0000$/.test(str)) {
			str = str.replace(/\+0000$/, 'Z')
		} else {
			str = str.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
		}
		const date = new Date(str)
		if (Number.isNaN(date.getTime())) return '未开通'
		return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
	}

	const pickUserFromBody = (body) => {
		if (!body || typeof body !== 'object') return null
		const data = body.data
		if (data && typeof data === 'object' && !Array.isArray(data)) {
			if (data.id != null || data.userId != null || data.phone != null || data.nickname != null) {
				return data
			}
		}
		if (body.id != null || body.userId != null || body.phone != null || body.nickname != null) {
			return body
		}
		return null
	}

	const mapUserFromApi = (user, prev = {}) => {
		const image = user.image ?? user.avatar ?? prev.avatar ?? '/static/logo.png'
		if (typeof image === 'string' && /^https?:\/\//.test(image)) {
			serverImage.value = image
		}
		return {
			id: String(user.id ?? user.userId ?? prev.id ?? ''),
			phone: user.phone ?? prev.phone ?? '',
			nickname: user.nickname ?? prev.nickname ?? '云途汇水印用户',
			email: user.email ?? prev.email ?? '',
			avatar: image,
			level: user.level ?? user.vipType ?? user.type ?? prev.level ?? '普通用户',
			expireDate: formatExpireDate(user.expirationTime ?? user.expireDate) || prev.expireDate || '未开通',
			useCount: Number(user.num) || prev.useCount || 0,
			hasPassword: resolveHasPassword(user, resolveHasPassword(prev, false))
		}
	}

	const loadLocalUserInfo = () => {
		const stored = uni.getStorageSync('userInfo')
		const serverStored = uni.getStorageSync('userInfoStorage')
		if (stored && typeof stored === 'object') {
			userInfo.value = {
				...userInfo.value,
				...stored,
				hasPassword: resolveHasPassword(serverStored, resolveHasPassword(stored, false))
			}
		}
	}

	const loadUserInfo = async () => {
		const userId = uni.getStorageSync('userIdStorage')
		if (!hasValidToken() || !userId) {
			isLoggedIn.value = false
			return
		}

		isLoggedIn.value = true
		loadLocalUserInfo()

		loading.value = true
		try {
			const res = await apiGetUserInfo(userId)
			const body = res?.data
			const user = pickUserFromBody(body)

			if (user) {
				userInfo.value = mapUserFromApi(user, userInfo.value)
				uni.setStorageSync('userInfo', userInfo.value)
				uni.setStorageSync('userInfoStorage', user)
				return
			}

			if (!isApiSuccess(body)) {
				const msg = getApiMessage(body, '获取用户信息失败')
				if (isSilentErrorMessage(msg)) {
					console.warn('[loadUserInfo]', msg, body)
				} else {
					uni.showToast({ title: msg, icon: 'none' })
				}
			}
		} catch (err) {
			const msg = err?.message || getApiMessage(err?.data, '加载失败，请稍后重试')
			if (isSilentErrorMessage(msg)) {
				console.warn('[loadUserInfo]', msg, err)
			} else {
				console.error('[loadUserInfo]', err)
				uni.showToast({ title: msg, icon: 'none' })
			}
		} finally {
			loading.value = false
		}
	}

	onShow(() => {
		loadUserInfo()
	})

	const goToLogin = () => {
		uni.redirectTo({
			url: '/pages/user/login',
			fail: () => {
				uni.reLaunch({ url: '/pages/user/login' })
			}
		})
	}

	const handleSave = async () => {
		if (saving.value) return

		const userId = uni.getStorageSync('userIdStorage')
		if (!hasValidToken() || !userId) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			return
		}

		const nickname = userInfo.value.nickname?.trim()
		if (!nickname) {
			uni.showToast({ title: '昵称不能为空', icon: 'none' })
			return
		}

		const email = userInfo.value.email?.trim() || ''
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			uni.showToast({ title: '邮箱格式不正确', icon: 'none' })
			return
		}

		const image = resolveImageForSave()

		saving.value = true
		uni.showLoading({ title: '保存中...', mask: true })
		try {
			const res = await apiModifyUserInfo({
				id: userId,
				nickname,
				email,
				image
			})
			const body = res?.data
			if (!isApiSuccess(body)) {
				uni.showToast({ title: getApiMessage(body, '保存失败'), icon: 'none' })
				return
			}

			await loadUserInfo()
			uni.showToast({ title: '保存成功', icon: 'success' })
		} catch (err) {
			console.error('[handleSave]', err)
			uni.showToast({
				title: err?.message || getApiMessage(err?.data, '保存失败，请稍后重试'),
				icon: 'none'
			})
		} finally {
			saving.value = false
			uni.hideLoading()
		}
	}

	const resolveImageForSave = () => {
		const avatar = String(userInfo.value.avatar || '').trim()
		if (/^https?:\/\//i.test(avatar)) return avatar
		return String(serverImage.value || '').trim()
	}

	const saveAvatarToServer = async (imageUrl) => {
		const userId = uni.getStorageSync('userIdStorage')
		if (!userId || !imageUrl) return false

		const res = await apiModifyUserInfo({
			id: userId,
			nickname: userInfo.value.nickname?.trim() || '云途汇水印用户',
			email: userInfo.value.email?.trim() || '',
			image: imageUrl
		})
		const body = res?.data
		if (!isApiSuccess(body)) {
			uni.showToast({ title: getApiMessage(body, '头像保存失败'), icon: 'none' })
			return false
		}
		await loadUserInfo()
		return true
	}

	const handleChooseAvatar = async () => {
		if (avatarUploading.value || saving.value) return

		try {
			const picked = await pickLocalImage({ maxSize: 5 * 1024 * 1024 })
			avatarUploading.value = true
			uni.showLoading({ title: '上传头像中...', mask: true })

			const ossUrl = await uploadImageToOss(picked.path)
			userInfo.value.avatar = ossUrl
			serverImage.value = ossUrl

			uni.showLoading({ title: '保存头像中...', mask: true })
			const ok = await saveAvatarToServer(ossUrl)
			if (ok) {
				uni.showToast({ title: '头像已更新', icon: 'success' })
			}
		} catch (err) {
			console.error('[handleChooseAvatar]', err)
			const msg = String(err?.message || err?.errMsg || '')
			if (/cancel|取消/i.test(msg)) return
			if (!avatarUploading.value) {
				handlePickLocalImageError(err)
				return
			}
			uni.showToast({
				title: msg || '头像上传失败，请重试',
				icon: 'none'
			})
		} finally {
			avatarUploading.value = false
			uni.hideLoading()
		}
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
					clearAuthSession()
					uni.showToast({ title: '已退出登录', icon: 'none' })
					setTimeout(() => {
						uni.reLaunch({ url: '/pages/user/login' })
					}, 800)
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

				&.disabled {
					opacity: 0.65;
					pointer-events: none;
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

			.icon-xiangyou {
				font-size: 32rpx;
				color: rgba(255, 255, 255, 0.4);
			}

			&.form-item-link {
				justify-content: space-between;
				width: 100%;
				box-sizing: border-box;

				.form-label {
					width: auto;
					flex-shrink: 0;
				}

				.icon-xiangyou {
					flex-shrink: 0;
					margin-left: auto;
					line-height: 1;
				}
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

			&.disabled {
				opacity: 0.7;
			}

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

	.login-empty {
		margin-top: 120rpx;
		padding: 60rpx 40rpx;
		border-radius: 20rpx;
		display: flex;
		flex-direction: column;
		align-items: center;

		.empty-text {
			font-size: 30rpx;
			color: rgba(255, 255, 255, 0.7);
			margin-bottom: 40rpx;
		}

		.empty-btn {
			padding: 24rpx 80rpx;
			border-radius: 50rpx;
			background: linear-gradient(to right, #4facfe, #00f2fe);
			font-size: 30rpx;
			color: #ffffff;
			font-weight: 600;
			line-height: 1.4;
			border: none;

			&::after {
				border: none;
			}
		}

		.empty-btn-hover {
			opacity: 0.85;
		}
	}
</style>
