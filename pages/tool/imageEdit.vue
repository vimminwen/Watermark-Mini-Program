<template>
	<dark-page-meta />
	<view class="image-edit-page" :class="themeClass">
		<!-- 预览区 -->
		<view class="preview-card boxBg">
			<view v-if="!imagePath" class="preview-empty" @click="chooseImage">
				<text class="iconfont icon-tupianbianji empty-icon"></text>
				<text class="empty-title">点击选择图片</text>
				<text class="empty-desc">支持相册或拍照</text>
			</view>
			<view v-else class="preview-wrap">
				<image
					class="preview-image"
					:src="previewDisplayPath || imagePath"
					mode="aspectFit"
				/>
				<view v-if="hasEdits" class="preview-badge">
					<text>已编辑</text>
				</view>
			</view>
		</view>

		<!-- 选图 / 换图 -->
		<view class="toolbar">
			<view class="tool-chip" @click="chooseImage">
				<text>{{ imagePath ? '🔄 换一张' : '📁 选择图片' }}</text>
			</view>
			<view v-if="imagePath" class="tool-chip danger" @click="resetAll">
				<text>清空</text>
			</view>
		</view>

		<view
			v-if="imagePath"
			class="start-edit-btn"
			:class="{ disabled: openingEditor }"
			@click="openFullscreenEdit"
		>
			<text>{{ openingEditor ? '加载中...' : '开始编辑' }}</text>
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

	<!-- 全屏编辑 -->
	<view
		v-if="fullscreenEditing"
		class="fullscreen-editor"
	>
		<view class="fullscreen-header">
			<view class="header-btn" @click="cancelFullscreenEdit">
				<text>← 返回</text>
			</view>
			<text class="header-title">图片编辑</text>
			<view class="header-btn primary" @click="confirmFullscreenEdit">
				<text>确定</text>
			</view>
		</view>

		<scroll-view scroll-y class="fullscreen-scroll" :show-scrollbar="false">
			<view class="canvas-section">
				<view class="canvas-stage">
					<view id="editCanvasWrap" class="canvas-wrap" :style="canvasWrapStyle">
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
						/>
						<view
							class="touch-overlay"
							@touchstart.stop="onCanvasTouchStart"
							@touchmove.stop.prevent="onCanvasTouchMove"
							@touchend.stop="onCanvasTouchEnd"
							@touchcancel.stop="onCanvasTouchEnd"
						/>
						<view v-if="modeHint" class="canvas-hint">
							<text>{{ modeHint }}</text>
						</view>
					</view>
				</view>
			</view>

			<view class="fullscreen-tools">
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
					<view class="tool-tab undo-tab" @click="undoLast">
						<text class="tab-icon">↩</text>
						<text class="tab-name">撤销</text>
					</view>
				</view>

				<view v-show="editMode === 'mosaic'" class="panel-row">
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

				<view v-show="editMode === 'text'" class="text-tools-panel">
					<input
						class="text-input"
						v-model="textInput"
						placeholder="请输入文字内容"
						placeholder-class="text-input-ph"
						maxlength="50"
						@input="onTextInput"
					/>
					<view class="panel-row">
						<text class="panel-label">字号</text>
						<slider
							class="panel-slider"
							:value="fontSize"
							:min="12"
							:max="72"
							:step="2"
							activeColor="#4facfe"
							backgroundColor="rgba(255,255,255,0.15)"
							block-color="#00f2fe"
							@changing="onFontSizeChange"
							@change="onFontSizeChange"
						/>
						<text class="panel-value">{{ fontSize }}</text>
					</view>
					<view v-if="selectedTextIndex >= 0" class="scale-btn-row">
						<view class="scale-btn" @click="scaleSelectedText(-4)">
							<text>A−</text>
						</view>
						<text class="scale-hint">拖动移动 · 双指缩放 · 点 × 删除</text>
						<view class="scale-btn" @click="scaleSelectedText(4)">
							<text>A+</text>
						</view>
					</view>
					<view class="color-row">
						<view
							v-for="c in textColors"
							:key="c"
							class="color-dot"
							:class="{ active: textColor === c }"
							:style="{ background: c }"
							@click="onTextColorPick(c)"
						/>
					</view>
					<text class="panel-tip">点击空白添加；选中后点红色 × 删除</text>
				</view>
			</view>
		</scroll-view>
	</view>

	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref, computed, getCurrentInstance, nextTick } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import {
		applyMosaicAt,
		drawTextLayer,
		drawTextSelection,
		hitTestTextDeleteHandle,
		hitTestTextLayer,
		measureTextLayer,
		clampTextLayerPosition,
		calcCanvasLayout,
		getEditCanvasDpr
	} from '@/utils/image/imageEditor.js'

	/** 编辑画布最大总像素（约 960×540），兼顾清晰度与流畅度 */
	const MAX_EDIT_PIXELS = 960 * 540
	const MIN_MOSAIC_POINT_DIST = 12

	const instance = getCurrentInstance()

	const imagePath = ref('')
	const previewDisplayPath = ref('')
	const fullscreenEditing = ref(false)
	const openingEditor = ref(false)
	const editMode = ref('mosaic')
	const brushSize = ref(24)
	const textInput = ref('')
	const fontSize = ref(28)
	const textColor = ref('#ffffff')
	const saving = ref(false)
	const layout = ref({ width: 300, height: 300, scale: 1 })
	const imgNaturalSize = ref({ width: 0, height: 0 })
	const canvasRect = ref({ left: 0, top: 0, width: 0, height: 0 })

	let canvasDpr = 2

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
	const pendingTextPlace = ref(false)
	const selectedTextIndex = ref(-1)
	let textTouchStart = null
	let textTouchMoved = false
	let textDragSnapshot = null
	let textPinchSnapshot = null
	let textDeleteHandleTap = false
	let lastMosaicPoint = null
	let redrawScheduled = false
	let redrawRafId = null
	let interactionFrameCache = null
	let useInteractionCache = false

	const toolModes = [
		{ id: 'mosaic', name: '马赛克', icon: '▦' },
		{ id: 'text', name: '文字', icon: 'T' }
	]

	const textColors = ['#ffffff', '#000000', '#ff4d4f', '#4facfe', '#fee140', '#52c41a']

	const tips = [
		'选择一张照片，点击「开始编辑」进入全屏编辑',
		'文字模式：点击空白添加，选中文字后可拖动或删除',
		'选中文字后也可拖动「字号」滑块缩放',
		'编辑完成后点击「确定」返回预览'
	]

	const hasEdits = computed(
		() => !!(previewDisplayPath.value || mosaicStrokes.value.length || textLayers.value.length)
	)

	const modeHint = computed(() => {
		if (editMode.value === 'mosaic') return '涂抹添加马赛克'
		if (editMode.value === 'text') {
			if (selectedTextIndex.value >= 0) return '拖动移动 · 点 × 删除'
			if (pendingTextPlace.value) return '点击空白处放置文字'
			return '点击文字选中并拖动'
		}
		return ''
	})

	const getPreviewMaxSize = () => {
		const sys = uni.getSystemInfoSync()
		const maxW = sys.windowWidth - uni.upx2px(60)
		const maxH = uni.upx2px(480)
		return { maxW, maxH }
	}

	/** 画布区域占 65vh，用于计算画布最大尺寸 */
	const CANVAS_SECTION_VH = 0.65

	const getFullscreenMaxSize = () => {
		const sys = uni.getSystemInfoSync()
		const maxW = sys.windowWidth - uni.upx2px(32)
		const maxH = sys.windowHeight * CANVAS_SECTION_VH - uni.upx2px(32)
		return { maxW, maxH: Math.max(200, maxH) }
	}

	const applyCanvasLayoutSize = () => {
		if (!canvasNode || !ctx) return
		const box = layout.value
		canvasNode.width = Math.max(1, Math.round(box.width * canvasDpr))
		canvasNode.height = Math.max(1, Math.round(box.height * canvasDpr))
		ctx.setTransform(1, 0, 0, 1, 0, 0)
		ctx.scale(canvasDpr, canvasDpr)
	}

	const scaleEditDataToLayout = (scaleX, scaleY) => {
		if (scaleX <= 0 || scaleY <= 0) return
		const scale = (scaleX + scaleY) / 2
		mosaicStrokes.value.forEach((stroke) => {
			stroke.x *= scaleX
			stroke.y *= scaleY
			stroke.brush = Math.max(8, stroke.brush * scale)
			stroke.block = Math.max(4, Math.floor(stroke.block * scale))
		})
		textLayers.value.forEach((layer) => {
			layer.x *= scaleX
			layer.y *= scaleY
			layer.fontSize = Math.max(12, Math.min(72, Math.round(layer.fontSize * scale)))
		})
		if (selectedTextIndex.value >= 0) {
			const layer = textLayers.value[selectedTextIndex.value]
			if (layer) fontSize.value = layer.fontSize
		}
	}

	const resizeCanvasLayout = async () => {
		if (!canvasReady || !imgNaturalSize.value.width || !canvasNode || !ctx) return
		const prevW = layout.value.width
		const prevH = layout.value.height
		await nextTick()
		const { maxW, maxH } = getFullscreenMaxSize()
		const nextLayout = calcCanvasLayout(
			imgNaturalSize.value.width,
			imgNaturalSize.value.height,
			maxW,
			maxH,
			MAX_EDIT_PIXELS
		)
		if (!nextLayout.width || !nextLayout.height) return
		if (prevW && prevH) {
			const scaleX = nextLayout.width / prevW
			const scaleY = nextLayout.height / prevH
			if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01) {
				scaleEditDataToLayout(scaleX, scaleY)
			}
		}
		layout.value = nextLayout
		applyCanvasLayoutSize()
		invalidateInteractionCache()
		redrawCanvas()
		await measureCanvasRect()
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

	const getCanvasRect = () => {
		if (canvasNode?.getBoundingClientRect) {
			try {
				const rect = canvasNode.getBoundingClientRect()
				if (rect?.width) {
					canvasRect.value = {
						left: rect.left,
						top: rect.top,
						width: rect.width,
						height: rect.height
					}
				}
			} catch (_) {}
		}
		return canvasRect.value
	}

	const toCanvasPoint = (rawX, rawY) => {
		const box = layout.value
		if (!box.width) return null
		return {
			x: Math.max(0, Math.min(box.width, rawX)),
			y: Math.max(0, Math.min(box.height, rawY))
		}
	}

	const getCanvasPointFromTouch = (touch, e) => {
		const box = layout.value
		if (!box.width || !touch) return null

		const rect = getCanvasRect()

		if (touch.x != null && touch.y != null) {
			if (rect?.width && rect?.height) {
				const scaleX = box.width / rect.width
				const scaleY = box.height / rect.height
				return toCanvasPoint(touch.x * scaleX, touch.y * scaleY)
			}
			return toCanvasPoint(touch.x, touch.y)
		}

		if (!rect?.width) return null

		const scaleX = box.width / rect.width
		const scaleY = box.height / rect.height

		if (touch.clientX != null && touch.clientY != null) {
			return toCanvasPoint(
				(touch.clientX - rect.left) * scaleX,
				(touch.clientY - rect.top) * scaleY
			)
		}

		const detail = e?.detail || {}
		if (detail.x != null && detail.y != null) {
			return toCanvasPoint(detail.x * scaleX, detail.y * scaleY)
		}

		return null
	}

	const getCanvasPoint = (e) => {
		const touch = e.touches?.[0] || e.changedTouches?.[0]
		return getCanvasPointFromTouch(touch, e)
	}

	const touchDistance = (t1, t2) => {
		const p1 = getCanvasPointFromTouch(t1, {})
		const p2 = getCanvasPointFromTouch(t2, {})
		if (!p1 || !p2) return 0
		const dx = p2.x - p1.x
		const dy = p2.y - p1.y
		return Math.sqrt(dx * dx + dy * dy)
	}

	const measureCanvasRect = () =>
		new Promise((resolve) => {
			const query = uni.createSelectorQuery()
			const scope = instance?.proxy ?? instance
			if (scope) query.in(scope)
			query
				.select('#editCanvasWrap')
				.boundingClientRect((rect) => {
					if (rect?.width) {
						canvasRect.value = {
							left: rect.left,
							top: rect.top,
							width: rect.width,
							height: rect.height
						}
					} else if (layout.value.width) {
						canvasRect.value = {
							left: 0,
							top: 0,
							width: layout.value.width,
							height: layout.value.height
						}
					}
					resolve()
				})
				.exec()
		})

	const refreshCanvasRect = () => measureCanvasRect()

	const initCanvas = async (path, { preserveEdits = false, fullscreen = false } = {}) => {
		const info = await new Promise((resolve, reject) => {
			uni.getImageInfo({
				src: path,
				success: resolve,
				fail: () => reject(new Error('读取图片失败'))
			})
		})

		imgNaturalSize.value = { width: info.width, height: info.height }
		const { maxW, maxH } = fullscreen ? getFullscreenMaxSize() : getPreviewMaxSize()
		layout.value = calcCanvasLayout(info.width, info.height, maxW, maxH, MAX_EDIT_PIXELS)
		if (!layout.value.width || !layout.value.height) {
			throw new Error('画布尺寸计算失败')
		}
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

					canvasDpr = getEditCanvasDpr(uni.getSystemInfoSync().pixelRatio)
					canvasNode = canvas
					ctx = canvas.getContext('2d')
					applyCanvasLayoutSize()

					baseImage = canvas.createImage()
					baseImage.onload = () => {
						canvasReady = true
						if (!preserveEdits) {
							mosaicStrokes.value = []
							textLayers.value = []
							historyStack.value = []
						}
						redrawCanvas()
						measureCanvasRect().then(() => resolve())
					}
					baseImage.onerror = () => reject(new Error('图片加载失败'))
					baseImage.src = path
				})
		})
	}

	const teardownCanvas = () => {
		cancelScheduledRedraw()
		invalidateInteractionCache()
		lastMosaicPoint = null
		canvasReady = false
		canvasNode = null
		ctx = null
		baseImage = null
		isDrawing = false
		pendingTextPlace.value = false
		selectedTextIndex.value = -1
		textTouchStart = null
		textTouchMoved = false
		textDragSnapshot = null
		textPinchSnapshot = null
	}

	const exportCanvasToTemp = () =>
		new Promise((resolve, reject) => {
			if (!canvasNode) {
				reject(new Error('画布未就绪'))
				return
			}
			const scope = instance?.proxy ?? instance
			uni.canvasToTempFilePath(
				{
					canvas: canvasNode,
					fileType: 'jpg',
					quality: 0.92,
					success: (res) => resolve(res.tempFilePath),
					fail: () => reject(new Error('导出失败'))
				},
				scope
			)
		})

	const exportPreview = async () => {
		const tempPath = await exportCanvasToTemp()
		previewDisplayPath.value = tempPath
	}

	const openFullscreenEdit = async () => {
		if (!imagePath.value || openingEditor.value) return
		openingEditor.value = true
		fullscreenEditing.value = true
		editMode.value = 'mosaic'
		await nextTick()
		await nextTick()
		await new Promise((resolve) => setTimeout(resolve, 80))
		try {
			const preserveEdits = mosaicStrokes.value.length > 0 || textLayers.value.length > 0
			await initCanvas(imagePath.value, { preserveEdits, fullscreen: true })
		} catch (err) {
			console.error('[openFullscreenEdit]', err)
			fullscreenEditing.value = false
			uni.showToast({ title: err?.message || '打开编辑器失败', icon: 'none' })
		} finally {
			openingEditor.value = false
		}
	}

	const cancelFullscreenEdit = () => {
		fullscreenEditing.value = false
		teardownCanvas()
	}

	const confirmFullscreenEdit = async () => {
		if (!canvasReady) {
			fullscreenEditing.value = false
			teardownCanvas()
			return
		}
		try {
			if (mosaicStrokes.value.length || textLayers.value.length) {
				await exportPreview()
			} else {
				previewDisplayPath.value = ''
			}
		} catch (err) {
			console.error('[confirmFullscreenEdit]', err)
			uni.showToast({ title: err?.message || '保存编辑失败', icon: 'none' })
			return
		}
		fullscreenEditing.value = false
		teardownCanvas()
	}

	const refreshPreviewAfterEdit = async () => {
		if (!mosaicStrokes.value.length && !textLayers.value.length) {
			previewDisplayPath.value = ''
			return
		}
		const wasOpen = fullscreenEditing.value
		if (!wasOpen) {
			fullscreenEditing.value = true
			await nextTick()
		}
		try {
			if (!canvasReady) {
				await initCanvas(imagePath.value, { preserveEdits: true, fullscreen: true })
			} else {
				redrawCanvas()
			}
			await exportPreview()
		} finally {
			if (!wasOpen) {
				fullscreenEditing.value = false
				teardownCanvas()
			}
		}
	}

	const invalidateInteractionCache = () => {
		interactionFrameCache = null
		useInteractionCache = false
	}

	const redrawBaseAndMosaic = () => {
		if (!ctx || !baseImage || !canvasReady) return
		const { width, height } = layout.value
		ctx.clearRect(0, 0, width, height)
		ctx.drawImage(baseImage, 0, 0, width, height)
		mosaicStrokes.value.forEach((stroke) => {
			applyMosaicAt(ctx, stroke.x, stroke.y, stroke.brush, stroke.block, layout.value, canvasDpr)
		})
	}

	const captureInteractionFrame = () => {
		if (!ctx || !canvasNode) return
		redrawBaseAndMosaic()
		try {
			interactionFrameCache = ctx.getImageData(0, 0, canvasNode.width, canvasNode.height)
		} catch (e) {
			interactionFrameCache = null
		}
	}

	const redrawFromInteractionCache = () => {
		if (!ctx || !interactionFrameCache) {
			redrawCanvas()
			return
		}
		ctx.putImageData(interactionFrameCache, 0, 0)
		ctx.setTransform(1, 0, 0, 1, 0, 0)
		ctx.scale(canvasDpr, canvasDpr)
		textLayers.value.forEach((layer) => {
			drawTextLayer(ctx, layer)
		})
		if (editMode.value === 'text' && selectedTextIndex.value >= 0) {
			const layer = textLayers.value[selectedTextIndex.value]
			if (layer) {
				const { width, height } = layout.value
				drawTextSelection(ctx, layer, width, height)
			}
		}
	}

	const cancelScheduledRedraw = () => {
		if (redrawRafId != null) {
			if (typeof cancelAnimationFrame === 'function') {
				cancelAnimationFrame(redrawRafId)
			} else {
				clearTimeout(redrawRafId)
			}
			redrawRafId = null
		}
		redrawScheduled = false
	}

	const scheduleRedraw = () => {
		if (redrawScheduled || !canvasReady) return
		redrawScheduled = true
		const raf =
			typeof requestAnimationFrame === 'function'
				? requestAnimationFrame
				: (fn) => setTimeout(fn, 16)
		redrawRafId = raf(() => {
			redrawScheduled = false
			redrawRafId = null
			if (useInteractionCache && interactionFrameCache) {
				redrawFromInteractionCache()
			} else {
				redrawCanvas()
			}
		})
	}

	const redrawCanvas = (options = {}) => {
		const { skipSelection = false } = options
		if (!ctx || !baseImage || !canvasReady) return
		const { width, height } = layout.value
		ctx.clearRect(0, 0, width, height)
		ctx.drawImage(baseImage, 0, 0, width, height)

		mosaicStrokes.value.forEach((stroke) => {
			applyMosaicAt(ctx, stroke.x, stroke.y, stroke.brush, stroke.block, layout.value, canvasDpr)
		})

		textLayers.value.forEach((layer) => {
			drawTextLayer(ctx, layer)
		})

		if (
			!skipSelection &&
			editMode.value === 'text' &&
			selectedTextIndex.value >= 0
		) {
			const layer = textLayers.value[selectedTextIndex.value]
			if (layer) drawTextSelection(ctx, layer, width, height)
		}
	}

	const deleteSelectedText = () => {
		const index = selectedTextIndex.value
		if (index < 0) return
		pushHistory()
		textLayers.value.splice(index, 1)
		selectedTextIndex.value = -1
		textInput.value = ''
		textDeleteHandleTap = false
		invalidateInteractionCache()
		redrawCanvas()
	}

	const selectTextLayer = (index) => {
		selectedTextIndex.value = index
		const layer = textLayers.value[index]
		if (!layer) return
		fontSize.value = layer.fontSize
		textColor.value = layer.color
		textInput.value = layer.text
		pendingTextPlace.value = false
	}

	const scaleSelectedText = (delta) => {
		if (selectedTextIndex.value < 0 || !ctx) return
		pushHistory()
		const layer = textLayers.value[selectedTextIndex.value]
		if (!layer) return
		layer.fontSize = Math.max(12, Math.min(72, layer.fontSize + delta))
		fontSize.value = layer.fontSize
		clampLayerByIndex(selectedTextIndex.value)
		redrawCanvas()
	}

	const resolveTextHitIndex = (px, py) => {
		let hitIndex = hitTestTextLayer(ctx, textLayers.value, px, py)
		if (hitIndex < 0 && selectedTextIndex.value >= 0) {
			const layer = textLayers.value[selectedTextIndex.value]
			if (layer) {
				const box = measureTextLayer(ctx, layer)
				const pad = 32
				if (
					px >= box.x - pad &&
					px <= box.x + box.width + pad &&
					py >= box.y - pad &&
					py <= box.y + box.height + pad
				) {
					hitIndex = selectedTextIndex.value
				}
			}
		}
		return hitIndex
	}

	const clampLayerByIndex = (index) => {
		const layer = textLayers.value[index]
		if (!layer || !ctx) return
		clampTextLayerPosition(layer, layout.value.width, layout.value.height, ctx)
	}

	const addMosaicPoint = (x, y) => {
		if (lastMosaicPoint) {
			const dx = x - lastMosaicPoint.x
			const dy = y - lastMosaicPoint.y
			if (dx * dx + dy * dy < MIN_MOSAIC_POINT_DIST * MIN_MOSAIC_POINT_DIST) {
				return
			}
		}
		lastMosaicPoint = { x, y }

		const block = Math.max(8, Math.floor(brushSize.value / 3))
		mosaicStrokes.value.push({
			x,
			y,
			brush: brushSize.value,
			block
		})
		applyMosaicAt(ctx, x, y, brushSize.value, block, layout.value, canvasDpr)
		invalidateInteractionCache()
	}

	const setEditMode = (mode) => {
		editMode.value = mode
		if (mode !== 'text') {
			selectedTextIndex.value = -1
			pendingTextPlace.value = false
		} else {
			if (textLayers.value.length && selectedTextIndex.value < 0) {
				selectTextLayer(textLayers.value.length - 1)
			}
			pendingTextPlace.value = !!textInput.value.trim() && selectedTextIndex.value < 0
		}
		if (canvasReady) {
			redrawCanvas()
		}
	}

	const onTextInput = () => {
		if (editMode.value !== 'text' || selectedTextIndex.value < 0 || !ctx) return
		const layer = textLayers.value[selectedTextIndex.value]
		if (!layer) return
		const text = textInput.value.trim()
		if (!text) return
		layer.text = text
		clampLayerByIndex(selectedTextIndex.value)
		invalidateInteractionCache()
		redrawCanvas()
	}

	const onBrushChange = (e) => {
		brushSize.value = e.detail.value
	}

	const onFontSizeChange = (e) => {
		const size = Math.round(Number(e.detail.value) || 28)
		fontSize.value = size
		if (editMode.value === 'text' && selectedTextIndex.value >= 0) {
			const layer = textLayers.value[selectedTextIndex.value]
			if (layer) {
				layer.fontSize = size
				clampLayerByIndex(selectedTextIndex.value)
				redrawCanvas()
			}
		}
	}

	const onTextColorPick = (color) => {
		textColor.value = color
		if (editMode.value === 'text' && selectedTextIndex.value >= 0) {
			const layer = textLayers.value[selectedTextIndex.value]
			if (layer) {
				layer.color = color
				layer.stroke = color === '#ffffff' ? '#000000' : '#ffffff'
				redrawCanvas()
			}
		}
	}

	const onCanvasTouchStart = (e) => {
		refreshCanvasRect()

		if (editMode.value === 'mosaic') {
			const p = getCanvasPoint(e)
			if (!p) return
			isDrawing = true
			lastMosaicPoint = null
			pushHistory()
			addMosaicPoint(p.x, p.y)
			return
		}

		if (editMode.value !== 'text' || !ctx) return

		const touches = e.touches || []
		if (touches.length >= 2) {
			let index = selectedTextIndex.value
			if (index < 0) {
				const p = getCanvasPointFromTouch(touches[0], e)
				if (p) index = resolveTextHitIndex(p.x, p.y)
			}
			if (index >= 0) {
				selectTextLayer(index)
				pushHistory()
				const layer = textLayers.value[index]
				textPinchSnapshot = {
					index,
					startDist: touchDistance(touches[0], touches[1]),
					startFontSize: layer.fontSize
				}
				textDragSnapshot = null
				textTouchStart = null
				captureInteractionFrame()
				useInteractionCache = true
			}
			return
		}

		const p = getCanvasPoint(e)
		if (!p) return

		if (selectedTextIndex.value >= 0) {
			const selLayer = textLayers.value[selectedTextIndex.value]
			const { width, height } = layout.value
			if (
				selLayer &&
				hitTestTextDeleteHandle(ctx, selLayer, p.x, p.y, width, height)
			) {
				textDeleteHandleTap = true
				textTouchMoved = false
				textDragSnapshot = null
				textTouchStart = null
				textPinchSnapshot = null
				return
			}
		}
		textDeleteHandleTap = false

		const hitIndex = resolveTextHitIndex(p.x, p.y)
		if (hitIndex >= 0) {
			selectTextLayer(hitIndex)
			const layer = textLayers.value[hitIndex]
			textDragSnapshot = {
				index: hitIndex,
				startX: p.x,
				startY: p.y,
				layerX: layer.x,
				layerY: layer.y
			}
			textPinchSnapshot = null
			textTouchStart = null
			textTouchMoved = false
			invalidateInteractionCache()
			redrawCanvas()
			return
		}

		selectedTextIndex.value = -1
		redrawCanvas()
		if (!textInput.value.trim()) {
			uni.showToast({ title: '请先输入文字', icon: 'none' })
			return
		}
		textTouchStart = p
		textTouchMoved = false
		textDragSnapshot = null
		textPinchSnapshot = null
	}

	const onCanvasTouchMove = (e) => {
		if (editMode.value === 'mosaic') {
			if (!isDrawing) return
			const p = getCanvasPoint(e)
			if (p) addMosaicPoint(p.x, p.y)
			return
		}

		if (editMode.value !== 'text') return

		const touches = e.touches || []
		if (textPinchSnapshot && touches.length >= 2) {
			const dist = touchDistance(touches[0], touches[1])
			if (!dist || !textPinchSnapshot.startDist) return
			const layer = textLayers.value[textPinchSnapshot.index]
			if (!layer) return
			const ratio = dist / textPinchSnapshot.startDist
			layer.fontSize = Math.max(
				12,
				Math.min(72, Math.round(textPinchSnapshot.startFontSize * ratio))
			)
			fontSize.value = layer.fontSize
			clampLayerByIndex(textPinchSnapshot.index)
			scheduleRedraw()
			return
		}

		if (textDragSnapshot) {
			const p = getCanvasPoint(e)
			if (!p) return
			if (!textTouchMoved) {
				const dx = p.x - textDragSnapshot.startX
				const dy = p.y - textDragSnapshot.startY
				if (dx * dx + dy * dy > 36) {
					textTouchMoved = true
					pushHistory()
					captureInteractionFrame()
					useInteractionCache = true
				}
			}
			if (!textTouchMoved) return
			const layer = textLayers.value[textDragSnapshot.index]
			if (!layer) return
			layer.x = textDragSnapshot.layerX + (p.x - textDragSnapshot.startX)
			layer.y = textDragSnapshot.layerY + (p.y - textDragSnapshot.startY)
			clampLayerByIndex(textDragSnapshot.index)
			textTouchMoved = true
			scheduleRedraw()
			return
		}

		if (textTouchStart) {
			const p = getCanvasPoint(e)
			if (!p) return
			const dx = p.x - textTouchStart.x
			const dy = p.y - textTouchStart.y
			if (dx * dx + dy * dy > 36) {
				textTouchMoved = true
			}
		}
	}

	const onCanvasTouchEnd = () => {
		if (editMode.value === 'mosaic') {
			isDrawing = false
			lastMosaicPoint = null
			return
		}

		if (editMode.value === 'text') {
			cancelScheduledRedraw()
			if (textDeleteHandleTap && !textTouchMoved) {
				deleteSelectedText()
			} else {
				if (textPinchSnapshot) {
					textPinchSnapshot = null
					invalidateInteractionCache()
					redrawCanvas()
				}
				if (textDragSnapshot) {
					textDragSnapshot = null
					invalidateInteractionCache()
					redrawCanvas()
				}
				if (textTouchStart && !textTouchMoved && textInput.value.trim()) {
					addTextLayer(textTouchStart.x, textTouchStart.y)
				}
			}
		}

		textTouchStart = null
		textTouchMoved = false
		textDeleteHandleTap = false
	}

	const addTextLayer = (clickX, clickY) => {
		const text = textInput.value.trim()
		if (!text) {
			uni.showToast({ title: '请先输入文字', icon: 'none' })
			return
		}
		pushHistory()
		ctx.save()
		ctx.font = `bold ${fontSize.value}px sans-serif`
		const metrics = ctx.measureText(text)
		ctx.restore()
		// 以点击位置为中心放置文字
		const x = Math.max(0, Math.min(layout.value.width - metrics.width, clickX - metrics.width / 2))
		const y = Math.max(0, Math.min(layout.value.height - fontSize.value, clickY - fontSize.value / 2))
		const layer = {
			text,
			x,
			y,
			fontSize: fontSize.value,
			color: textColor.value,
			stroke: textColor.value === '#ffffff' ? '#000000' : '#ffffff'
		}
		textLayers.value.push(layer)
		selectedTextIndex.value = textLayers.value.length - 1
		selectTextLayer(selectedTextIndex.value)
		invalidateInteractionCache()
		redrawCanvas()
		pendingTextPlace.value = false
	}

	const undoLast = async () => {
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

		if (selectedTextIndex.value >= textLayers.value.length) {
			selectedTextIndex.value = -1
		}

		if (fullscreenEditing.value && canvasReady) {
			invalidateInteractionCache()
			redrawCanvas()
			return
		}

		await refreshPreviewAfterEdit()
	}

	const resetAll = () => {
		fullscreenEditing.value = false
		openingEditor.value = false
		imagePath.value = ''
		previewDisplayPath.value = ''
		imgNaturalSize.value = { width: 0, height: 0 }
		teardownCanvas()
		mosaicStrokes.value = []
		textLayers.value = []
		historyStack.value = []
		textInput.value = ''
		editMode.value = 'mosaic'
		selectedTextIndex.value = -1
	}

	const chooseImage = () => {
		uni.chooseImage({
			count: 1,
			sourceType: ['album', 'camera'],
			success: (res) => {
				const path = res.tempFilePaths?.[0]
				if (!path) return
				fullscreenEditing.value = false
				teardownCanvas()
				imagePath.value = path
				previewDisplayPath.value = ''
				mosaicStrokes.value = []
				textLayers.value = []
				historyStack.value = []
				textInput.value = ''
				editMode.value = 'mosaic'
				selectedTextIndex.value = -1
			}
		})
	}

	const saveImage = async () => {
		if (saving.value) return
		saving.value = true
		try {
			let filePath = previewDisplayPath.value
			if (!filePath && canvasReady && canvasNode) {
				filePath = await exportCanvasToTemp()
			}
			if (!filePath && (mosaicStrokes.value.length || textLayers.value.length)) {
				await refreshPreviewAfterEdit()
				filePath = previewDisplayPath.value
			}
			if (!filePath) {
				filePath = imagePath.value
			}
			if (!filePath) {
				uni.showToast({ title: '请先选择图片', icon: 'none' })
				return
			}

			await new Promise((resolve, reject) => {
				uni.saveImageToPhotosAlbum({
					filePath,
					success: () => {
						uni.showToast({ title: '已保存到相册', icon: 'success' })
						resolve()
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
						reject(err)
					}
				})
			})
		} catch (err) {
			console.error('[saveImage]', err)
		} finally {
			saving.value = false
		}
	}
