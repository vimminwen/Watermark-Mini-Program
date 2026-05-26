<template>
	<dark-page-meta />
	<view class="tool-page">
		<view class="compare-wrap">
			<ImageCompare
				before-image="/static/images/banner/1.jpg"
				after-image="/static/images/banner/2.jpg"
				height="500rpx"
			/>
		</view>
		<view class="tip">左右拖动中间滑块查看处理前后效果</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
import ImageCompare from '@/components/image/ImageCompare.vue'
</script>

<style lang="scss" scoped>
.tool-page {
	min-height: 100vh;
	padding: 30rpx;
	background: linear-gradient(to bottom, #050d40, #233968);
	box-sizing: border-box;
}

.compare-wrap {
	border-radius: 16rpx;
	overflow: hidden;
}

.tip {
	margin-top: 24rpx;
	font-size: 26rpx;
	color: rgba(255, 255, 255, 0.7);
	text-align: center;
}
</style>
