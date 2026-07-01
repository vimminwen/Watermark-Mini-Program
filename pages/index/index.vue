<template>
	<dark-page-meta />
	<view class="home-page" :class="themeClass">
		<view class="banner-section">
			<Banner3D />
		</view>

		<view class="quick-tools">
			<view class="section-title">
				<view class="title-line"></view>
				<text class="title-text">快捷工具</text>
			</view>
			<view class="tools-grid">
				<view class="tool-card boxBg" v-for="tool in quickTools" :key="tool.id" @click="navigateToTool(tool)">
					<text class="iconfont tool-icon" :class="tool.img"></text>
					<text class="tool-name">{{ tool.title }}</text>
				</view>
			</view>
		</view>

		<view class="all-tools">
			<view class="section-title">
				<view class="title-line"></view>
				<text class="title-text">更多工具</text>
				<text class="tool-count">({{ moreTools.length }}个)</text>
			</view>

			<view class="tools-list">
				<view
					class="tool-item boxBg"
					v-for="(item, index) in moreTools"
					:key="item.id"
					:style="{ animationDelay: (index * 0.05) + 's' }"
					@click="navigateToTool(item)"
				>
					<view class="item-left">
						<text class="iconfont item-icon" :class="item.img"></text>
					</view>
					<view class="item-right">
						<view class="item-title">{{item.title}}</view>
						<view class="item-content">{{item.content}}</view>
					</view>
					<text class="iconfont icon-xiangyou"></text>
				</view>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { usePageTheme } from '@/utils/theme/useTheme.js'
	import Banner3D from '@/components/common/Banner3D.vue'
	import dataList from '@/api/data/list.json'
	import { buildToolUrl, filterQuickTools, filterMoreTools, navigateByPageUrl } from '@/utils/tool/toolRegistry.js'

	const { themeClass } = usePageTheme()

	const toolList = ref([])

	const quickTools = computed(() => filterQuickTools(toolList.value))

	const moreTools = computed(() => filterMoreTools(toolList.value))

	const getToolNavigateUrl = (item) => buildToolUrl(item)

	const navigateToTool = (tool) => {
		navigateByPageUrl(getToolNavigateUrl(tool))
	}

	const loadHomeData = () => {
		try {
			toolList.value = (dataList || []).filter((item) => item.del !== '1')
		} catch (e) {
			console.error('[loadHomeData]', e)
			toolList.value = []
		}
	}

	// tabBar 首页用 onLoad 更可靠；setup 同步加载避免骨架屏卡住
	loadHomeData()
	onLoad(loadHomeData)
</script>

<style lang="scss">
	.home-page {
		min-height: 100vh;
		padding-bottom: 120rpx;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
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
				color: var(--text-primary);
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
					font-size: 60rpx;
					margin-bottom: 15rpx;
					background: linear-gradient(to bottom, #aa2267, #fe764e);
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}

				.tool-name {
					font-size: 26rpx;
					color: var(--text-primary);
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
				color: var(--text-primary);
			}

			.tool-count {
				font-size: 26rpx;
				color: var(--text-secondary);
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
					font-size: 70rpx;
					background: linear-gradient(to bottom, #aa2267, #fe764e);
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}
			}

			.item-right {
				flex: 1;
				overflow: hidden;

				.item-title {
					font-size: 30rpx;
					font-weight: 600;
					color: var(--text-primary);
					margin-bottom: 8rpx;
				}

				.item-content {
					font-size: 26rpx;
					color: var(--text-secondary);
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
				color: var(--text-muted);
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