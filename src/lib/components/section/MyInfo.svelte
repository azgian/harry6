<script lang="ts">
	import { db } from '$lib/firebase';
	import { doc, updateDoc, Timestamp } from 'firebase/firestore';
	import { updateProfile, getAuth } from 'firebase/auth';
	import Button from '$lib/components/Button.svelte';
	import { toast } from '$lib/components/toast';
	import type { Wallet } from '$lib/types';
	import { user } from '$lib/auth';
	import { userWalletsStore } from '$lib/stores/userStore';

	let email = $state('');
	let name = $state('');
	let phone = $state('');
	let wallets = $state<Wallet[]>([]);

	const auth = getAuth();

	$effect(() => {
		if ($user) {
			email = $user.email ?? '';
			name = $user.displayName ?? '';
			phone = $user.phone ?? '';
			wallets = Array.isArray($user.wallets)
				? $user.wallets
				: $userWalletsStore.map((wallet) => ({
						address: wallet.address || '',
						network: wallet.network
					}));
		}
	});

	const setUserData = async () => {
		try {
			if (!$user?.uid) {
				toast.show('로그인이 필요합니다.', 'error', 3000);
				return;
			}

			// 1. Firestore 업데이트
			const userDocRef = doc(db, 'users', $user.uid);
			const userData = {
				email,
				displayName: name,
				phone,
				wallets,
				updatedAt: Timestamp.now()
			};

			// updateDoc 사용
			await updateDoc(userDocRef, userData);

			// 2. Auth Profile 업데이트
			if (name && auth.currentUser) {
				try {
					await updateProfile(auth.currentUser, {
						displayName: name
					});
				} catch (error) {
					console.error('Auth 프로필 업데이트 에러:', error);
				}
			}

			toast.show('회원정보가 등록되었습니다.', 'success', 3000);
		} catch (error) {
			console.error('Update error:', error);
			if (error instanceof Error) {
				toast.show(`업데이트 실패: ${error.message}`, 'error', 3000);
			} else {
				toast.show('업데이트 중 오류가 발생했습니다.', 'error', 3000);
			}
		}
	};
</script>

<h2><span class="material-symbols-outlined">person_edit</span> User's Information</h2>
<div class="office-container">
	<div class="office-card">
		<div class="office-list">
			<div class="list-title">Email</div>
			<div class="list-info">
				{email}
			</div>
		</div>
		<div class="office-list">
			<div class="list-title">
				Name<span class="required material-symbols-outlined">emergency</span>
			</div>
			<div class="list-info">
				<input type="text" bind:value={name} class="input" placeholder="user's name" />
			</div>
		</div>
		<div class="office-list">
			<div class="list-title">
				Phone<span class="required material-symbols-outlined">emergency</span>
			</div>
			<div class="list-info">
				<input type="tel" bind:value={phone} class="input" placeholder="phone number" />
			</div>
		</div>
		<div class="office-list flex_column">
			<div class="list-title">
				Wallets<span class="required material-symbols-outlined">emergency</span>
			</div>
			<div class="list-info">
				{#each wallets as wallet}
					<div class="wallet-list">
						<strong>{wallet.network}</strong>
						<textarea bind:value={wallet.address} class="input-wallet" placeholder="wallet address"
						></textarea>
					</div>
				{/each}
			</div>
		</div>
		<div class="office-list flex justify-end">
			<Button
				text="회원정보 등록"
				onClick={setUserData}
				style="width: 200px; margin-top:20px;"
				className="primary"
			/>
		</div>
	</div>
</div>

<style>
	h2 {
		background-color: rgba(0, 0, 0, 0.2);
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		padding: 15px;
		display: flex;
		align-items: center;
		gap: 5px;
		border-radius: 10px 10px 0 0;
	}
	.office-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.office-card {
		background-color: rgba(0, 0, 0, 0.1);
		padding: 15px 20px;
		border-radius: 0 0 10px 10px;
	}
	.office-list {
		width: 100%;
		display: flex;
		align-items: center;
		padding: 10px 0;
		border-top: 1px solid rgba(255, 255, 255, 0.25);
		border-bottom: 1px solid rgba(0, 0, 0, 0.25);
	}
	.office-list:first-child {
		border-top: none;
	}
	.office-list:last-child {
		border-bottom: none;
	}
	.flex_column {
		flex-direction: column;
		align-items: flex-start;
	}
	.list-title {
		min-width: 120px;
		text-align: center;
		position: relative;
	}
	.required {
		color: rgb(248, 79, 107);
		position: absolute;
		top: 0;
		right: 15px;
		font-size: 0.8rem;
	}
	.list-info {
		flex-grow: 1;
		word-break: break-all;
		overflow: hidden;
	}
	.flex_column .list-info {
		width: 100%;
	}
	.input {
		max-width: 200px;
		width: 100%;
	}
	.input-wallet {
		width: 100%;
	}
	.wallet-list {
		display: flex;
		width: 100%;
		padding: 5px 0;
		align-items: center;
	}
	.wallet-list strong {
		width: 150px;
		text-align: center;
		color: #69c;
	}
</style>
