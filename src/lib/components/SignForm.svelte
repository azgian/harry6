<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/toast';
	import Button from './Button.svelte';
	import ToggleSwitch from './ToggleSwitch.svelte';
	import { page } from '$app/stores';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { signIn, signUp } from '$lib/auth';

	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let isSignUp = $state(false);

	let verified = $derived($page.url.searchParams.get('verified') === 'true');

	const handleSignIn = async () => {
		if (email === '' || password === '') {
			toast.showToast(
				'로그인 정보가 올바르지 않습니다.<br />회원이 아니시라면 회원가입하세요.',
				'error',
				3000,
				false
			);
			return;
		}

		try {
			await signIn(email, password);
			toast.showToast('로그인되었습니다.', 'success', 3000, false);
			goto('/market');
		} catch (error: any) {
			console.error('로그인 에러:', error);
			let message = '';
			if (error.code === 'auth/invalid-credential') {
				message = '로그인 정보가 올바르지 않습니다.<br />회원이 아니시라면 회원가입하세요.';
			} else {
				message =
					'이메일에서 인증링크를 확인하세요.<br />수신메일이 없다면<br />스펨메일함도 확인해주세요.';
			}
			toast.showToast(message, 'error', 5000, false);
		}
	};

	const handleSignUp = async () => {
		if (email === '' || password === '' || passwordConfirm === '') {
			toast.showToast('회원가입 정보가 올바르지 않습니다.', 'error', 3000, false);
			return;
		}
		if (password !== passwordConfirm) {
			toast.showToast('비밀번호가 일치하지 않습니다.', 'error', 3000, false);
			return;
		}

		try {
			await signUp(email, password);
			toast.showToast(
				'회원가입이 완료되었습니다.<br />이메일로 보낸 인증 링크를 확인한 후<br />로그인해주세요.',
				'success',
				4500,
				false
			);
			isSignUp = false;
		} catch (error: any) {
			console.error('회원가입 에러:', error);
			let message = error.message || '회원가입에 실패했습니다.';
			if (error.code === 'auth/email-already-in-use') {
				message = '이미 사용 중인 이메일입니다.';
			} else if (error.code === 'auth/weak-password') {
				message = '비밀번호는 최소 6자 이상이어야 합니다.';
			}
			toast.showToast(message, 'error', 3000, false);
		}
	};

	const handleToggle = (value: boolean) => {
		isSignUp = value;
	};
</script>

<div class="form-container">
	<div class="toggle-switch-container">
		<ToggleSwitch checked={isSignUp} text="회원가입" onToggle={handleToggle} />
	</div>
	<form onsubmit={isSignUp ? handleSignUp : handleSignIn}>
		<div class="form-group">
			<label for="email">이메일</label>
			<input type="email" id="email" bind:value={email} required placeholder="email@example.com" />
		</div>

		<div class="form-group">
			<label for="password">비밀번호</label>
			<input type="password" id="password" bind:value={password} required />
		</div>
		{#if isSignUp}
			<div class="form-group" transition:slide={{ duration: 300, easing: cubicOut }}>
				<label for="passwordConfirm">비밀번호 확인</label>
				<input type="password" id="passwordConfirm" bind:value={passwordConfirm} required />
			</div>
		{/if}
		<div class="flex justify-end">
			<Button
				text={isSignUp ? '회원가입' : '로그인'}
				onClick={isSignUp ? handleSignUp : handleSignIn}
				className={isSignUp ? 'success' : 'primary'}
				style="margin-top: 1.5rem;"
				type="submit"
				icon={isSignUp ? 'person_add' : 'login'}
			/>
		</div>

		{#if verified}
			<div class="verification-message">
				가입인증 되었습니다.<br />이제 로그인 가능합니다.
			</div>
		{/if}
	</form>
</div>

<style>
	.toggle-switch-container {
		margin-bottom: 5px;
		display: flex;
		justify-content: end;
	}
	.form-container {
		width: 100%;
		max-width: 300px;
		margin: 0 auto;
	}

	.form-group {
		margin-bottom: 10px;
	}

	label {
		display: block;
		margin-bottom: 3px;
		text-align: left;
		font-size: 0.8rem;
	}

	input {
		width: 100%;
	}

	.verification-message {
		margin-top: 1rem;
		padding: 0.5rem;
		color: lime;
		text-align: center;
		font-size: 1rem;
		font-weight: 600;
	}
</style>
