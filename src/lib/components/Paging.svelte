<script lang="ts">
	type Props = {
		currentPage: number;
		totalPages: number;
		onPageChange: (event: CustomEvent<{ page: number }>) => void;
	};

	let { currentPage, totalPages, onPageChange }: Props = $props();
	let pages = $state<(number | string)[]>([]);

	// 표시할 페이지 번호 계산
	$effect(() => {
		const newPages: (number | string)[] = [];
		const maxVisible = 5; // 한 번에 보여줄 최대 페이지 수

		if (totalPages <= maxVisible) {
			// 전체 페이지가 maxVisible 이하면 모든 페이지 표시
			for (let i = 1; i <= totalPages; i++) {
				newPages.push(i);
			}
		} else {
			// 항상 첫 페이지 표시
			newPages.push(1);

			// 현재 페이지 주변 페이지 계산
			let start = Math.max(2, currentPage - 1);
			let end = Math.min(totalPages - 1, currentPage + 1);

			// 첫 페이지와 간격이 있으면 ... 추가
			if (start > 2) {
				newPages.push('...');
			}

			// 중간 페이지들 추가
			for (let i = start; i <= end; i++) {
				newPages.push(i);
			}

			// 마지막 페이지와 간격이 있으면 ... 추가
			if (end < totalPages - 1) {
				newPages.push('...');
			}

			// 마지막 페이지 표시
			if (totalPages > 1) {
				newPages.push(totalPages);
			}
		}

		pages = newPages;
	});

	// 페이지 변경 핸들러
	function handlePageChange(this: HTMLElement, page: number) {
		if (page !== currentPage && page >= 1 && page <= totalPages) {
			const event = new CustomEvent('pagechange', {
				detail: { page }
			});
			onPageChange(event);
		}
	}
</script>

<nav class="paging" aria-label="페이지 네비게이션">
	<ul>
		<!-- 이전 페이지 버튼 -->
		<li>
			<button
				class="nav-btn"
				disabled={currentPage === 1}
				onclick={function (this: HTMLButtonElement) {
					handlePageChange.call(this, currentPage - 1);
				}}
				aria-label="이전 페이지"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
					<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
				</svg>
			</button>
		</li>

		<!-- 페이지 번호 -->
		{#each pages as page}
			<li>
				{#if typeof page === 'number'}
					<button
						class="page-btn"
						class:active={page === currentPage}
						onclick={function (this: HTMLButtonElement) {
							handlePageChange.call(this, page);
						}}
						aria-label={`${page} 페이지`}
						aria-current={page === currentPage ? 'page' : undefined}
					>
						{page}
					</button>
				{:else}
					<span class="ellipsis">...</span>
				{/if}
			</li>
		{/each}

		<!-- 다음 페이지 버튼 -->
		<li>
			<button
				class="nav-btn"
				disabled={currentPage === totalPages}
				onclick={function (this: HTMLButtonElement) {
					handlePageChange.call(this, currentPage + 1);
				}}
				aria-label="다음 페이지"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
					<path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
				</svg>
			</button>
		</li>
	</ul>
</nav>

<style>
	.paging {
		padding: 0;
	}

	ul {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	button {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		height: 2rem;
		padding: 0 0.5rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		color: #666;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	button:hover:not(:disabled) {
		background: #f5f5f5;
		border-color: #999;
		color: #333;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-btn.active {
		background: #007bff;
		border-color: #007bff;
		color: white;
	}

	.ellipsis {
		color: #666;
		padding: 0 0.5rem;
	}

	.nav-btn {
		padding: 0;
		width: 2rem;
	}

	.nav-btn svg {
		fill: currentColor;
	}
</style>
