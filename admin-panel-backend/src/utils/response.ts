export const successResponse = (data: any, message = 'Success') => ({
  success: true,
  message,
  data,
});

export const errorResponse = (message: string, details?: string) => ({
  success: false,
  message,
  ...(details && { error: details }),
});

