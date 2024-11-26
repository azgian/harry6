<script lang="ts">
	import { db } from '$lib/firebase';
	import {
		collection,
		query,
		getDocs,
		orderBy,
		limit,
		startAfter,
		type QueryConstraint,
		where,
		getCountFromServer,
		onSnapshot,
		type WhereFilterOp,
		type OrderByDirection
	} from 'firebase/firestore';
	import { formatDate } from '$lib';
	import { toast } from '$lib/components/toast';
	import type { ToastType } from '$lib/components/toast';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import LoaderBox from '$lib/components/LoaderBox.svelte';
	import Loader from '$lib/components/loader/Loader.svelte';
	import Paging from '$lib/components/Paging.svelte';
	import type { OrderType } from '$lib/types/trade';
	import { scrollToElement } from '$lib';
	import { user } from '$lib/auth';

	type Action = {
		label?: string; // 버튼 텍스트
		icon?: string; // 버튼 아이콘
		type?:
			| 'primary'
			| 'secondary'
			| 'success'
			| 'warning'
			| 'danger'
			| 'default'
			| 'outline'
			| 'blink'; // 버튼 스타일
		condition?: (item: any) => boolean; // 버튼 표시 조건
		onClick: (item: any) => void | Promise<void>;
		disabled?: (item: any) => boolean; // 버튼 비활성화 조건 추가
		confirmMessage?: string; // 확인 대화상자 표시 여부
		useLoader?: boolean; // 로딩 아이콘 표시 여부
	};

	type Status = {
		condition?: (item: any) => 'success' | 'pending' | 'error' | '';
	};

	type FormatElement = {
		element: string;
		props: Record<string, any>;
	};

	type Column = {
		key: string;
		label?: string;
		type?: 'text' | 'date' | 'number' | 'currency' | 'status' | 'user' | 'isIcon' | 'html';
		className?: string | ((value: string | number | OrderType) => string | undefined);
		format?: (value: any, item?: any) => string | FormatElement | Promise<string | FormatElement>;
	};

	type TooltipText = (item: any) => string;

	type Props = {
		collectionName: string; // Firestore 컬렉션명
		queryOptions?: {
			orderByField?: string;
			orderDirection?: 'asc' | 'desc';
			whereConditions?: {
				field: string;
				operator: '==' | '>' | '<' | '>=' | '<=' | 'in' | 'not-in';
				value: any;
			}[];
		};
		loadingStates?: Map<any, any>;
		logTitle?: string;
		iconTitle?: string;
		hideList?: boolean;
		useHideList?: boolean;
		status?: Status;
		leads?: Column[];
		columns?: Column[];
		tails?: Column[];
		tradeInfo?: Column[];
		configBtn?: Action[];
		actions?: Action[];
		messageStoreType?: 'message' | 'exchange' | 'trade' | 'userTrade' | '';
		itemsPerPage?: number;
		onDataLoad?: (data: any[]) => void;
		onActionStart?: (buttonKey: string) => void; // 액션 시작 시 호출
		onActionEnd?: (buttonKey: string) => void; // 액션 종료 시 호출
		onItemClick?: (item: any) => void; // 아이템 클릭 핸들러 추가
		useItemClick?: boolean; // 아이템 클릭 기능 사용 여부
		tooltipText?: TooltipText; // 툴팁 텍스트
	};

	let {
		collectionName,
		queryOptions = {},
		loadingStates = new Map(),
		logTitle = '',
		iconTitle = '',
		hideList = false,
		useHideList = false,
		status = {},
		leads = [],
		columns = [],
		tails = [],
		tradeInfo = [],
		configBtn = [],
		actions = [],
		messageStoreType = '',
		itemsPerPage = 15,
		onDataLoad,
		onActionStart,
		onActionEnd,
		onItemClick,
		useItemClick = false,
		tooltipText = () => ''
	}: Props = $props();

	let logs = $state<Record<string, any>[]>([]);
	let lastDoc = $state<any>(null);
	let hideListState = $state(hideList);
	let abortController: AbortController;
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);
	let unsubscribe: (() => void) | null = null;

	const formatValue = async (value: any, column: Column, item?: any) => {
		if (column.format) {
			const formattedValue = await column.format(value, item);
			return formattedValue;
		}

		switch (column.type) {
			case 'date':
				return formatDate(value, true);
			case 'number':
				return value?.toLocaleString('ko-KR');
			case 'currency':
				return `₩ ${value?.toLocaleString('ko-KR')}`;
			case 'status':
				return value;
			default:
				return value;
		}
	};

	// 확인 대화상자 처리 함수
	const handleAction = async (action: Action, item: any, toastType: ToastType = 'primary') => {
		if (abortController) {
			abortController.abort();
		}
		abortController = new AbortController();

		const buttonKey = `${action.label}-${item.id}`;

		try {
			// 외부에서 로딩 상태 제어
			onActionStart?.(buttonKey);

			if (action.confirmMessage) {
				toast.showToast(
					action.confirmMessage,
					toastType,
					null,
					true,
					async () => {
						try {
							await action.onClick(item);
							await loadData();
						} catch (error: any) {
							if (error.name !== 'AbortError') {
								console.error('Action failed:', error);
							}
						} finally {
							onActionEnd?.(buttonKey);
						}
					},
					() => {
						toast.hideToast();
						onActionEnd?.(buttonKey);
					}
				);
			} else {
				try {
					await action.onClick(item);
					await loadData();
				} catch (error: any) {
					if (error.name !== 'AbortError') {
						console.error('Action failed:', error);
					}
				} finally {
					onActionEnd?.(buttonKey);
				}
			}
		} catch (error: any) {
			if (error.name !== 'AbortError') {
				console.error('Action failed:', error);
				onActionEnd?.(buttonKey);
			}
		}
	};

	// 타입 정의 수정
	type WhereCondition = {
		field: string;
		operator: WhereFilterOp; // Firebase의 WhereFilterOp 타입 사용
		value: any;
	};

	interface QueryOptions {
		whereConditions?: WhereCondition[];
		orderByField?: string;
		orderDirection?: OrderByDirection;
	}

	// 쿼리 생성 함수는 그대로 유지
	function createQuery() {
		const constraints: QueryConstraint[] = [];

		// 정렬 조건 추가
		if (queryOptions.orderByField) {
			constraints.push(orderBy(queryOptions.orderByField, queryOptions.orderDirection || 'desc'));
		}

		// where 조건 추가
		if (queryOptions.whereConditions) {
			queryOptions.whereConditions.forEach((condition) => {
				constraints.push(where(condition.field, condition.operator, condition.value));
			});
		}

		// 페이지당 아이템 수 제한
		constraints.push(limit(itemsPerPage));

		// 페이지네이션을 위한 startAfter
		if (lastDoc && currentPage > 1) {
			constraints.push(startAfter(lastDoc));
		}

		return query(collection(db, collectionName), ...constraints);
	}

	// 전체 문서 수를 가져오는 함수
	async function getTotalCount() {
		try {
			const constraints: QueryConstraint[] = [];

			// where 조건 추가
			if (queryOptions.whereConditions) {
				queryOptions.whereConditions.forEach((condition) => {
					constraints.push(where(condition.field, condition.operator, condition.value));
				});
			}

			const q = query(collection(db, collectionName), ...constraints);
			const snapshot = await getCountFromServer(q);
			totalItems = snapshot.data().count;
			totalPages = Math.ceil(totalItems / itemsPerPage);
		} catch (error) {
			console.error('전체 문서 수 조회 실패:', error);
		}
	}

	// 실시간 데이터 감시 함수
	function watchData() {
		if (unsubscribe) {
			unsubscribe();
		}

		try {
			const q = createQuery();
			unsubscribe = onSnapshot(
				q,
				(snapshot) => {
					if (!snapshot.empty) {
						// 기존 데이터 유지하면서 변경된 부분만 업데이트
						snapshot.docChanges().forEach((change) => {
							if (change.type === 'modified') {
								const index = logs.findIndex((log) => log.id === change.doc.id);
								if (index !== -1) {
									const updatedData = {
										id: change.doc.id,
										...change.doc.data()
									};
									logs[index] = updatedData;
								}
							}
						});

						if (onDataLoad) {
							onDataLoad(logs);
						}
					}
				},
				(error) => {
					console.error('실시간 데이터 감시 오류:', error);
				}
			);
		} catch (error) {
			console.error('실시간 데이터 감시 설정 실패:', error);
		}
	}

	// 기존 loadData 함수는 초기 로딩 페이지네이션에만 사용
	async function loadData() {
		if (abortController) {
			abortController.abort();
		}
		abortController = new AbortController();

		try {
			await getTotalCount();

			if (!collectionName) {
				console.error('컬렉션 이름이 없습니다.');
				return;
			}

			// 초기 데이터 로딩
			const q = createQuery();
			const snapshot = await getDocs(q);
			if (!snapshot.empty) {
				logs = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data()
				}));

				// lastDoc 업데이트
				lastDoc = snapshot.docs[snapshot.docs.length - 1];

				if (onDataLoad) {
					onDataLoad(logs);
				}
			}

			// 실시간 감시 시작
			watchData();
		} catch (error: any) {
			if (error.name !== 'AbortError') {
				console.error('데이터 로드 실패:', error);
				toast.showToast('데이터를 불러오는데 실패했습니다.', 'error', 1500, false);
			}
		}
	}

	// 페이지 변경 핸들러 수정
	const handlePageChange = async (event: CustomEvent<{ page: number }>) => {
		const newPage = event.detail.page;
		if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
			if (newPage < currentPage) {
				// 이전 페이지로 갈 때는 lastDoc 초기화
				lastDoc = null;
			}
			currentPage = newPage;
			await loadData();
		}
		scrollToElement('#sectionTitle');
	};

	$effect(() => {
		loadData();
	});

	$effect.root(() => {
		return () => {
			abortController?.abort();
			unsubscribe?.();
		};
	});

	// 페이지 변경 시에도 실시간 감시 재설정
	$effect(() => {
		if (currentPage) {
			watchData();
		}
	});

	// logs가 업데이트될 때마다 onDataLoad 호출
	$effect(() => {
		if (onDataLoad && logs.length > 0) {
			onDataLoad(logs);
		}
	});

	const networkUrl = {
		BEP20: 'https://bscscan.com/tx/',
		TRC20: 'https://tronscan.org/#/transaction/',
		Polygon: 'https://polygonscan.com/tx/'
	};
