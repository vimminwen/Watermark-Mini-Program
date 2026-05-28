<template>
	<view class="banner_3d" @touchstart="onTouchStart" @touchend="onTouchEnd">
		<view class="content" :style="{ transform: 'translateZ(-30vw) rotateY(' + rotateY + 'deg)' }">
			<view
				v-for="item in bannerList"
				:key="item.id"
				class="item"
			>
				<image :src="item.img" mode="widthFix"></image>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted,
		onUnmounted
	} from 'vue'
	import bannerData from '@/api/data/banner.json'
	import { navigateByPageUrl } from '@/utils/tool/toolRegistry.js'

	const bannerList = bannerData

	const rotateY = ref(0)
	const touchStartX = ref(0)
	const isAutoPlaying = ref(true)
	let autoPlayTimer = null

	const SWIPE_THRESHOLD = 50

	// 计算当前显示的索引
	const currentIndex = computed(() => {
		if (bannerList.length === 0) return 0
		const step = 360 / bannerList.length
		let index = Math.round(-rotateY.value / step)
		while (index < 0) index += bannerList.length
		return index % bannerList.length
	})

	// 下一张
	const nextSlide = () => {
		if (bannerList.length === 0) return
		const step = 360 / bannerList.length
		rotateY.value -= step
	}

	// 上一张
	const prevSlide = () => {
		if (bannerList.length === 0) return
		const step = 360 / bannerList.length
		rotateY.value += step
	}

	// 开始自动播放
	const startAutoPlay = () => {
		stopAutoPlay()
		if (bannerList.length <= 1) return
		autoPlayTimer = setInterval(() => {
			if (isAutoPlaying.value) {
				nextSlide()
			}
		}, 4000)
	}

	// 停止自动播放
	const stopAutoPlay = () => {
		if (autoPlayTimer) {
			clearInterval(autoPlayTimer)
			autoPlayTimer = null
		}
	}

	const onBannerTap = () => {
		const item = bannerList[currentIndex.value]
		navigateByPageUrl(item?.url)
	}

	// 触摸事件处理
	const onTouchStart = (e) => {
		touchStartX.value = e.touches[0].clientX
		isAutoPlaying.value = false
	}

	const onTouchEnd = (e) => {
		const endX = e.changedTouches?.[0]?.clientX ?? touchStartX.value
		const diff = endX - touchStartX.value

		if (Math.abs(diff) > SWIPE_THRESHOLD) {
			if (diff > 0) {
				prevSlide()
			} else {
				nextSlide()
			}
		} else {
			onBannerTap()
		}

		setTimeout(() => {
			isAutoPlaying.value = true
		}, 1000)
	}

	onMounted(() => {
		startAutoPlay()
	})

	onUnmounted(() => {
		stopAutoPlay()
	})
</script>

<style lang="scss" scoped>
	.banner_3d {
		width: 100%;
		height: 350rpx;
		perspective: 2000rpx;
		transform-origin: center;
		position: relative;
		overflow: hidden;
		animation: fadeIn 0.6s ease forwards;

		.content {
			display: flex;
			justify-content: center;
			align-items: center;
			position: absolute;
			width: 100%;
			height: 100%;
			transform-origin: center;
			transform-style: preserve-3d;
			transition: transform 0.5s ease;
		}

		.item {
			width: 60%;
			height: 80%;
			position: absolute;
			box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
			background-size: cover;
			-webkit-box-reflect: below 0rpx -webkit-linear-gradient(transparent 50%, #ffffff64);
			transition: transform 0.3s ease;

			image {
				width: 100%;
				height: 100%;
				border-radius: 12rpx;
			}
		}
	}

	// 动态生成每个item的transform
	.banner_3d .item:nth-child(1) {
		transform: rotateY(0) translateZ(45vw);
	}

	.banner_3d .item:nth-child(2) {
		transform: rotateY(120deg) translateZ(45vw);
	}

	.banner_3d .item:nth-child(3) {
		transform: rotateY(240deg) translateZ(45vw);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20rpx);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>