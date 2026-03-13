type Toast = {
	id: number;
	message: string;
};

let toasts = $state<Toast[]>([]);
let nextId = 0;

export function addToast(message: string) {
	const id = nextId++;
	toasts.push({ id, message });
	setTimeout(() => removeToast(id), 5000);
}

export function removeToast(id: number) {
	const idx = toasts.findIndex((t) => t.id === id);
	if (idx !== -1) toasts.splice(idx, 1);
}

export function getToasts() {
	return toasts;
}
