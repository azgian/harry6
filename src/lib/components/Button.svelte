<script lang="ts">
	import Loader from './loader/Loader.svelte';

	interface Props {
		text?: string;
		onClick?: (() => Promise<void>) | (() => void) | undefined;
		isLoading?: boolean;
		icon?: string;
		disabled?: boolean;
		className?: string;
		size?: string;
		style?: string;
		type?: 'button' | 'submit' | 'reset' | null;
	}

	let {
		text = '',
		onClick = () => Promise.resolve(),
		isLoading = false,
		icon = '',
		disabled = false,
		className = '',
		size = '1rem',
		style = '',
		type = 'button' as 'button' | 'submit' | 'reset' | null
	}: Props = $props();

	// 내부 로딩 상태 관리
	let internalLoading = $state(false);

	// 클릭 핸들러
	const handleClick = async () => {
		if (internalLoading || disabled) return;
		try {
			internalLoading = true;
			await onClick();
		} catch (error) {
			console.error('Button click error:', error);
		} finally {
			internalLoading = false;
		}
	};

	// 최종 로딩 상태 (외부 또는 내부 로딩)
	const _isLoading = $derived(isLoading || internalLoading);

	// 최종 비활성화 상태 (외부 비활성화 또는 로딩 중)
	const isDisabled = $derived(disabled || _isLoading);
</script>

<button
	onclick={handleClick}
	disabled={isDisabled}
	class={className}
	style={`font-size: ${size}; font-weight: bold; ${style}`}
	{type}
>
	{#if icon}
		<span class="material-symbols-outlined">{icon}</span>
	{/if}
	{text}
	{#if _isLoading}
		<Loader color="#fff" type="dots" size={20} />
	{/if}
</button>

<style>
	button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 0.5rem 1rem;
		border-radius: 10px;
		box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
		cursor: pointer;
		border: none;
		outline: none;
	}
	.primary {
		background-color: var(--primary-color);
		color: var(--primary-text-color);
	}
	.success {
		background-color: #2ed32e;
		color: #fff;
	}
	.error {
		background-color: var(--error-color);
		color: #fff;
	}
	.default {
		background-color: #999;
		color: #fff;
	}
	.outline {
		background-color: transparent;
		color: #ccc;
		border: 1px solid rgba(204, 204, 204, 0.5);
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	button:focus-visible {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
	}
</style>
