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
  return (
    <AnimatePresence mode="wait" initial={false}>
      {ready ? (
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
      ) : (
        <motion.div
          key={`fallback-${transitionKey}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: Math.min(duration, 0.16), ease: [0.22, 1, 0.36, 1] }}
          className={cn('h-full', className, fallbackClassName)}
        >
          {fallback}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
