<template>
	<dark-page-meta />
	<view class="sub-page" :class="themeClass">
		<view class="faq-content">
			<view class="faq-item boxBg" v-for="(item, index) in faqList" :key="index">
				<view class="faq-question" @click="toggleFaq(index)">
					<text class="question-icon">{{ item.icon }}</text>
					<text class="question-text">{{ item.question }}</text>
					<text class="question-arrow" :class="{ expanded: expandedIndex === index }">▼</text>
				</view>
				<view class="faq-answer" v-show="expandedIndex === index">
					<text class="answer-text">{{ item.answer }}</text>
				</view>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref } from 'vue'

	const expandedIndex = ref(-1)

	const faqList = [
		{
			icon: '❓',
			question: '如何使用汇水印？',
			answer: '在首页或功能页面选择您需要的图片处理工具，点击进入后按照提示上传图片并进行相应的处理操作。'
		},
		{
			icon: '',
			question: '处理后的图片如何保存？',
			answer: '处理完成后，页面会显示处理后的图片，点击保存按钮即可将图片保存到您的设备相册中。'
		},
		// {
		// 	icon: '',
		// 	question: '支持哪些图片格式？',
		// 	answer: '我们支持 JPG、PNG、WebP、BMP、GIF 等多种常见图片格式的处理。'
		// },
		{
			icon: '',
			question: '我的图片会被上传到服务器吗？',
			answer: '不会。所有图片处理都在您的设备本地完成，不会上传到服务器，保护您的隐私安全。'
		},
		{
			icon: '',
			question: '如何清除缓存？',
			answer: '在设置页面点击"清除缓存"按钮即可清除应用缓存。建议定期清理以释放存储空间。'
		}
	]

	const toggleFaq = (index) => {
		expandedIndex.value = expandedIndex.value === index ? -1 : index
	}
</script>

<style lang="scss">
	.sub-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
		padding: 30rpx;
		padding-bottom: 120rpx;
	}

	.faq-content {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.faq-item {
		border-radius: 16rpx;
		overflow: hidden;
	}

	.faq-question {
		display: flex;
		align-items: center;
		padding: 25rpx;
		transition: all 0.3s ease;
		
		&:active {
			background: var(--surface-bg);
		}
		
		.question-icon {
			font-size: 32rpx;
			margin-right: 15rpx;
		}
		
		.question-text {
			flex: 1;
			font-size: 28rpx;
			color: var(--text-primary);
		}
		
		.question-arrow {
			font-size: 20rpx;
			color: var(--text-muted);
			transition: transform 0.3s ease;
			transform: rotate(0deg);
			
			&.expanded {
				transform: rotate(180deg);
			}
		}
	}

	.faq-answer {
		padding: 0 25rpx 25rpx;
		animation: slideDown 0.3s ease;
		
		.answer-text {
			font-size: 26rpx;
			color: var(--text-soft);
			line-height: 1.6;
		}
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10rpx);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>