</script>

<style lang="scss" scoped>
	.image-edit-page {
		min-height: 100vh;
		padding: 30rpx;
		padding-bottom: 140rpx;
		box-sizing: border-box;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
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
			color: var(--text-primary);
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
			background: linear-gradient(to bottom, #aa2267, #fe764e);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}

		.empty-title {
			font-size: 32rpx;
			color: var(--text-primary);
			margin-bottom: 12rpx;
		}

		.empty-desc {
			font-size: 26rpx;
			color: var(--text-muted);
		}
	}

	.preview-wrap {
		position: relative;
		width: 100%;
		height: 480rpx;
		display: flex;
		align-items: center;
		justify-content: center;

		.preview-image {
			width: 100%;
			height: 100%;
		}

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
		max-width: 100%;
	}

	.preview-bg {
		position: absolute;
		left: 0;
		top: 0;
		display: block;
		z-index: 0;
	}

	.edit-canvas {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
		display: block;
		background: transparent;
		pointer-events: none;
	}

	.touch-overlay {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		z-index: 3;
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

	.start-edit-btn {
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
			color: var(--text-primary);
		}

		&:active:not(.disabled) {
			opacity: 0.9;
			transform: scale(0.98);
		}
	}

	.fullscreen-editor {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
	}

	.fullscreen-header {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16rpx 24rpx;
		padding-top: calc(16rpx + env(safe-area-inset-top));
		border-bottom: 1rpx solid var(--border-color, rgba(255, 255, 255, 0.08));

		.header-title {
			font-size: 32rpx;
			font-weight: 600;
			color: var(--text-primary);
		}

		.header-btn {
			min-width: 120rpx;
			padding: 12rpx 20rpx;
			border-radius: 32rpx;
			background: rgba(79, 172, 254, 0.15);
			border: 2rpx solid rgba(79, 172, 254, 0.35);
			text-align: center;

			text {
				font-size: 26rpx;
				color: #4facfe;
			}

			&.primary {
				background: linear-gradient(to right, #4facfe, #00f2fe);
				border-color: transparent;

				text {
					color: var(--text-primary);
					font-weight: bold;
				}
			}

			&:active {
				opacity: 0.85;
			}
		}
	}

	.fullscreen-scroll {
		flex: 1;
		height: 0;
		min-height: 0;
	}

	.canvas-section {
		height: 65vh;
		min-height: 65vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 16rpx;
		box-sizing: border-box;
		position: relative;
	}

	.canvas-stage {
		flex-shrink: 0;
	}

	.canvas-hint {
		position: absolute;
		left: 16rpx;
		bottom: 16rpx;
		padding: 8rpx 20rpx;
		border-radius: 24rpx;
		background: rgba(0, 0, 0, 0.55);
		z-index: 4;
		pointer-events: none;

		text {
			font-size: 24rpx;
			color: #4facfe;
		}
	}

	.fullscreen-tools {
		box-sizing: border-box;
		padding: 20rpx 24rpx;
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
		background: var(--surface-bg, rgba(255, 255, 255, 0.04));
		border-top: 1rpx solid var(--border-color, rgba(255, 255, 255, 0.08));
	}

	.tool-bar {
		display: flex;
		gap: 16rpx;
		margin-bottom: 24rpx;
		flex-wrap: wrap;

		.tool-tab {
			flex: 1;
			min-width: 140rpx;
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 20rpx 0;
			border-radius: 16rpx;
			background: var(--surface-bg-light);

			&.active {
				background: rgba(79, 172, 254, 0.2);
				border: 2rpx solid rgba(79, 172, 254, 0.5);
			}

			&.undo-tab {
				flex: 0 0 auto;
				min-width: 120rpx;
				padding: 20rpx 24rpx;
			}

			.tab-icon {
				font-size: 36rpx;
				color: var(--text-primary);
				margin-bottom: 8rpx;
			}

			.tab-name {
				font-size: 24rpx;
				color: var(--text-soft);
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
		color: var(--text-secondary);
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
		color: var(--text-primary);
		background: var(--surface-bg);
		border-radius: 12rpx;
	}

	.text-input-ph {
		color: var(--text-faint);
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

	.panel-tip {
		font-size: 22rpx;
		color: var(--text-muted);
		text-align: center;
		display: block;
	}

	.scale-btn-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 12rpx;
	}

	.scale-btn {
		flex-shrink: 0;
		min-width: 88rpx;
		padding: 16rpx 24rpx;
		border-radius: 32rpx;
		background: rgba(79, 172, 254, 0.2);
		border: 2rpx solid rgba(79, 172, 254, 0.45);
		text-align: center;

		text {
			font-size: 30rpx;
			font-weight: bold;
			color: #4facfe;
		}

		&:active {
			opacity: 0.85;
		}
	}

	.scale-hint {
		flex: 1;
		font-size: 22rpx;
		color: var(--text-muted);
		text-align: center;
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
			color: var(--text-primary);
		}

		&:active:not(.disabled) {
			opacity: 0.9;
			transform: scale(0.98);
		}
	}
</style>
