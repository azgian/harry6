<script lang="ts">
	import { TokenManager, type AccessToken } from '$lib/tokenAuth';
	import { Timestamp } from 'firebase/firestore';
	import { toast } from '$lib/components/toast';
	import { db } from '$lib/firebase';
	import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
	import { formatDate } from '$lib';

	let hours: number = $state(1);
	let generatedUrl: string = $state('');
	let expiryDate: Date | null = $state(null);
	let validTokens = $state<AccessToken[]>([]);

	const now = Timestamp.now();

	async function handleGenerateUrl() {
		try {
			const token = await TokenManager.createToken(hours);
			generatedUrl = `${window.location.origin}?accessToken=${token}`;
			expiryDate = new Date(now.seconds + hours * 3600);
			validTokens = await loadValidTokens();
		} catch (error) {
			console.error('URL 생성 실패:', error);
			toast.show('URL 생성에 실패했습니다.', 'error', 3000);
		}
	}

	// 유효한 토큰 목록 로드
	async function loadValidTokens() {
		const q = query(
			collection(db, 'accessTokens'),
			where('expiry', '>', now),
			orderBy('expiry', 'desc')
		);

		const snapshot = await getDocs(q);
		return snapshot.docs
			.map((doc) => ({
				...doc.data()
			}))
			.filter((token) => token.isValid === true) as AccessToken[];
	}

	const copyToClipboard = (text: string) => {
		toast.show('복사되었습니다.<br />' + text, 'success', 1500);
		navigator.clipboard.writeText(text);
	};

	$effect(() => {
		if (hours < 1) {
			toast.show('최소 1시간 이상 설정해야 합니다.', 'error', 3000);
			hours = 1;
		}
	});
</script>

<div class="container">
	<strong class="title">URL 생성</strong>
	<div class="url-generator">
		<!-- 입력 폼 영역 -->
		<div class="input-group">
			<button onclick={() => (hours -= 1)}>-1시간</button>
			<input type="number" bind:value={hours} min="1" placeholder="시간 단위" />
			<button onclick={() => (hours += 1)}>+1시간</button>
		</div>
		<button
			class="generate-btn"
			onclick={() =>
				toast.show(hours + '시간 만료 URL을<br />생성하시겠습니까?', 'primary', null, async () => {
					try {
						await handleGenerateUrl();
					} catch (error) {
						toast.show('URL 생성 중 오류가 발생했습니다.', 'error', 3000);
					}
				})}>URL 생성</button
		>
	</div>
	<div class="url-list">
		<strong class="title">유효 URL 목록</strong>
		{#key validTokens}
			{#await loadValidTokens()}
				<div class="loading">로딩 중...</div>
			{:then accessUrls}
				<div class="token-list">
					{#each accessUrls as accessUrl}
						<div class="token-item">
							<div class="token-info">
								<div class="token-url">{window.location.origin}?accessToken={accessUrl.token}</div>
								<div class="token-expiry">
									만료시간: {formatDate(accessUrl.expiry, true)}
								</div>
							</div>
							<button
								class="copy-btn"
								onclick={() =>
									copyToClipboard(`${window.location.origin}?accessToken=${accessUrl.token}`)}
							>
								<span class="material-symbols-outlined">content_copy</span>
							</button>
						</div>
					{/each}
				</div>
			{:catch error}
				<div class="error">데이터 로딩 실패: {error.message}</div>
			{/await}
		{/key}
	</div>
</div>

<style>
	.container {
		padding: 10px;
		background-color: rgba(0, 0, 0, 0.1);
		border-radius: 10px;
	}
	.title {
		padding: 10px;
	}

	.url-generator {
		padding: 10px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 20px;
	}

	.input-group {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	input {
		width: 60px;
		padding: 5px;
		border-radius: 5px;
	}

	button {
		padding: 5px 10px;
		border-radius: 4px;
		border: 1px solid #ddd;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.generate-btn {
		background: #007bff;
		color: white;
		border: none;
		font-size: 1.2rem;
	}
	.copy-btn {
		background: none;
		border: none;
		cursor: pointer;
	}
	.token-list {
		margin-top: 10px;
	}

	.token-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 5px;
		background: rgba(0, 0, 0, 0.1);
		color: #ddd;
	}

	.token-info {
		flex: 1;
	}

	.token-url {
		font-weight: 500;
		margin-bottom: 0.5rem;
		word-break: break-all;
		color: #007bff;
	}

	.token-expiry {
		font-size: 0.9rem;
		color: #ddd;
	}

	.loading {
		padding: 1rem;
		text-align: center;
		color: #ddd;
	}

	.error {
		padding: 1rem;
		color: #dc3545;
		background: rgba(255, 0, 0, 0.1);
		border-radius: 4px;
	}
</style>
