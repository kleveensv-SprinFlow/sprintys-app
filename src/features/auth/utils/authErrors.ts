export const translateAuthError = (error: any): string => {
  const message = error?.message || '';
  
  if (message.includes('Invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (message.includes('User already registered')) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (message.includes('Password should be at least 6 characters')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  
  return 'Une erreur est survenue. Veuillez réessayer.';
};
