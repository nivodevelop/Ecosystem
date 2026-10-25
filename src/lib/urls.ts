export const fileUrl = (rel: string | null | undefined) => (rel ? `/api/files/${rel}` : null);
