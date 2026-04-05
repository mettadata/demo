<script lang="ts">
	import type { Label } from '$lib/stores/labels.js';
	import { LABEL_COLOR_CLASSES } from '$lib/stores/labels.js';

	const { label }: { label: Label } = $props();

	let colorClasses = $derived(LABEL_COLOR_CLASSES[label.color]);
</script>

<span
	class="text-xs font-medium px-1.5 py-0.5 rounded {colorClasses.bg} {colorClasses.text} {colorClasses.darkBg} {colorClasses.darkText}"
	aria-label="Label: {label.name}"
>
	{label.name}
</span>
