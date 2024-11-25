<script lang="ts">
	let {
		checked = false,
		bgColor = '#0f0',
		text = '',
		textColorOn = '#0f0',
		textColorOff = '#ccc',
		onToggle = (value: boolean) => {}
	} = $props();

	const handleChange = (e: Event) => {
		checked = (e.currentTarget as HTMLInputElement).checked;
		(onToggle as (value: boolean) => void)(checked);
	};
</script>

<label>
	<input type="checkbox" bind:checked onclick={handleChange} />
	<span class="slider" style:background-color={checked ? bgColor : '#ccc'}></span>
	{#if text}
		<span style:color={checked ? textColorOn : textColorOff}>{text}</span>
	{/if}
</label>

<style>
	label {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		background-color: #ccc;
		transition: 0.3s;
		border-radius: 34px;
		width: 50px;
		height: 24px;
	}

	.slider:before {
		position: absolute;
		content: '';
		height: 24px;
		width: 24px;
		left: 8px;
		bottom: 0px;
		background-color: white;
		transition: 0.3s;
		border-radius: 50%;
	}

	input:checked + .slider:before {
		transform: translateX(30px);
	}
</style>
