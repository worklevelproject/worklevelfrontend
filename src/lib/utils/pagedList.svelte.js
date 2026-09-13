/**
 * 목록 조회 API가 공통으로 쓰는 PageResponse<T,S> 봉투({content, search, offset, limit,
 * totalCount, hasNext})용 "더보기" 페이징 헬퍼. 서버가 limit을 고정해두고 offset만 받으므로,
 * 화면은 offset 상태만 들고 있다가 다 못 채운 페이지(hasNext=true)일 때만 "더보기" 버튼을 보여주면
 * 된다(무한스크롤·페이지번호 아님).
 *
 * 사용 예:
 *   const notices = createPagedList((offset) => getNotices($session.storeId, offset));
 *   onMount(() => notices.load());
 *   ...
 *   {#each notices.items as n}...{/each}
 *   {#if notices.hasNext}<button onclick={notices.loadMore}>더보기</button>{/if}
 */
export function createPagedList(fetchPage) {
	let items = $state([]);
	let hasNext = $state(false);
	let loading = $state(false);
	let offset = 0;

	/** 처음부터(offset=0) 다시 불러온다. 탭 전환/필터 변경/새로고침 시 사용. */
	async function load() {
		loading = true;
		try {
			const page = await fetchPage(0);
			items = page.content;
			hasNext = page.hasNext;
			offset = page.content.length;
		} finally {
			loading = false;
		}
	}

	/** 다음 페이지를 이어 붙인다. hasNext가 false거나 이미 로딩 중이면 아무것도 안 한다. */
	async function loadMore() {
		if (!hasNext || loading) return;
		loading = true;
		try {
			const page = await fetchPage(offset);
			items = [...items, ...page.content];
			hasNext = page.hasNext;
			offset += page.content.length;
		} finally {
			loading = false;
		}
	}

	return {
		get items() {
			return items;
		},
		get hasNext() {
			return hasNext;
		},
		get loading() {
			return loading;
		},
		load,
		loadMore
	};
}
