<template>
	<dark-page-meta />
	<view class="sub-page">
		<view class="contact-content">
			<view class="contact-title">
				<text class="title-icon">📞</text>
				<text class="title-text">联系客服</text>
			</view>
			
			<view class="contact-methods">
				<view class="contact-item boxBg">
					<view class="contact-icon">✉️</view>
					<view class="contact-info">
						<text class="contact-label">邮箱</text>
						<text class="contact-value">support@phototool.com</text>
					</view>
				</view>
				
				<view class="contact-item boxBg">
					<view class="contact-icon">💬</view>
					<view class="contact-info">
						<text class="contact-label">在线客服</text>
						<text class="contact-value">工作时间：9:00-21:00</text>
					</view>
				</view>
				
				<view class="contact-item boxBg">
					<view class="contact-icon">📱</view>
					<view class="contact-info">
						<text class="contact-label">官方微信</text>
						<text class="contact-value">PhotoTool_Official</text>
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
	import { ref } from 'vue'

	const feedbackContent = ref('')

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
		background: linear-gradient(to bottom, #050d40, #233968);
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
			color: #ffffff;
		}
	}

	.contact-methods {
		display: flex;
		flex-direction: column;
		gap: 15rpx;
	}

	.contact-item {
		display: flex;
		align-items: center;
		padding: 25rpx;
		border-radius: 16rpx;
		
		.contact-icon {
			font-size: 40rpx;
			margin-right: 20rpx;
			width: 60rpx;
			text-align: center;
		}
		
		.contact-info {
			display: flex;
			flex-direction: column;
			
			.contact-label {
				font-size: 24rpx;
				color: rgba(255, 255, 255, 0.5);
				margin-bottom: 5rpx;
			}
			
			.contact-value {
				font-size: 28rpx;
				color: #ffffff;
			}
		}
	}

	.feedback-box {
		padding: 30rpx;
		border-radius: 16rpx;
		
		.feedback-title {
			font-size: 32rpx;
			font-weight: bold;
			color: #ffffff;
			margin-bottom: 20rpx;
			display: block;
		}
		
		.feedback-input {
			width: 100%;
			height: 200rpx;
			background: rgba(255, 255, 255, 0.1);
			border-radius: 12rpx;
			padding: 20rpx;
			font-size: 28rpx;
			color: #ffffff;
			margin-bottom: 20rpx;
			box-sizing: border-box;
		}
		
		.feedback-placeholder {
			color: rgba(255, 255, 255, 0.3);
		}
		
		.feedback-btn {
			background: linear-gradient(to right, #4facfe, #00f2fe);
			padding: 25rpx;
			border-radius: 12rpx;
			text-align: center;
			
			text {
				font-size: 30rpx;
				color: #ffffff;
				font-weight: 500;
			}
		}
	}
</style>