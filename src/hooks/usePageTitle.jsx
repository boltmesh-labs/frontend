import { useEffect } from 'react';

export const usePageTitle = (title, description = '') => {
  useEffect(() => {
    document.title = title;

    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }
  }, [title, description]);
};
