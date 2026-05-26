<template>
	<view class="safe-area-bottom" />
</template>

<style lang="scss" scoped>
.safe-area-bottom {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: constant(safe-area-inset-bottom);
	height: env(safe-area-inset-bottom);
	background-color: #233968;
	z-index: 9998;
	pointer-events: none;
}
</style>
