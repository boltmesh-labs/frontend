export const authKeys = {
  all: ['auth'],
  login: () => [...authKeys.all, 'login'],
  register: () => [...authKeys.all, 'register'],
  forgotPassword: () => [...authKeys.all, 'forgot-password'],
  resetPassword: () => [...authKeys.all, 'reset-password'],
  activateAccount: () => [...authKeys.all, 'activate-account'],
};
