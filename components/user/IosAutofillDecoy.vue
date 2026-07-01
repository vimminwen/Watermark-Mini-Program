<template>
	<!-- iOS WebKit 会在「账号 + 密码」之间识别注册表单并强填密码，插入占位 input 干扰识别 -->
	<input
		class="ios-autofill-decoy"
		type="text"
		value=""
		autocomplete="off"
	/>
</template>

<style lang="scss" scoped>
	.ios-autofill-decoy {
		position: fixed;
		left: -9999px;
		top: -9999px;
		width: 1px;
		height: 1px;
		opacity: 0;
		z-index: -1;
		pointer-events: none;
	}
</style>
