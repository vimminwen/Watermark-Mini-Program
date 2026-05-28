<template>
	<dark-page-meta />
	<view class="use-page">
		<view class="use-layout">
			<scroll-view class="side-nav" scroll-y :show-scrollbar="false">
				<view
					v-for="cat in categories"
					:key="cat.id || 'all'"
					class="side-nav-item"
					:class="{ active: activeCid === cat.id }"
					@click="selectCategory(cat.id)"
				>
					<text class="side-nav-text">{{ cat.title }}</text>
				</view>
			</scroll-view>

			<scroll-view class="main-panel" scroll-y :show-scrollbar="false">
				<view v-if="filteredList.length" class="liBox">
					<view
						class="navBox boxBg"
						v-for="item in filteredList"
						:key="item.id"
						@click="navigateToTool(item)"
					>
						<view class="imgBox">
							<image :src="item.img" mode="aspectFit"></image>
						</view>
						<view class="right">
							<view class="title">{{ item.title }}</view>
							<view class="content">{{ item.content }}</view>
						</view>
					</view>
				</view>
				<view v-else class="empty-tip">
					<text>该分类暂无功能</text>
				</view>
			</scroll-view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed, onMounted } from 'vue'
	import dataList from '@/api/data/list.json'
	import toolCategories from '@/api/data/toolCategories.json'
	import { buildToolUrl, filterToolsByCategory, navigateByPageUrl } from '@/utils/tool/toolRegistry.js'

	const navigateToTool = (tool) => {
		navigateByPageUrl(buildToolUrl(tool))
	}

	const allTools = ref([])
	const activeCid = ref('')
	const categories = ref([])

	const filteredList = computed(() => filterToolsByCategory(allTools.value, activeCid.value))

	const selectCategory = (cid) => {
		activeCid.value = cid
	}

	onMounted(() => {
		allTools.value = dataList || []
		categories.value = [...(toolCategories || [])].sort(
			(a, b) => Number(a.sort) - Number(b.sort)
		)
		ifNavGo()
		const pages = getCurrentPages()
		const currentPage = pages[pages.length - 1]
		const options = currentPage.options || {}
		uni.setStorageSync('pageId', options.id)
	})

	const ifNavGo = () => {
		const a = uni.getStorageSync('bnav')
		uni.setStorageSync('ifNavGo', a.id)
	}
</script>

<style lang="scss">
	.use-page {
		height: 100vh;
		box-sizing: border-box;
		padding-bottom: env(safe-area-inset-bottom);
		background: linear-gradient(to bottom, #050d40, #233968);
	}

	.use-layout {
		display: flex;
		height: 100%;
		min-height: 0;
	}

	.side-nav {
		flex-shrink: 0;
		width: 176rpx;
		height: 100%;
		background: rgba(0, 0, 0, 0.15);
		border-right: 1rpx solid rgba(255, 255, 255, 0.08);
		box-sizing: border-box;
	}

	.side-nav-item {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 96rpx;
		padding: 24rpx 12rpx;
		box-sizing: border-box;
		transition: background 0.2s ease;

		&.active {
			background: rgba(79, 172, 254, 0.12);

			&::before {
				content: '';
				position: absolute;
				left: 0;
				top: 50%;
				width: 6rpx;
				height: 48rpx;
				transform: translateY(-50%);
				background: linear-gradient(to bottom, #4facfe, #00f2fe);
				border-radius: 0 4rpx 4rpx 0;
			}

			.side-nav-text {
				color: #ffffff;
				font-weight: 600;
			}
		}

		&:active {
			opacity: 0.85;
		}
	}

	.side-nav-text {
		font-size: 26rpx;
		line-height: 1.4;
		text-align: center;
		color: rgba(255, 255, 255, 0.65);
		word-break: break-all;
	}

	.main-panel {
		flex: 1;
		height: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.liBox {
		display: flex;
		flex-direction: column;
		padding: 16rpx 20rpx 120rpx;
		box-sizing: border-box;
	}

	.empty-tip {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400rpx;
		color: rgba(255, 255, 255, 0.5);
		font-size: 28rpx;
	}

	.navBox {
		display: flex;
		align-items: center;
		width: 100%;
		margin-bottom: 20rpx;
		padding: 28rpx 24rpx;
		box-sizing: border-box;
		border-radius: 20rpx;
		border: 2rpx rgba(255, 255, 255, 0.2) solid;
		transition: all 0.3s ease;
		animation: fadeIn 0.4s ease forwards;
		opacity: 0;

		&:active {
			transform: scale(0.98);
		}

		.imgBox {
			flex-shrink: 0;
			margin-right: 20rpx;

			image {
				width: 80rpx;
				height: 80rpx;
			}
		}

		.right {
			flex: 1;
			min-width: 0;
			text-align: left;

			.title {
				font-size: 28rpx;
				font-weight: 600;
				padding: 4rpx 0;
				color: #ffffff;
				white-space: nowrap;
				text-overflow: ellipsis;
				overflow: hidden;
			}

			.content {
				font-size: 24rpx;
				padding: 4rpx 0;
				color: rgba(255, 255, 255, 0.7);
				display: -webkit-box;
				-webkit-box-orient: vertical;
				-webkit-line-clamp: 2;
				overflow: hidden;
			}
		}
	}

	@for $i from 1 through 16 {
		.navBox:nth-child(#{$i}) {
			animation-delay: #{$i * 0.04}s;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(16rpx);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
