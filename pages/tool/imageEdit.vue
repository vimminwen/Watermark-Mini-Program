<template>
	<dark-page-meta />
	<view class="image-edit-page">
		<!-- 预览区 -->
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @click="chooseImage">
				<text class="empty-icon">📷</text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持相册或拍照</text>
			</view>
			<view v-else class="preview-wrap">
				<view
					class="canvas-wrap"
					:style="canvasWrapStyle"
				>
					<image
						class="preview-bg"
						:src="imagePath"
						mode="aspectFit"
						:style="canvasWrapStyle"
					/>
					<canvas
						type="2d"
						id="editCanvas"
						class="edit-canvas"
						:style="canvasWrapStyle"
						:disable-scroll="true"
						@touchstart="onCanvasTouchStart"
						@touchmove.stop.prevent="onCanvasTouchMove"
						@touchend="onCanvasTouchEnd"
						@touchcancel="onCanvasTouchEnd"
						@tap="onCanvasTap"
					/>
				</view>
				<view v-if="modeHint" class="preview-badge">
					<text>{{ modeHint }}</text>
				</view>
			</view>
		</view>

		<!-- 选图 / 换图 -->
		<view class="toolbar">
			<view class="tool-chip" @click="chooseImage">
				<text>{{ imagePath ? '🔄 换一张' : '📁 选择图片' }}</text>
			</view>
			<view v-if="imagePath" class="tool-chip" @click="undoLast">
				<text>↩ 撤销</text>
			</view>
			<view v-if="imagePath" class="tool-chip danger" @click="resetAll">
				<text>清空</text>
			</view>
		</view>

		<!-- 编辑工具 -->
		<view v-if="imagePath" class="edit-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>编辑工具</text>
			</view>
			<view class="tool-bar">
				<view
					v-for="item in toolModes"
					:key="item.id"
					class="tool-tab"
					:class="{ active: editMode === item.id }"
					@click="setEditMode(item.id)"
				>
					<text class="tab-icon">{{ item.icon }}</text>
					<text class="tab-name">{{ item.name }}</text>
				</view>
			</view>

			<view v-if="editMode === 'mosaic'" class="panel-row">
				<text class="panel-label">笔刷大小</text>
				<slider
					class="panel-slider"
					:value="brushSize"
					:min="12"
					:max="48"
					:step="2"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@change="onBrushChange"
				/>
				<text class="panel-value">{{ brushSize }}</text>
			</view>

			<template v-if="editMode === 'text'">
				<input
					class="text-input"
					v-model="textInput"
					placeholder="请输入文字内容"
					placeholder-class="text-input-ph"
					maxlength="50"
				/>
				<view class="panel-row">
					<text class="panel-label">字号</text>
					<slider
						class="panel-slider"
						:value="fontSize"
						:min="16"
						:max="48"
						:step="2"
						activeColor="#4facfe"
						backgroundColor="rgba(255,255,255,0.15)"
						block-color="#00f2fe"
						@change="onFontSizeChange"
					/>
					<text class="panel-value">{{ fontSize }}</text>
				</view>
				<view class="color-row">
					<view
						v-for="c in textColors"
						:key="c"
						class="color-dot"
						:class="{ active: textColor === c }"
						:style="{ background: c }"
						@click="textColor = c"
					/>
				</view>
				<view class="place-text-btn" @click="placeTextAtCenter">
					<text>添加到图片中央</text>
				</view>
				<text class="panel-tip">或点击画布指定文字位置</text>
			</template>
		</view>

		<!-- 保存 -->
		<view
			v-if="imagePath"
			class="save-btn"
			:class="{ disabled: saving }"
			@click="saveImage"
		>
			<text>{{ saving ? '保存中...' : '保存到相册' }}</text>
		</view>

		<tool-tips-card :tips="tips" />
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed, getCurrentInstance, nextTick } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import {
		applyMosaicAt,
		drawTextLayer,
		calcCanvasLayout
	} from '@/utils/image/imageEditor.js'

	const instance = getCurrentInstance()

	const imagePath = ref('')
	const editMode = ref('mosaic')
	const brushSize = ref(24)
	const textInput = ref('')
	const fontSize = ref(28)
	const textColor = ref('#ffffff')
	const saving = ref(false)
	const layout = ref({ width: 300, height: 300, scale: 1 })
	const canvasRect = ref({ left: 0, top: 0, width: 0, height: 0 })

	const canvasWrapStyle = computed(() => ({
		width: `${layout.value.width}px`,
		height: `${layout.value.height}px`
	}))

	const mosaicStrokes = ref([])
	const textLayers = ref([])
	const historyStack = ref([])

	let canvasNode = null
	let ctx = null
	let baseImage = null
	let canvasReady = false
	let isDrawing = false
	let pendingTextPlace = false

	const toolModes = [
		{ id: 'mosaic', name: '马赛克', icon: '▦' },
		{ id: 'text', name: '文字', icon: 'T' }
	]

	const textColors = ['#ffffff', '#000000', '#ff4d4f', '#4facfe', '#fee140', '#52c41a']

	const tips = [
		'选择一张照片，可涂抹马赛克或添加文字',
		'「马赛克」模式下在图片上滑动即可遮挡',
		'「文字」输入内容后可添加到中央或点击画布放置',
		'满意后点击「保存到相册」，所有处理均在本地完成'
	]

	const modeHint = computed(() => {
		if (editMode.value === 'mosaic') return '涂抹添加马赛克'
		if (editMode.value === 'text') return pendingTextPlace.value ? '点击画布放置文字' : '文字模式'
		return ''
	})

	const getPreviewMaxSize = () => {
		const sys = uni.getSystemInfoSync()
		const maxW = sys.windowWidth - uni.upx2px(60)
		const maxH = uni.upx2px(480)
		return { maxW, maxH }
	}

	onLoad((options) => {
		if (options?.title) {
			uni.setNavigationBarTitle({
				title: decodeURIComponent(options.title)
			})
		}
	})

	const pushHistory = () => {
		historyStack.value.push({
			mosaic: mosaicStrokes.value.map((s) => ({ ...s })),
			texts: textLayers.value.map((t) => ({ ...t }))
		})
		if (historyStack.value.length > 20) {
			historyStack.value.shift()
		}
	}

	const getCanvasPoint = (e) => {
		const touch = e.touches?.[0] || e.changedTouches?.[0] || e.detail
		if (!touch || !layout.value.width) return null

		if (touch.x != null && touch.y != null) {
			return {
				x: Math.max(0, Math.min(layout.value.width, touch.x)),
				y: Math.max(0, Math.min(layout.value.height, touch.y))
			}
		}

		const rect = canvasRect.value
		if (!rect.width || touch.clientX == null) return null
		return {
			x: Math.max(0, Math.min(layout.value.width, touch.clientX - rect.left)),
			y: Math.max(0, Math.min(layout.value.height, touch.clientY - rect.top))
		}
	}

	const measureCanvasRect = () =>
		new Promise((resolve) => {
			const query = uni.createSelectorQuery()
			const scope = instance?.proxy ?? instance
			if (scope) query.in(scope)
			query
				.select('#editCanvas')
				.boundingClientRect((rect) => {
					if (rect?.width) {
						canvasRect.value = {
							left: rect.left,
							top: rect.top,
							width: rect.width,
							height: rect.height
						}
					}
					resolve()
				})
				.exec()
		})

	const initCanvas = async (path) => {
		const info = await new Promise((resolve, reject) => {
			uni.getImageInfo({
				src: path,
				success: resolve,
				fail: () => reject(new Error('读取图片失败'))
			})
		})

		const { maxW, maxH } = getPreviewMaxSize()
		layout.value = calcCanvasLayout(info.width, info.height, maxW, maxH)
		await nextTick()
		await nextTick()

		return new Promise((resolve, reject) => {
			const query = uni.createSelectorQuery()
			const scope = instance?.proxy ?? instance
			if (scope) query.in(scope)

			query
				.select('#editCanvas')
				.fields({ node: true, size: true })
				.exec((res) => {
					const canvas = res?.[0]?.node
					if (!canvas) {
						reject(new Error('画布初始化失败'))
						return
					}

					const box = layout.value
					const dpr = uni.getSystemInfoSync().pixelRatio || 2
					canvasNode = canvas
					ctx = canvas.getContext('2d')
					canvas.width = Math.max(1, Math.round(box.width * dpr))
					canvas.height = Math.max(1, Math.round(box.height * dpr))
					ctx.setTransform(1, 0, 0, 1, 0, 0)
					ctx.scale(dpr, dpr)

					baseImage = canvas.createImage()
					baseImage.onload = () => {
						canvasReady = true
						mosaicStrokes.value = []
						textLayers.value = []
						historyStack.value = []
						redrawCanvas()
						measureCanvasRect().then(() => resolve())
					}
					baseImage.onerror = () => reject(new Error('图片加载失败'))
					baseImage.src = path
				})
		})
	}

	const redrawCanvas = () => {
		if (!ctx || !baseImage || !canvasReady) return
		const { width, height } = layout.value
		ctx.clearRect(0, 0, width, height)
		ctx.drawImage(baseImage, 0, 0, width, height)

		mosaicStrokes.value.forEach((stroke) => {
			applyMosaicAt(ctx, stroke.x, stroke.y, stroke.brush, stroke.block, layout.value)
		})

		textLayers.value.forEach((layer) => {
			drawTextLayer(ctx, layer)
		})
	}

	const addMosaicPoint = (x, y) => {
		const block = Math.max(6, Math.floor(brushSize.value / 3))
		mosaicStrokes.value.push({
			x,
			y,
			brush: brushSize.value,
			block
		})
		applyMosaicAt(ctx, x, y, brushSize.value, block, layout.value)
	}

	const setEditMode = (mode) => {
		editMode.value = mode
		pendingTextPlace.value = mode === 'text' && !!textInput.value.trim()
	}

	const onBrushChange = (e) => {
		brushSize.value = e.detail.value
	}

	const onFontSizeChange = (e) => {
		fontSize.value = e.detail.value
	}

	const onCanvasTouchStart = (e) => {
		if (editMode.value !== 'mosaic') return
		isDrawing = true
		pushHistory()
		const p = getCanvasPoint(e)
		if (p) addMosaicPoint(p.x, p.y)
	}

	const onCanvasTouchMove = (e) => {
		if (!isDrawing || editMode.value !== 'mosaic') return
		const p = getCanvasPoint(e)
		if (p) addMosaicPoint(p.x, p.y)
	}

	const onCanvasTouchEnd = () => {
		isDrawing = false
	}

	const addTextLayer = (x, y) => {
		const text = textInput.value.trim()
		if (!text) {
			uni.showToast({ title: '请先输入文字', icon: 'none' })
			return
		}
		pushHistory()
		const layer = {
			text,
			x: Math.max(0, x),
			y: Math.max(0, y),
			fontSize: fontSize.value,
			color: textColor.value,
			stroke: textColor.value === '#ffffff' ? '#000000' : '#ffffff'
		}
		textLayers.value.push(layer)
		drawTextLayer(ctx, layer)
		pendingTextPlace.value = false
	}

	const placeTextAtCenter = () => {
		if (!canvasReady) return
		const text = textInput.value.trim()
		if (!text) {
			uni.showToast({ title: '请先输入文字', icon: 'none' })
			return
		}
		ctx.save()
		ctx.font = `bold ${fontSize.value}px sans-serif`
		const metrics = ctx.measureText(text)
		ctx.restore()
		const x = Math.max(0, (layout.value.width - metrics.width) / 2)
		const y = Math.max(0, (layout.value.height - fontSize.value) / 2)
		addTextLayer(x, y)
	}

	const onCanvasTap = (e) => {
		if (editMode.value !== 'text') return
		const text = textInput.value.trim()
		if (!text) {
			uni.showToast({ title: '请先输入文字', icon: 'none' })
			return
		}
		const touch = e.detail || {}
		const p = touch.x != null ? { x: touch.x, y: touch.y } : getCanvasPoint(e)
		if (p) addTextLayer(p.x, p.y)
	}

	const undoLast = () => {
		if (!mosaicStrokes.value.length && !textLayers.value.length) {
			uni.showToast({ title: '暂无可撤销操作', icon: 'none' })
			return
		}
		const last = historyStack.value.pop()
		if (last) {
			mosaicStrokes.value = last.mosaic
			textLayers.value = last.texts
		} else if (textLayers.value.length) {
			textLayers.value.pop()
		} else if (mosaicStrokes.value.length) {
			mosaicStrokes.value.pop()
		}
		redrawCanvas()
	}

	const resetAll = () => {
		imagePath.value = ''
		canvasReady = false
		canvasNode = null
		ctx = null
		baseImage = null
		mosaicStrokes.value = []
		textLayers.value = []
		historyStack.value = []
		textInput.value = ''
		editMode.value = 'mosaic'
	}

	const chooseImage = () => {
		uni.chooseImage({
			count: 1,
			sourceType: ['album', 'camera'],
			success: async (res) => {
				const path = res.tempFilePaths?.[0]
				if (!path) return
				canvasReady = false
				imagePath.value = path
				uni.showLoading({ title: '加载中...', mask: true })
				try {
					await initCanvas(path)
				} catch (err) {
					console.error('[chooseImage]', err)
					uni.showToast({ title: err?.message || '加载失败', icon: 'none' })
					imagePath.value = ''
				} finally {
					uni.hideLoading()
				}
			}
		})
	}

	const saveImage = () => {
		if (!canvasNode || saving.value) return
		saving.value = true
		const scope = instance?.proxy ?? instance
		uni.canvasToTempFilePath(
			{
				canvas: canvasNode,
				fileType: 'jpg',
				quality: 0.92,
				success: (res) => {
					uni.saveImageToPhotosAlbum({
						filePath: res.tempFilePath,
						success: () => {
							uni.showToast({ title: '已保存到相册', icon: 'success' })
						},
						fail: (err) => {
							const denied = /auth deny|authorize|permission/i.test(err?.errMsg || '')
							if (denied) {
								uni.showModal({
									title: '需要相册权限',
									content: '请在设置中允许保存到相册',
									confirmText: '去设置',
									success: (r) => {
										if (r.confirm) uni.openSetting()
									}
								})
							} else {
								uni.showToast({ title: '保存失败', icon: 'none' })
							}
						},
						complete: () => {
							saving.value = false
						}
					})
				},
				fail: () => {
					saving.value = false
					uni.showToast({ title: '导出失败', icon: 'none' })
				}
			},
			scope
		)
	}
