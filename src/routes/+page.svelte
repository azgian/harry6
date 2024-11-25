<script lang="ts">
	import SignForm from '$lib/components/SignForm.svelte';
	// import { goto } from '$app/navigation';
	// import { user } from '$lib/auth';
	// if (!$user) {
	// 	goto('/sign');
	// }
</script>

<div class="container">
	<div class="logo-container">
		<img src="images/logoN.png" alt="FYNX Logo" class="logo" />
	</div>
	<div class="main-image"></div>
	<SignForm />
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		margin: 0 auto;
	}
	.logo-container {
		margin-top: 30px;
	}
	.logo {
		width: 100px;
	}
	.main-image {
		width: 500px;
		max-width: 100%;
		height: 150px;
		min-height: 150px;
		/* margin: 50px auto; */
	}
</style>
