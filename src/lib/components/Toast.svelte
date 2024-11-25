<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { toast } from '$lib/toast';

	let {
		message = '',
		showToast = false,
		type = 'info',
		showButtons = true,
		onConfirm = null,
		onCancel = null
	} = $props();
</script>

{#if showToast}
	<div
		class="toast-container"
		in:fly={{ y: 50, duration: 300, easing: quintOut }}
		out:fly={{ y: 50, duration: 300, easing: quintOut }}
	>
		<div
			class="toast"
			class:success={type === 'success'}
			class:error={type === 'error'}
			class:warning={type === 'warning'}
			class:primary={type === 'primary'}
		>
			<p>{@html message}</p>
			{#if showButtons}
				<div class="buttons">
					{#if onCancel}
						<button class="cancel" onclick={toast.handleCancel}>취소</button>
					{/if}
					{#if onConfirm}
						<button class="accept" onclick={toast.handleConfirm}>확인</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	{#if showButtons}
		<div class="overlay"></div>
	{/if}
{/if}

<style>
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.3);
		z-index: 1010;
	}
	.toast-container {
		position: fixed;
		bottom: 150px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		z-index: 1020;
	}
	.toast {
		background-color: rgba(100, 100, 100, 0.9);
		color: #eee;
		padding: 15px;
		border-radius: 10px;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
		max-width: 320px;
		width: 100%;
	}
	.toast.primary {
		background-color: var(--primary-color);
	}
	.toast.success {
		background-color: rgba(6, 172, 6, 0.8);
	}
	.toast.error {
		background-color: rgba(235, 44, 11, 0.8);
	}
	.toast.warning {
		background-color: rgba(255, 193, 7, 0.8);
		color: black;
	}
	.toast p {
		text-align: center;
		margin: 0;
	}
	.buttons {
		display: flex;
		justify-content: space-around;
		margin-top: 10px;
	}
	button {
		margin-left: 10px;
		padding: 5px 10px;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		transition: background-color 0.3s;
		font-size: 1rem;
	}
	button.accept {
		background-color: var(--primary-color);
		color: var(--primary-text-color);
		border: 1px solid var(--primary-text-color);
	}
	button.cancel {
		background-color: #999;
		color: #333;
	}
	button:hover {
		opacity: 0.8;
	}
</style>