</script>

<style lang="scss" scoped>
	.image-edit-page {
		min-height: 100vh;
		padding: 30rpx;
		padding-bottom: 140rpx;
		box-sizing: border-box;
		background: linear-gradient(to bottom, #050d40, #233968);
	}

	.section-label {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;

		.label-line {
			width: 8rpx;
			height: 32rpx;
			background: linear-gradient(to bottom, #4facfe, #00f2fe);
			border-radius: 4rpx;
			margin-right: 14rpx;

			&.line-pink {
				background: linear-gradient(to bottom, #fa709a, #fee140);
			}
		}

		text {
			font-size: 30rpx;
			font-weight: 600;
			color: #ffffff;
		}
	}

	.preview-card {
		border-radius: 20rpx;
		overflow: hidden;
		margin-bottom: 24rpx;
		min-height: 480rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 80rpx 40rpx;
		width: 100%;

		.empty-icon {
			font-size: 88rpx;
			margin-bottom: 24rpx;
		}

		.empty-title {
			font-size: 32rpx;
			color: #ffffff;
			margin-bottom: 12rpx;
		}

		.empty-desc {
			font-size: 26rpx;
			color: rgba(255, 255, 255, 0.5);
		}
	}

	.preview-wrap {
		position: relative;
		width: 100%;
		height: 480rpx;
		display: flex;
		align-items: center;
		justify-content: center;

		.preview-badge {
			position: absolute;
			left: 20rpx;
			bottom: 20rpx;
			padding: 8rpx 20rpx;
			border-radius: 24rpx;
			background: rgba(0, 0, 0, 0.55);

			text {
				font-size: 24rpx;
				color: #4facfe;
			}
		}
	}

	.canvas-wrap {
		position: relative;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 12rpx;
		overflow: hidden;
		flex-shrink: 0;
	}

	.preview-bg {
		position: absolute;
		left: 0;
		top: 0;
		display: block;
		z-index: 0;
	}

	.edit-canvas {
		position: relative;
		z-index: 1;
		display: block;
		background: transparent;
	}

	.toolbar {
		display: flex;
		gap: 20rpx;
		margin-bottom: 24rpx;

		.tool-chip {
			flex: 1;
			padding: 20rpx 0;
			text-align: center;
			border-radius: 40rpx;
			background: rgba(79, 172, 254, 0.15);
			border: 2rpx solid rgba(79, 172, 254, 0.35);

			text {
				font-size: 28rpx;
				color: #4facfe;
			}

			&.danger {
				background: rgba(255, 100, 100, 0.1);
				border-color: rgba(255, 100, 100, 0.35);

				text {
					color: #ff8a8a;
				}
			}

			&:active {
				opacity: 0.85;
			}
		}
	}

	.edit-panel {
		border-radius: 20rpx;
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.tool-bar {
		display: flex;
		gap: 16rpx;
		margin-bottom: 24rpx;

		.tool-tab {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 20rpx 0;
			border-radius: 16rpx;
			background: rgba(255, 255, 255, 0.05);

			&.active {
				background: rgba(79, 172, 254, 0.2);
				border: 2rpx solid rgba(79, 172, 254, 0.5);
			}

			.tab-icon {
				font-size: 36rpx;
				color: #ffffff;
				margin-bottom: 8rpx;
			}

			.tab-name {
				font-size: 24rpx;
				color: rgba(255, 255, 255, 0.85);
			}
		}
	}

	.panel-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-bottom: 16rpx;
	}

	.panel-label {
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.7);
		flex-shrink: 0;
		width: 120rpx;
	}

	.panel-slider {
		flex: 1;
	}

	.panel-value {
		font-size: 24rpx;
		color: #4facfe;
		width: 56rpx;
		text-align: right;
	}

	.text-input {
		display: block;
		width: 100%;
		height: 88rpx;
		min-height: 88rpx;
		line-height: 88rpx;
		padding: 0 24rpx;
		margin-bottom: 20rpx;
		box-sizing: border-box;
		font-size: 28rpx;
		color: #ffffff;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 12rpx;
	}

	.text-input-ph {
		color: rgba(255, 255, 255, 0.35);
		line-height: 88rpx;
	}

	.color-row {
		display: flex;
		gap: 20rpx;
		margin-bottom: 20rpx;
		flex-wrap: wrap;
	}

	.color-dot {
		width: 48rpx;
		height: 48rpx;
		border-radius: 50%;
		border: 4rpx solid transparent;

		&.active {
			border-color: #4facfe;
			box-shadow: 0 0 12rpx rgba(79, 172, 254, 0.6);
		}
	}

	.place-text-btn {
		padding: 22rpx;
		text-align: center;
		border-radius: 40rpx;
		background: linear-gradient(to right, #4facfe, #00f2fe);
		margin-bottom: 12rpx;

		text {
			font-size: 28rpx;
			font-weight: bold;
			color: #ffffff;
		}
	}

	.panel-tip {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.45);
		text-align: center;
		display: block;
	}

	.save-btn {
		background: linear-gradient(to right, #4facfe, #00f2fe);
		padding: 30rpx;
		border-radius: 50rpx;
		text-align: center;
		margin-bottom: 24rpx;

		&.disabled {
			opacity: 0.7;
		}

		text {
			font-size: 32rpx;
			font-weight: bold;
			color: #ffffff;
		}

		&:active:not(.disabled) {
			opacity: 0.9;
			transform: scale(0.98);
		}
	}
</style>