</script>

<div class="log-container" transition:slide={{ duration: 300, easing: cubicOut }}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="log-header {useHideList ? 'cursor-pointer' : ''}"
		onclick={() => {
			if (useHideList) {
				hideListState = !hideListState;
			}
		}}
	>
		{#if logTitle}
			<h3>
				{#if iconTitle}
					<span class="material-symbols-outlined">{iconTitle}</span>
				{/if}
				{logTitle}
				{#if useHideList}
					<span class="material-symbols-outlined">
						{hideListState ? 'expand_more' : 'expand_less'}
					</span>
				{/if}
			</h3>
		{/if}
		{#if messageStoreType}
			<!-- <MessageBadge storeTypes={[messageStoreType]} /> -->
		{/if}
	</div>
	{#if !logs}
		<LoaderBox />
	{:else}
		<div class="log-list" class:hide={hideListState}>
			{#each logs as log}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="log-item {actions && actions.length > 0 ? 'is-action' : ''} {status
						? `status-${status.condition?.(log)}`
						: ''} {useItemClick ? 'clickable' : ''}"
					onclick={() => useItemClick && onItemClick?.(log)}
				>
					<div class="log-lead">
						{#each leads as lead}
							<div
								class="column {typeof lead.className === 'function'
									? lead.className(log[lead.key])
									: lead.className} {lead.type}"
							>
								{#await formatValue(log[lead.key], lead, log)}
									<span class="loading">로딩중...</span>
								{:then formatted}
									{@html formatted}
								{:catch error}
									<span class="error">오류 발생</span>
								{/await}
							</div>
						{/each}
					</div>
					<div class="log-info">
						<div class="log-content">
							{#each columns as column}
								<div
									class="column {typeof column.className === 'function'
										? column.className(log[column.key])
										: column.className} {column.type}"
								>
									{#await formatValue(log[column.key], column, log)}
										<span class="loading">로딩중...</span>
									{:then formatted}
										{@html formatted}
									{:catch error}
										<span class="error">오류 발생</span>
									{/await}
								</div>
							{/each}
						</div>
					</div>
					{#if tradeInfo.length > 0}
						{#each tradeInfo as trade}
							<div class="log-trade">
								<div class="trade-title">
									{#if trade.key === 'finalPrice'}
										<img src={`/images/coin/${log.coinId}.png`} class="h-6 w-6" alt={log.coinId} />
										<span class="text-lg font-bold">{log.reqAmount.toLocaleString('ko-KR')}</span>
									{:else}
										{trade.key === 'walletAddress'
											? trade.key.toUpperCase().slice(-7)
											: trade.key.toUpperCase()}
									{/if}
									{#if trade.key === 'walletAddress'}
										<span class="rounded-md bg-gray-300 px-1 text-xs text-gray-800 opacity-50"
											>{log.network}</span
										>
									{/if}
								</div>
								<div
									class="trade-content {typeof trade.className === 'function'
										? trade.className(log[trade.key])
										: trade.className} {trade.type}"
								>
									{#await formatValue(log[trade.key], trade, log)}
										<span class="loading">로딩중...</span>
									{:then formatted}
										{#if formatted && typeof formatted === 'object' && 'element' in formatted}
											{#if formatted.element === 'input'}
												<input {...(formatted as any).props} />
											{:else}
												<svelte:element
													this={formatted.element as keyof HTMLElementTagNameMap}
													{...(formatted as any).props}
												>
													{@html (formatted as any).props.innerHTML}
												</svelte:element>
											{/if}
										{:else}
											{@html formatted}
										{/if}
									{:catch error}
										<span class="error">오류 발생</span>
									{/await}
								</div>
								<div class="trade-tail">
									{#if trade.key === 'walletAddress' && log[trade.key] !== ''}
										<button
											class="btn btn-copy default"
											onclick={() => {
												if (log[trade.key]) {
													if (log.userId === $user?.uid) {
														toast.showToast(`자신의 지갑주소입니다.`, 'info', 1500, false);
													} else {
														toast.showToast(
															'지갑주소가 복사되었습니다.<br />' + log[trade.key],
															'primary',
															1500,
															false
														);
													}
													navigator.clipboard.writeText(log[trade.key]);
												}
											}}
										>
											<span class="material-symbols-outlined">content_copy</span>
										</button>
									{/if}
									{#if trade.key === 'txid'}
										<a
											class="btn default {!log[trade.key] ? 'disabled-link' : ''}"
											href={networkUrl[log.network as keyof typeof networkUrl] + log[trade.key]}
											target="_blank"
											rel="noopener noreferrer"
										>
											<span class="material-symbols-outlined">link</span>
										</a>
									{/if}
								</div>
							</div>
						{/each}
					{/if}
					{#if tails.length > 0}
						<div class="log-tail">
							{#each tails as tail}
								{#await formatValue(log[tail.key], tail, log)}
									<span class="loading">로딩중...</span>
								{:then formatted}
									{#if formatted && typeof formatted === 'object' && 'element' in formatted}
										<div class="flex items-center gap-1">
											{#if formatted.element === 'input'}
												<input {...(formatted as any).props} />
											{:else}
												<svelte:element
													this={formatted.element as keyof HTMLElementTagNameMap}
													{...(formatted as any).props}
												>
													{@html (formatted as any).props.innerHTML}
												</svelte:element>
											{/if}
										</div>
									{:else}
										{@html formatted}
									{/if}
								{:catch error}
									<span class="error">오류 발생</span>
								{/await}
							{/each}
						</div>
					{/if}
					{#if actions && actions.length > 0}
						<div class="action-buttons">
							{#if configBtn && configBtn.length > 0}
								{#each configBtn as action}
									{#if action.condition && action.condition(log)}
										<button
											class="btn-config text-red-500 {action.type || 'default'}"
											onclick={() => handleAction(action, log, 'error')}
										>
											{#if action.icon}
												<span class="material-symbols-outlined">{action.icon}</span>
											{/if}
											{#if action.label}
												{action.label}
											{/if}
										</button>
									{/if}
								{/each}
							{/if}
							{#each actions as action}
								{#if !action.condition || action.condition(log)}
									<button
										class="btn btn-sm {action.type || 'primary'}"
										onclick={() => handleAction(action, log)}
										disabled={action.disabled?.(log) ||
											loadingStates.get(`${action.label}-${log.id}`)}
									>
										{#if loadingStates.get(`${action.label}-${log.id}`) && action.useLoader}
											<Loader type="dots" size={15} />
										{:else}
											{#if action.icon}
												<span class="material-symbols-outlined">{action.icon}</span>
											{/if}
											{#if action.label}
												{action.label}
											{/if}
										{/if}
									</button>
								{/if}
							{/each}
							{#if typeof tooltipText === 'function' && tooltipText(log)}
								<div class="tool-tip">{tooltipText(log)}</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	<div class="log-paging">
		<Paging {currentPage} {totalPages} onPageChange={handlePageChange} />
	</div>
</div>

<style>
	.hide {
		display: none;
	}
	.log-header {
		background-color: rgba(0, 0, 0, 0.2);
		position: relative;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-radius: 10px 10px 0 0;
		min-height: 15px;
		width: 100%;
	}
	.log-header h3 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		padding: 15px;
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.log-list.hide {
		display: none;
	}
	.log-item {
		background-color: rgba(0, 0, 0, 0.1);
		min-height: 80px;
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 20px 15px;
		flex-wrap: wrap;
		gap: 5px;
		margin-bottom: 3px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.45);
	}
	.log-info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 5px;
		flex-wrap: wrap;
		padding: 5px 0;
	}
	@media (max-width: 630px) {
		.log-info {
			flex-direction: column;
			align-items: flex-start;
		}
	}
	.log-lead {
		display: flex;
		gap: 5px;
		align-items: center;
		flex-wrap: wrap;
		/* border: solid #fff 1px; */
	}
	.log-content {
		flex: 1;
		display: flex;
		gap: 5px;
		align-items: center;
		flex-wrap: wrap;
		min-width: 150px;
		font-size: 0.95rem;
	}
	.log-trade {
		display: flex;
		align-items: center;
		gap: 5px;
		padding-top: 15px;
		margin-top: 10px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
	.trade-title {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.5);
		min-width: 120px;
		display: flex;
		align-items: center;
		gap: 5px;
		/* background-color: rgba(255, 255, 255, 0.1); */
	}
	.trade-content {
		flex: 1;
		font-size: 0.95rem;
		color: #eee;
		text-align: right;
		word-break: break-all;
		display: flex;
		justify-content: end;
		align-items: center;
		gap: 5px;
	}
	.trade-content textarea {
		width: 100%;
		max-width: 400px;
		height: 60px;
	}
	.trade-tail {
		/* width: 60px; */
		display: flex;
		justify-content: end;
		align-items: center;
	}
	.log-tail {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
		/* border: solid #fff 1px; */
	}
	.input-txid {
		font-size: 0.8rem;
		height: 2rem;
		width: 180px;
		border-radius: 5px;
		color: aqua;
		outline: 1px solid aqua;
	}
	a.disabled-link {
		pointer-events: none;
		opacity: 0.5;
		cursor: not-allowed;
		text-decoration: none;
	}
	.column {
		/* display: flex;
		align-items: center;
		justify-content: space-between; */
		/* gap: 5px; */
		/* border: 1px solid rgba(255, 255, 255, 0.5); */
	}
	.column.date {
		width: 95px;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
	}
	.column.user {
		width: 100px;
		max-width: 100px;
		min-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		background-color: rgba(255, 255, 255, 0.3);
		color: #fff;
		text-align: center;
		border-radius: 5px;
		font-size: 0.9rem;
	}
	.column.isIcon {
		display: flex;
		align-items: center;
		gap: 2.5px;
	}
	.column.status {
		flex: 0 0 80px;
		text-align: center;
	}
	.column.currency {
		font-weight: 700;
		font-size: 1.15rem;
	}
	.column.element {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.8rem;
		color: aqua;
	}
	.column.element .badge {
		border-radius: 5px;
		padding: 2px 5px;
		font-size: 0.7rem;
		background-color: rgba(255, 255, 255, 0.5);
	}
	.status-success {
		background-color: rgba(0, 255, 0, 0.3);
	}
	.status-pending {
		background-color: rgba(10, 10, 50, 0.5);
	}
	.status-error {
		background-color: rgba(255, 0, 0, 0.1);
	}
	.action-buttons {
		position: absolute;
		right: 5px;
		top: 5px;
		width: 120px;
		display: flex;
		justify-content: end;
		align-items: center;
		gap: 15px;
		overflow: visible;
		/* background-color: rgba(255, 255, 255, 0.1); */
	}
	@keyframes float {
		0% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-3px);
		}
		100% {
			transform: translateY(0px);
		}
	}
	.tool-tip {
		position: absolute;
		top: 35px;
		right: 0;
		background-color: rgba(0, 0, 0, 1);
		border-radius: 5px;
		padding: 5px;
		z-index: 100;
		font-size: 0.8rem;
		border: 1px solid rgba(255, 255, 255, 0.5);
		animation: float 3s ease-in-out infinite;
		white-space: nowrap;
	}
	.tool-tip::before {
		content: '';
		position: absolute;
		top: -7px;
		right: 10px;
		width: 0;
		height: 0;
		border-left: 7px solid transparent;
		border-right: 7px solid transparent;
		border-bottom: 7px solid rgba(255, 255, 255, 0.5);
	}
	.tool-tip::after {
		content: '';
		position: absolute;
		top: -6px;
		right: 11px;
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-bottom: 6px solid rgba(0, 0, 0, 1); /* 배경 색상 */
	}
	.btn-config {
		width: 25px;
		height: 25px;
		padding: 0;
		margin: 0;
	}
	.btn {
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		border: none;
		display: flex;
		align-items: center;
	}
	.btn.primary {
		background-color: #4a90e2;
		color: white;
	}
	.btn.success {
		background-color: #28a745;
		color: white;
	}
	.btn.secondary {
		background-color: #6c757d;
		color: white;
	}
	.btn.warning {
		background-color: #ffc107;
		color: black;
	}
	.btn.danger {
		background-color: #dc3545;
		color: white;
	}
	.btn.default {
		background-color: transparent;
		color: white;
	}
	.btn.outline {
		background-color: transparent;
		color: white;
		outline: 1px solid rgba(255, 255, 255, 0.5);
	}
	@keyframes blink {
		0% {
			opacity: 1;
			outline-color: rgba(255, 255, 0, 1);
			color: rgba(255, 255, 0, 1);
		}
		50% {
			opacity: 0.9;
			outline-color: rgba(255, 255, 0, 0.5);
			color: rgba(255, 255, 0, 0.5);
		}
		100% {
			opacity: 1;
			outline-color: rgba(255, 255, 0, 1);
			color: rgba(255, 255, 0, 1);
		}
	}
	.btn.blink {
		background-color: transparent;
		outline: 1px solid rgba(255, 255, 0, 1);
		color: rgba(255, 255, 0, 1);
		animation: blink 1.5s ease-in-out infinite;
	}
	.btn.dark {
		background-color: rgba(0, 0, 0, 0.3);
	}
	.btn:hover {
		opacity: 0.9;
	}
	.btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.btn.hide {
		display: none;
	}
	.btn.btn-copy {
		align-items: center;
		gap: 5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.loading {
		opacity: 0.6;
		font-size: 0.9em;
	}
	.error {
		color: #ff4444;
		font-size: 0.9em;
	}
	.log-item.clickable {
		cursor: pointer;
		transition: background-color 0.2s ease;
	}
	.log-item.clickable:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}
	.log-paging {
		background-color: rgba(0, 0, 0, 0.1);
		border-radius: 0 0 10px 10px;
		padding: 30px 0;
		display: block;
	}
</style>
