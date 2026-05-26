<template>
	<dark-page-meta />
	<view class="use-page">
		<view class="liBox">
			<navigator :url="item.url+'?title='+item.title" class="navBox boxBg" v-for="item in navList" :key="item.id">
				<view class="imgBox">
					<image :src="item.img" mode=""></image>
				</view>
				<view class="right">
					<view class="title">{{item.title}}</view>
					<view class="content">{{item.content}}</view>
				</view>
			</navigator>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import {
		ref,
		onMounted
	} from 'vue'
	import dataList from '@/api/data/list.json'

	const navList = ref([])
	const resNum = ref("")

	onMounted(() => {
		navList.value = dataList
		ifNavGo()
		const pages = getCurrentPages()
		const currentPage = pages[pages.length - 1]
		const options = currentPage.options || {}
		uni.setStorageSync("pageId", options.id)
		resNum.value = uni.getStorageSync("readNum") || ""
	})

	const ifNavGo = () => {
		let a = uni.getStorageSync("bnav")
		uni.setStorageSync("ifNavGo", a.id)
	}
</script>

<style lang="scss">
	.use-page {
		min-height: 100vh;
		padding-bottom: 120rpx;
		background: linear-gradient(to bottom, #050d40, #233968);
	}

	.liBox {
		width: 100%;
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		padding: 0 20rpx;
		box-sizing: border-box;
	}

	.navBox {
		display: flex;
		align-items: center;
		justify-content: left;
		text-align: center;
		margin: 20rpx 15rpx 15rpx 0;
		width: calc((100% - 15rpx) / 2);
		min-width: calc((100% - 15rpx) / 2);
		max-width: calc((100% - 15rpx) / 2);
		padding: 30rpx 20rpx;
		box-sizing: border-box;
		border-radius: 20rpx;
		border: 2rpx rgba(255, 255, 255, 0.2) solid;
		transition: all 0.3s ease;
		animation: fadeIn 0.5s ease forwards;
		opacity: 0;

		&:nth-child(1) {
			animation-delay: 0.05s;
		}

		&:nth-child(2) {
			animation-delay: 0.1s;
		}

		&:nth-child(3) {
			animation-delay: 0.15s;
		}

		&:nth-child(4) {
			animation-delay: 0.2s;
		}

		&:nth-child(5) {
			animation-delay: 0.25s;
		}

		&:nth-child(6) {
			animation-delay: 0.3s;
		}

		&:nth-child(7) {
			animation-delay: 0.35s;
		}

		&:nth-child(8) {
			animation-delay: 0.4s;
		}

		&:nth-child(2n) {
			margin-right: 0;
		}

		&:active {
			transform: scale(0.98);
		}

		.imgBox {
			width: 30%;

			image {
				width: 80rpx;
				height: 80rpx;
				margin: 0 20rpx 10rpx 0;
				transition: transform 0.3s ease;
			}
		}

		.right {
			width: 70%;
			display: flex;
			align-items: center;
			justify-content: left;
			flex-wrap: wrap;
			text-align: left;

			.title {
				width: 100%;
				font-size: 30rpx;
				font-weight: 600;
				padding: 5rpx 0;
				color: #ffffff;
				white-space: nowrap;
				text-overflow: ellipsis;
				overflow: hidden;
			}

			.content {
				width: 100%;
				font-size: 26rpx;
				padding: 5rpx 0;
				color: rgba(255, 255, 255, 0.7);
				white-space: nowrap;
				text-overflow: ellipsis;
				overflow: hidden;
			}
		}
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
