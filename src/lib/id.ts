const ALPHANUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

export const createId = (prefix: string) => {
  const random = Array.from({ length: 8 }, () => ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]).join('');
  return prefix + '-' + random;
};
