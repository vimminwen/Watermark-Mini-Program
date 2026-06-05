import dataList from '@/api/data/list.json';

/** full=已有完整页 | partial=仅部分前端能力 | backend=纯前端无法独立完成 */
export const TOOL_MODE = {
	FULL: 'full',
	PARTIAL: 'partial',
	BACKEND: 'backend'
};

/** 工具 id → 页面与能力类型 */
export const TOOL_ROUTE_MAP = {
	'46': { mode: TOOL_MODE.FULL, path: '/pages/tool/imageEdit' },
	'47': { mode: TOOL_MODE.FULL, path: '/pages/tool/smartErase' },
	'48': { mode: TOOL_MODE.FULL, path: '/pages/tool/cutout' },
	'49': { mode: TOOL_MODE.FULL, path: '/pages/tool/styleTransfer?styleKey=anime' },
	'50': { mode: TOOL_MODE.BACKEND, path: '/pages/tool/feature' },
	'51': { mode: TOOL_MODE.BACKEND, path: '/pages/tool/feature' },
	'52': { mode: TOOL_MODE.FULL, path: '/pages/tool/videoRemove' },
	'54': { mode: TOOL_MODE.FULL, path: '/pages/tool/videoTextExtract' },
	'62': { mode: TOOL_MODE.FULL, path: '/pages/tool/audioTextExtract' },
	'55': { mode: TOOL_MODE.FULL, path: '/pages/tool/tool' },
	'56': { mode: TOOL_MODE.FULL, path: '/pages/tool/styleTransfer?styleKey=cyber' },
	'57': { mode: TOOL_MODE.FULL, path: '/pages/tool/styleTransfer?styleKey=guofeng' },
	'58': { mode: TOOL_MODE.FULL, path: '/pages/tool/imageCompress' },
	'59': { mode: TOOL_MODE.FULL, path: '/pages/tool/imageTextExtract' },
	'60': { mode: TOOL_MODE.FULL, path: '/pages/tool/imageCrop' },
	'61': { mode: TOOL_MODE.FULL, path: '/pages/filter/filter' }
};

/** 首页快捷工具（location === 1） */
export const QUICK_TOOL_LOCATION = '1';

export const filterQuickTools = (list) =>
	(list || [])
		.filter((item) => String(item.location) === QUICK_TOOL_LOCATION && item.del !== '1')
		.sort((a, b) => Number(a.sort) - Number(b.sort));

/** 首页更多工具（location 不为 1） */
export const filterMoreTools = (list) =>
	(list || [])
		.filter((item) => String(item.location) !== QUICK_TOOL_LOCATION && item.del !== '1')
		.sort((a, b) => Number(a.sort) - Number(b.sort));

const sortByToolOrder = (a, b) => Number(a.sort) - Number(b.sort);

/** 功能页按分类筛选（cid 为空表示全部） */
export const filterToolsByCategory = (list, cid) => {
	const base = (list || []).filter((item) => item.del !== '1');
	if (cid === '' || cid == null) {
		return base.sort(sortByToolOrder);
	}
	return base
		.filter((item) => String(item.cid) === String(cid))
		.sort(sortByToolOrder);
};

export const BACKEND_REQUIRED_MESSAGE =
	'该功能依赖服务端算力，小程序端无法独立完成，请等待后续版本接入。';

export const getToolList = () => dataList.filter((item) => item.del !== '1');

export const getToolById = (id) => {
	const item = dataList.find((t) => String(t.id) === String(id));
	const route = TOOL_ROUTE_MAP[String(id)] || {
		mode: TOOL_MODE.BACKEND,
		path: '/pages/tool/feature'
	};
	return item ? { ...item, ...route } : null;
};

const TAB_BAR_PATHS = ['/pages/index/index', '/pages/use/index', '/pages/tool/videoRemove', '/pages/filter/filter', '/pages/my/index'];

/** 是否为 tabBar 页面 */
export const isTabBarPage = (path) => {
	const base = String(path || '').split('?')[0];
	return TAB_BAR_PATHS.includes(base);
};

/** 按路径跳转（自动区分 tabBar / 普通页，供轮播、菜单等使用） */
export const navigateByPageUrl = (url) => {
	const full = String(url || '').trim();
	if (!full) return;
	const path = full.split('?')[0];
	if (isTabBarPage(path)) {
		uni.switchTab({
			url: path,
			fail: () => uni.navigateTo({ url: full })
		});
		return;
	}
	uni.navigateTo({ url: full });
};

/** 生成功能页跳转地址（供首页、功能列表使用） */
export const buildToolUrl = (item) => {
	if (!item?.id) return '/pages/tool/feature';

	const route = TOOL_ROUTE_MAP[String(item.id)] || {
		mode: TOOL_MODE.BACKEND,
		path: '/pages/tool/feature'
	};
	const title = encodeURIComponent(item.title || '功能');
	const path = item.url?.trim() || route.path;

	if (route.mode === TOOL_MODE.BACKEND || path.includes('/pages/tool/feature')) {
		return `/pages/tool/feature?id=${item.id}&title=${title}`;
	}
	if (path.includes('?')) {
		return path;
	}
	return `${path}?title=${title}`;
};
