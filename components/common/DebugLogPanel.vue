<template>
	<view class="debug-panel-wrap">
		<view class="debug-panel boxBg">
			<view class="debug-header">
				<view class="debug-header-left">
					<text class="debug-title">上传日志</text>
					<text class="debug-hint">点击日志可复制</text>
				</view>
				<text class="debug-clear" @tap="$emit('clear')">清空</text>
			</view>
			<scroll-view scroll-y class="debug-scroll" :scroll-top="scrollTop">
				<view v-if="!logs.length" class="debug-empty">{{ emptyText }}</view>
				<view
					v-for="(line, index) in logs"
					:key="index"
					class="debug-line"
					:class="'debug-line--' + line.level"
					@tap="copyLine(line)"
				>
					<text class="debug-time">{{ line.time }}</text>
					<text class="debug-tag">{{ line.level }}</text>
					<text class="debug-text">{{ line.text }}</text>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script setup>
	defineProps({
		logs: {
			type: Array,
			default: () => []
		},
		scrollTop: {
			type: Number,
			default: 0
		},
		emptyText: {
			type: String,
			default: '执行功能后在此显示步骤与报错'
		}
	})

	defineEmits(['clear'])

	const copyLine = (line) => {
		const text = `[${line.time}][${line.level}] ${line.text}`
		uni.setClipboardData({
			data: text,
			success: () => {
				uni.showToast({ title: '已复制', icon: 'none' })
			},
			fail: () => {
				uni.showToast({ title: '复制失败', icon: 'none' })
			}
		})
	}
</script>

<style lang="scss" scoped>
	.debug-panel-wrap {
		margin-top: 36rpx;
	}

	.debug-panel {
		border-radius: 20rpx;
		padding: 24rpx;
		border: 1rpx dashed rgba(255, 200, 100, 0.45);

		.debug-header {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			margin-bottom: 16rpx;
			gap: 16rpx;

			.debug-header-left {
				display: flex;
				flex-direction: column;
				gap: 6rpx;
			}

			.debug-title {
				font-size: 26rpx;
				font-weight: bold;
				color: #ffc864;
			}

			.debug-hint {
				font-size: 22rpx;
				color: rgba(255, 255, 255, 0.4);
			}

			.debug-clear {
				font-size: 24rpx;
				color: #4facfe;
				flex-shrink: 0;
			}
		}

		.debug-scroll {
			max-height: 420rpx;
		}

		.debug-empty {
			font-size: 24rpx;
			color: rgba(255, 255, 255, 0.45);
			line-height: 1.6;
		}

		.debug-line {
			display: flex;
			flex-wrap: wrap;
			align-items: flex-start;
			gap: 8rpx;
			padding: 10rpx 0;
			border-bottom: 1rpx solid rgba(255, 255, 255, 0.06);

			&:active {
				opacity: 0.75;
				background: rgba(255, 255, 255, 0.04);
			}

			.debug-time {
				font-size: 20rpx;
				color: rgba(255, 255, 255, 0.4);
				flex-shrink: 0;
			}

			.debug-tag {
				font-size: 20rpx;
				padding: 2rpx 10rpx;
				border-radius: 8rpx;
				flex-shrink: 0;
			}

			.debug-text {
				flex: 1;
				min-width: 0;
				font-size: 22rpx;
				color: rgba(255, 255, 255, 0.85);
				word-break: break-all;
				white-space: pre-wrap;
				line-height: 1.5;
			}

			&--INFO .debug-tag {
				background: rgba(79, 172, 254, 0.2);
				color: #4facfe;
			}

			&--STEP .debug-tag {
				background: rgba(255, 200, 100, 0.2);
				color: #ffc864;
			}

			&--OK .debug-tag {
				background: rgba(100, 200, 100, 0.2);
				color: #64c864;
			}

			&--WARN .debug-tag {
				background: rgba(255, 180, 100, 0.2);
				color: #ffb464;
			}

			&--ERROR .debug-tag {
				background: rgba(255, 100, 100, 0.2);
				color: #ff8a8a;
			}
		}
	}
</style>
