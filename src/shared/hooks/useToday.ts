import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Today at 00:00, kept up to date: it changes at midnight and when the app comes back to the
 * foreground on another day (an app left open overnight must not keep showing yesterday as « Aujourd'hui »).
 */
export function useToday(): Date {
  const [today, setToday] = useState(startOfToday);

  useEffect(() => {
    const refresh = () =>
      setToday((prev) => {
        const now = startOfToday();
        return now.getTime() === prev.getTime() ? prev : now;
      });

    // Wake up just after the next midnight
    const scheduleMidnight = () => {
      const next = startOfToday();
      next.setDate(next.getDate() + 1);
      return setTimeout(() => {
        refresh();
        timer = scheduleMidnight();
      }, next.getTime() - Date.now() + 1000);
    };
    let timer = scheduleMidnight();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}
