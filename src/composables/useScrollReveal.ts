import { onMounted, onUnmounted } from 'vue';

export function useScrollReveal(selector = '.reveal-on-scroll') {
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Unobserve once revealed for performance
            observer?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => observer?.observe(el));
  });

  onUnmounted(() => {
    observer?.disconnect();
  });
}
