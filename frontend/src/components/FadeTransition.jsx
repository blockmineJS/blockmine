import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function FadeTransition({
  transitionKey,
  children,
  className,
  duration = 0.2,
  ready = true,
  fallback = null,
  fallbackClassName,
}) {
  if (!ready) {
    return (
      <div className={cn('h-full', className, fallbackClassName)}>
        {fallback}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`content-${transitionKey}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
        className={cn('h-full', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
