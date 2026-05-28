<template>
	<dark-page-meta />
	<view class="home-page">
		<HomeSkeleton v-if="pageLoading" />

		<block v-else>
		<!-- 轮播图 -->
		<view class="banner-section">
			<Banner3D />
		</view>

		<!-- 快捷工具入口 -->
		<view class="quick-tools">
			<view class="section-title">
				<view class="title-line"></view>
				<text class="title-text">快捷工具</text>
			</view>
			<view class="tools-grid">
				<view class="tool-card boxBg" v-for="tool in quickTools" :key="tool.id" @click="navigateToTool(tool)">
					<image class="tool-icon" :src="tool.img" mode="aspectFit"></image>
					<text class="tool-name">{{ tool.title }}</text>
				</view>
			</view>
		</view>

		<!-- 更多工具列表 -->
		<view class="all-tools">
			<view class="section-title">
				<view class="title-line"></view>
				<text class="title-text">更多工具</text>
				<text class="tool-count">({{ moreTools.length }}个)</text>
			</view>

			<view class="tools-list">
				<navigator :url="getToolNavigateUrl(item)" class="tool-item boxBg"
					v-for="(item, index) in moreTools" :key="item.id" :style="{ animationDelay: (index * 0.05) + 's' }">
					<view class="item-left">
						<image class="item-icon" :src="item.img" mode="aspectFit"></image>
					</view>
					<view class="item-right">
						<view class="item-title">{{item.title}}</view>
						<view class="item-content">{{item.content}}</view>
					</view>
					<text class="iconfont icon-xiangyou"></text>
				</navigator>
			</view>
		</view>
		</block>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted
	} from 'vue'
	import Banner3D from '@/components/common/Banner3D.vue'
	import HomeSkeleton from '@/components/common/HomeSkeleton.vue'
	import dataList from '@/api/data/list.json'
	import { buildToolUrl, filterQuickTools, filterMoreTools, navigateByPageUrl } from '@/utils/tool/toolRegistry.js'

	const pageLoading = ref(true)
	const toolList = ref([])

	// 快捷工具（location 为 1）
	const quickTools = computed(() => filterQuickTools(toolList.value))

	// 更多工具（location 不为 1）
	const moreTools = computed(() => filterMoreTools(toolList.value))

	const getToolNavigateUrl = (item) => buildToolUrl(item)

	const navigateToTool = (tool) => {
		navigateByPageUrl(getToolNavigateUrl(tool))
	}

	const loadHomeData = async () => {
		pageLoading.value = true
		try {
			// 本地数据；后续可替换为接口请求
			toolList.value = (dataList || []).filter((item) => item.del !== '1')
		} catch (e) {
			console.error('[loadHomeData]', e)
			toolList.value = []
		} finally {
			pageLoading.value = false
		}
	}

	onMounted(() => {
		loadHomeData()
	})
</script>

<style lang="scss">
	.home-page {
		min-height: 100vh;
		padding-bottom: 120rpx;
		background: linear-gradient(to bottom, #050d40, #233968);
	}

	.banner-section {
		padding: 0 20rpx;
		margin-bottom: 30rpx;
	}

	.quick-tools {
		padding: 0 30rpx;
		margin-bottom: 40rpx;

		.section-title {
			display: flex;
			align-items: center;
			margin-bottom: 25rpx;

			.title-line {
				width: 8rpx;
				height: 35rpx;
				background: linear-gradient(to bottom, #4facfe, #00f2fe);
				border-radius: 4rpx;
				margin-right: 15rpx;
			}

			.title-text {
				font-size: 32rpx;
				font-weight: bold;
				color: #ffffff;
			}
		}

		.tools-grid {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 20rpx;

			.tool-card {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				padding: 30rpx 15rpx;
				border-radius: 16rpx;
				transition: all 0.3s ease;

				&:active {
					transform: scale(0.95);
				}

				.tool-icon {
					width: 60rpx;
					height: 60rpx;
					margin-bottom: 15rpx;
				}

				.tool-name {
					font-size: 26rpx;
					color: #ffffff;
					text-align: center;
					line-height: 1.4;
				}
			}
		}
	}

	.all-tools {
		padding: 0 30rpx;

		.section-title {
			display: flex;
			align-items: center;
			margin-bottom: 25rpx;

			.title-line {
				width: 8rpx;
				height: 35rpx;
				background: linear-gradient(to bottom, #fa709a, #fee140);
				border-radius: 4rpx;
				margin-right: 15rpx;
			}

			.title-text {
				font-size: 32rpx;
				font-weight: bold;
				color: #ffffff;
			}

			.tool-count {
				font-size: 26rpx;
				color: rgba(255, 255, 255, 0.7);
				margin-left: 10rpx;
			}
		}

		.tools-list {
			display: flex;
			flex-direction: column;
			gap: 20rpx;
		}

		.tool-item {
			display: flex;
			align-items: center;
			padding: 25rpx;
			border-radius: 16rpx;
			transition: all 0.3s ease;
			animation: slideIn 0.5s ease forwards;
			opacity: 0;

			&:active {
				transform: scale(0.98);
			}

			.item-left {
				margin-right: 20rpx;

				.item-icon {
					width: 70rpx;
					height: 70rpx;
				}
			}

			.item-right {
				flex: 1;
				overflow: hidden;

				.item-title {
					font-size: 30rpx;
					font-weight: 600;
					color: #ffffff;
					margin-bottom: 8rpx;
				}

				.item-content {
					font-size: 26rpx;
					color: rgba(255, 255, 255, 0.7);
					line-height: 1.4;
					overflow: hidden;
					text-overflow: ellipsis;
					display: -webkit-box;
					-webkit-line-clamp: 2;
					-webkit-box-orient: vertical;
				}
			}

			.icon-xiangyou {
				font-size: 28rpx;
				color: rgba(255, 255, 255, 0.5);
				margin-left: 15rpx;
			}
		}
	}

	@keyframes slideIn {
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